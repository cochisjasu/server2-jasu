const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const cryptoRandomString = require('crypto-random-string');
const {logError, redis, pubsub, destroyCache, baseConfig, resolve_i18n, googleSheets, DriveImageToURL} = require('./core');
const model = require('../models/product');
const {FruitCategory, PresentationCategory} = require('./category');
const { logging } = require("googleapis/build/src/apis/logging");

/**
 * Clase que administra las frutas registradas
 *
 * @class
 */
class Fruit {
    /**
     * Objeto con la definición de campos dependientes del lenguaje seleccionado
     * 
     * @type {Object}
     */
    static i18n_fields = {
        'name': 'name',
        'description' : 'description',
        'category' : FruitCategory,
    };

    /**
     * Busca y devuelve una fruta por su ID
     * 
     * @param {String} id ID de la fruta
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns
     */
    static getById = async(id, locale) => {
        try {
            const u = `fruit:id=${id}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Fruit.scope('default').findOne({
                where: {id}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'F1GI');
        }
    };

    static getByName = async(name, locale) => {
        try {
            const u = `fruit:name=${name}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Fruit.scope('default').findOne({
                where: {[locale === 'es' ? 'nameEs' : 'nameEn']:name}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'F2GN');
        }
    };

    /**
     * Procesa un filtro de SQL en formato string y lo transforma en un query Sequelize
     *
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns
     */
    static processFilter(filter, locale) {
        let where = {};
        for(let x in filter) switch(x) {
            case 'query':
                where = {
                    ...where,
                    [Op.and]: filter.query.trim().split(' ').map(query => ({
                        [Op.or]: [
                            {
                                [locale === 'es' ? 'nameEs' : 'nameEn']: {
                                    [Op.like]: `%${query}%`
                                }
                            },
                        ]
                    }))
                };
                break;
            case 'id':
                where.id = {[Op.in]: filter.id};
                break;
            case 'category':
                where.categoryId = {[Op.in]: filter.category}
                break;
        }
        return where;
    }

    /**
     * Cuenta cuantos registros hay en total dependiendo del filtro utilizado
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @returns
     */
    static count = async(filter) => {
        try {
            if(!filter) filter = {};
            const u = `fruits:count:filter=${JSON.stringify(filter)}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Fruit.count({
                where: this.processFilter(filter)
            });
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'F3C');
        }
    };

    /**
     * Devuelve la lista de registros encontrados dependiendo de los filtros y la paginación deseada
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {Object} options Opciones de paginación
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */ 
    static list = async(filter, options, locale) => {
        try {
            if(!filter) filter = {};
            if(!options) options = {};
            const u = `fruits:filter=${JSON.stringify(filter)}:options=${JSON.stringify(options)}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            if(options.ord in this.i18n_fields) options.ord = `${options.ord}${locale === 'es' ? 'Es' : 'En'}`;
            const where = this.processFilter(filter, locale),
                order = [[options.ord ? options.ord : (locale === 'es' ? 'nameEs' : 'nameEn') , options.asc ? 'ASC' : 'DESC']],
                limit = options.num || baseConfig.defaultNum,
                offset = (options.pag || 0) * limit;
            let data = await model.Fruit.scope('default').findAll({
                where, limit, offset, order
            }).map(x => resolve_i18n(x.get({plain: true}), this.i18n_fields, locale));
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'F4L');
        }
    };

    /**
     * Crea y devuelve un nuevo registro
     * 
     * @param {Object} input Datos de la nueva entrada
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */
    static create = async(input, locale) => {
        try {
            if(!input.id) input.id = cryptoRandomString({type: 'url-safe', length: 10});
            const prev = await this.getById(input.id, locale);
            if(prev) throw new Error(`Ya existe una fruta con el ID ${input.id}, use otro ID`);
            const category = await FruitCategory.getById(input.category);
            if(!category) throw new Error(`No existe la categoría de fruta con el ID ${input.category}, favor de verificar`);
            input.categoryId = input.category;
            await model.Fruit.create(input);
            await destroyCache(`fruit:id=${input.id}*`);
            if(input.nameEs) await destroyCache(`fruit:name=${input.nameEs}*`)
            if(input.nameEn) await destroyCache(`fruit:name=${input.nameEn}*`)
            await destroyCache(`fruits*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`createdFruit`, {
                createdFruit: data
            });
            return data;
        } catch(error) {
            logError(error, 'F5CR');
        }
    };

    static update = async(input, locale) => {
        try {
            if(!input.id) throw new Error("Se requiere un ID de fruta para continuar")
            const prev = await this.getById(input.id, locale);
            if(!prev) throw new Error(`No existe una fruta con el ID ${input.id}, verifique`);
            if (input.category) {
                const category = await FruitCategory.getById(input.category, locale);
                if(!category) throw new Error(`No existe la categoría de fruta con el ID ${input.category}, favor de verificar`);
                input.categoryId = input.category;
            }
            await model.Fruit.update(input, {where: {id: input.id}});
            await destroyCache(`fruit:id=${input.id}*`);
            if(input.nameEs && input.nameEs != prev.nameEs) await destroyCache(`fruit:name=${input.nameEs}*`)
            await destroyCache(`fruit:name=${prev.nameEs}*`)
            if(input.nameEn && input.nameEn != prev.nameEn) await destroyCache(`fruit:name=${input.nameEn}*`)
            await destroyCache(`fruit:name=${prev.nameEn}*`)
            await destroyCache(`fruits*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`updatedFruit:id=${input.id}`, {
                updatedFruit: data
            });
            return data;
        } catch(error) {
            logError(error, 'F6U');
        }
    };

    /**
     * Crea y devuelve un nuevo registro
     * 
     * @param {Object} id Datos de la nueva entrada
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */
    static delete = async(id, locale) => {
        try {
            if(!id) throw new Error("Se requiere un ID fruta para continuar")
            const prev = await this.getById(id, locale);
            if(!prev) throw new Error(`No existe una fruta con el ID ${id}, verifique`);
            await model.Fruit.destroy({where: {id}});
            await destroyCache(`fruit:id=${id}*`);
            await destroyCache(`fruit:name=${prev.nameEs}*`)
            await destroyCache(`fruit:name=${prev.nameEn}*`)
            await destroyCache(`fruits*`);
            const data = await this.getById(id, locale);
            await pubsub.publish(`deletedFruit:id=${id}`, {
                deletedFruit: data
            });
            return data;
        } catch(error) {
            logError(error, 'F7D');
        }
    };

    static sync = async() => {
        /**
         * Columnas de Excel donde se encuentra la información
         * 
         * @type {Object}
         */
        const ranges = {
            id: "A",
            nameEs: "M",
            nameEn: "C",
            picture: "H",
            descriptionEs: "P",
            descriptionEn: "F",
            category: "I",
            varietyEs: "N",
            varietyEn: "D",
        };

        try {
            const googleSheetsInstance = await googleSheets();
            const response = await googleSheetsInstance.spreadsheets.values.batchGet({
                spreadsheetId: "1KSEwxP6rmBvGi83_D38DaGEgoiK0ldJh26Mcrp16oMM",
                ranges: Object.keys(ranges).map(key => `Fruta!${ranges[key]}2:${ranges[key]}`),
                majorDimension: 'COLUMNS',
                valueRenderOption: "UNFORMATTED_VALUE",
                dateTimeRenderOption: "SERIAL_NUMBER",
            });
            const data = response.data.valueRanges.map(result => (result?.values?.length ? result.values[0] : []));
            const current = {}
            const responseList = await this.list({}, {num: 1000}, "en")
            responseList.forEach(item => {
                current[item.name] = "delete"
            });
            for (let index = 0; index < data[0].length; index++) {
                const input = {
                    id: data[0][index],
                    nameEs: data[1].length > index ? data[1][index] : '',
                    nameEn: data[2].length > index ? data[2][index] : '',
                    picture: data[3].length > index ? data[3][index] : '',
                    descriptionEs: data[4].length > index ? data[4][index] : '',
                    descriptionEn: data[5].length > index ? data[5][index] : '',
                    category: data[6].length > index ? data[6][index] : '',
                    varietyEs: data[7].length > index ? data[7][index] : null,
                    varietyEn: data[8].length > index ? data[8][index] : null,
                }
                //Checar si tiene variedad
                input.picture = DriveImageToURL(input.picture)
                if(!input.nameEn) continue
                if(input.varietyEs || input.varietyEn){
                    delete input.descriptionEn
                    delete input.descriptionEs
                    delete input.picture
                }
                delete input.varietyEs
                delete input.varietyEn
                const _category = await FruitCategory.getByName(input.category, 'en')
                input.category = _category.id
                //Checar si existe
                if(input.nameEn in current) {
                    if (current[input.nameEn] == 'delete') {
                        current[input.nameEn] = "updated"
                        await this.update(input, 'en')
                    }
                }
                else{
                    current[input.nameEn] = "new"
                    await this.create(input, 'en')
                }
            }
            const result = {
                added: 0,
                updated: 0,
                deleted: 0
            }
            for (const [key, value] of Object.entries(current)) {
                switch (value) {
                    case 'new':
                        result.added++;
                        break;
                    case 'delete':
                        const _prev = await this.getByName(key, 'en')
                        await this.delete(_prev.id, 'en')
                        result.deleted++;
                        break;
                    case 'updated':
                        result.updated++;
                        break;
                    default:
                        break;
                }
            }
            return result
        } catch (error) {
            logError(error, 'F8S')
        }
    }
}

/**
 * Clase que administra las variedades da cada una de las frutas
 *
 * @class
 */
class FruitVariety {
    /**
     * Objeto con la definición de campos dependientes del lenguaje seleccionado
     * 
     * @type {Object}
     */
    static i18n_fields = {
        'name': 'name',
        'fullName' : 'fullName',
        'description' : 'description',
        'fruit' : Fruit,
    };

    static custom_fields = {
        'fullName' : "if(strcmp(fruit.name_-0-, FruitVariety.name_-0-) = 0, fruit.name_-0-, concat(fruit.name_-0-, ' ', FruitVariety.name_-0-)) as fullName-1-",
    }

    /**
     * Busca y devuelve una variedad de fruta por su ID
     * 
     * @param {String} id ID de la variedad de fruta
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns
     */
    static getById = async(id, locale) => {
        try {
            const u = `fruitVariety:id=${id}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.FruitVariety.scope('sync').findOne({
                where: {id}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'FV1GI');
        }
    };

    static getByName = async(name, fruitId, locale) => {
        try {
            const u = `fruitVariety:name=${name}:fruit=${fruitId}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.FruitVariety.scope('sync').findOne({
                where: {[locale === 'es' ? 'nameEs' : 'nameEn']:name, fruitId}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'FV2GN');
        }
    };

    /**
     * Procesa un filtro de SQL en formato string y lo transforma en un query Sequelize
     *
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns
     */
    static processFilter(filter, locale) {
        let where = {};
        for(let x in filter) switch(x) {
            case 'query':
                where = {
                    ...where,
                    [Op.and]: filter.query.trim().split(' ').map(query => ({
                        [Op.or]: [
                            {
                                [locale === 'es' ? 'nameEs' : 'nameEn']: {
                                    [Op.like]: `%${query}%`
                                }
                            },
                        ]
                    }))
                };
                break;
            case 'id':
                where.id = {[Op.in]: filter.id};
                break;
            case 'fruit':
                where.fruitId = {[Op.in]: filter.fruit}
                break;
            case 'category':
                where['$fruit.category_id$'] = {[Op.in]: filter.category}
                break;
        }
        return where;
    }

    /**
     * Cuenta cuantos registros hay en total dependiendo del filtro utilizado
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @returns
     */
    static count = async(filter) => {
        try {
            if(!filter) filter = {};
            const u = `fruitVarieties:count:filter=${JSON.stringify(filter)}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.FruitVariety.scope('count').count({
                where: this.processFilter(filter),
                distinct: true,
                col: 'FruitVariety.id'
                
            });
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'FV3C');
        }
    };

    /**
     * Devuelve la lista de registros encontrados dependiendo de los filtros y la paginación deseada
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {Object} options Opciones de paginación
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */ 
    static list = async(filter, options, locale) => {
        try {
            if(!filter) filter = {}
            if(!options) options = {};
            const u = `fruitVarieties:filter=${JSON.stringify(filter)}:options=${JSON.stringify(options)}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);

            //Order
            let order = null;
            if(!options?.ord?.length) options.ord = 'fullName';
            if(options.ord in this.custom_fields){
                if(options?.ord in this.i18n_fields) order = [[Sequelize.literal(`${options.ord}${locale === 'es' ? 'Es' : 'En'} ${options.asc ? 'ASC' : 'DESC'}`)]];
                else order = [[Sequelize.literal(`${options.ord} ${options.asc ? 'ASC' : 'DESC'}`)]];
            }
            else{
                if(options?.ord in this.i18n_fields) order = [[`${options.ord}${locale === 'es' ? 'Es' : 'En'}`, options.asc ? 'ASC' : 'DESC']]
                order = [[options.ord, options.asc ? 'ASC' : 'DESC']]
            }

            //Custom fields
            const attributesInclude = Object.keys(this.custom_fields).map(key => (
                (key in this.i18n_fields) ? 
                Sequelize.literal(this.custom_fields[key].replace(/-0-/g, locale).replace(/-1-/g, locale === 'es' ? 'Es' : 'En')) : 
                Sequelize.literal(this.custom_fields[key])
            ));

            const where = this.processFilter(filter, locale),
                limit = options.num || baseConfig.defaultNum,
                offset = (options.pag || 0) * limit;
            let data = await model.FruitVariety.scope(options?.sync ? 'sync' : 'default').findAll({
                attributes: {include: attributesInclude},
                where, limit, offset, order
            }).map(x => resolve_i18n(x.get({plain: true}), this.i18n_fields, locale));
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'FV4L');
        }
    };

    /**
     * Crea y devuelve un nuevo registro
     * 
     * @param {Object} input Datos de la nueva entrada
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */
    static create = async(input, locale) => {
        try {
            if(!input.id) input.id = cryptoRandomString({type: 'url-safe', length: 10});
            const prev = await this.getById(input.id, locale);
            if(prev) throw new Error(`Ya existe una variedad de fruta con el ID ${input.id}, use otro ID`);
            const _fruit = await Fruit.getById(input.fruit);
            if(!_fruit) throw new Error(`No existe la fruta con el ID ${input.fruit}, favor de verificar`);
            input.fruitId = input.fruit;
            await model.FruitVariety.create(input);
            await destroyCache(`fruitVariety:id=${input.id}*`);
            await destroyCache(`fruitVarieties*`);
            const data = await this.getById(input.id, locale);
            destroyCache(`fruitVariety:name=${data.nameEs}*`)
            destroyCache(`fruitVariety:name=${data.nameEn}*`)
            await pubsub.publish(`createdFruitVariety`, {
                createdFruitVariety: data
            });
            return data;
        } catch(error) {
            logError(error, 'FV5C');
        }
    };

    static update = async(input, locale) => {
        try {
            if(!input.id) throw new Error("Se requiere un ID de variedad de fruta para continuar")
            const prev = await this.getById(input.id, locale);
            if(!prev) throw new Error(`No existe una variedad de fruta con el ID ${input.id}, verifique`);
            if (input.fruit) {
                const _fruit = await Fruit.getById(input.fruit, locale);
                if(!_fruit) throw new Error(`No existe la fruta con el ID ${input.fruit}, favor de verificar`);
                input.fruitId = input.fruit;
            }
            await model.FruitVariety.update(input, {where: {id: input.id}});
            await destroyCache(`fruitVariety:id=${input.id}*`);
            if(input.nameEs && input.nameEs != prev.nameEs) await destroyCache(`fruitVariety:name=${input.nameEs}*`)
            await destroyCache(`fruitVariety:name=${prev.nameEs}*`)
            if(input.nameEn && input.nameEn != prev.nameEn) await destroyCache(`fruitVariety:name=${input.nameEn}*`)
            await destroyCache(`fruitVariety:name=${prev.nameEn}*`)
            await destroyCache(`fruitVarieties*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`updatedFruitVariety:id=${input.id}`, {
                updatedFruitVariety: data
            });
            return data;
        } catch(error) {
            logError(error, 'FV6U');
        }
    };

    /**
     * Crea y devuelve un nuevo registro
     * 
     * @param {Object} id Datos de la nueva entrada
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */
    static delete = async(id, locale) => {
        try {
            if(!id) throw new Error("Se requiere un ID de variedad de fruta para continuar")
            const prev = await this.getById(id, locale);
            if(!prev) throw new Error(`No existe una varieded de fruta con el ID ${id}, verifique`);
            await model.FruitVariety.destroy({where: {id}});
            await destroyCache(`fruitVariety:id=${id}*`);
            await destroyCache(`fruitVariety:name=${prev.nameEs}*`)
            await destroyCache(`fruitVariety:name=${prev.nameEn}*`)
            await destroyCache(`fruitVarieties*`);
            const data = await this.getById(id, locale);
            await pubsub.publish(`deletedFruitVariety:id=${id}`, {
                deletedFruitVariety: data
            });
            return data;
        } catch(error) {
            logError(error, 'F6D');
        }
    };

    static sync = async() => {
        /**
         * Columnas de Excel donde se encuentra la información
         * 
         * @type {Object}
         */
        const ranges = {
            id: "A",
            nameEs: "N",
            nameEn: "D",
            picture: "H",
            descriptionEs: "P",
            descriptionEn: "F",
            fruit: "C",
        };

        try {
            const googleSheetsInstance = await googleSheets();
            const response = await googleSheetsInstance.spreadsheets.values.batchGet({
                spreadsheetId: "1KSEwxP6rmBvGi83_D38DaGEgoiK0ldJh26Mcrp16oMM",
                ranges: Object.keys(ranges).map(key => `Fruta!${ranges[key]}2:${ranges[key]}`),
                majorDimension: 'COLUMNS',
                valueRenderOption: "UNFORMATTED_VALUE",
                dateTimeRenderOption: "SERIAL_NUMBER",
            });
            const data = response.data.valueRanges.map(result => (result?.values?.length ? result.values[0] : []));
            const current = {}
            const responseList = await this.list({}, {num: 1000, sync: true}, "en")
            responseList.forEach(item => {
                if(item.id.length > 4) return
                current[item.id] = "delete"
            });
            for (let index = 0; index < data[0].length; index++) {
                const input = {
                    id: data[0][index],
                    nameEs: data[1].length > index ? data[1][index] : '',
                    nameEn: data[2].length > index ? data[2][index] : '',
                    picture: data[3].length > index ? data[3][index] : '',
                    descriptionEs: data[4].length > index ? data[4][index] : '',
                    descriptionEn: data[5].length > index ? data[5][index] : '',
                    fruit: data[6].length > index ? data[6][index] : '',
                }
                if(!input.fruit) continue
                const _fruit = await Fruit.getByName(input.fruit, 'en')
                input.fruit = _fruit.id
                input.picture = DriveImageToURL(input.picture)
                if(!input.nameEn && !input.nameEs){
                    input.nameEn = _fruit.nameEn
                    input.nameEs = _fruit.nameEs
                    delete input.descriptionEn
                    delete input.descriptionEs
                    delete input.picture
                }
                //Checar si existe
                if(input.id in current) {
                    current[input.id] = "updated"
                    await this.update(input, 'en')
                }
                else{
                    const _variety = await this.getByName(input.nameEn, input.fruit, 'en');
                    if (_variety) await this.delete(_variety.id, 'en')
                    current[input.id] = "new"
                    await this.create(input, 'en')
                }
            }
            const result = {
                added: 0,
                updated: 0,
                deleted: 0
            }
            for (const [key, value] of Object.entries(current)) {
                switch (value) {
                    case 'new':
                        result.added++;
                        break;
                    case 'delete':
                        await this.delete(key, 'en')
                        result.deleted++;
                        break;
                    case 'updated':
                        result.updated++;
                        break;
                    default:
                        break;
                }
            }
            return result
        } catch (error) {
            logError(error, 'FV7S')
        }
    }
}

/**
 * Clase que administra las presentaciones de una fruta
 *
 * @class
 */
class Presentation {
    /**
     * Objeto con la definición de campos dependientes del lenguaje seleccionado
     * 
     * @type {Object}
     */
    static i18n_fields = {
        'name': 'name',
        'description' : 'description',
        'category' : PresentationCategory,
    };

    /**
     * Busca y devuelve una presentación por su ID
     * 
     * @param {String} id ID de la presentación
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns {Object}
     */
    static getById = async(id, locale) => {
        try {
            const u = `presentation:id=${id}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Presentation.findOne({
                where: {id}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'P1GI');
        }
    };

    static getByName = async(name, locale) => {
        try {
            const u = `presentation:name=${name}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Presentation.findOne({
                where: {[locale === 'es' ? 'nameEs' : 'nameEn']:name}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'P2GN');
        }
    };

    /**
     * Procesa un filtro de SQL en formato string y lo transforma en un query Sequelize
     *
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns {Object}
     */
    static processFilter(filter, locale) {
        let where = {};
        for(let x in filter) switch(x) {
            case 'query':
                where = {
                    ...where,
                    [Op.and]: filter.query.trim().split(' ').map(query => ({
                        [Op.or]: [
                            {
                                [locale === 'es' ? 'nameEs' : 'nameEn']: {
                                    [Op.like]: `%${query}%`
                                }
                            },
                        ]
                    }))
                };
                break;
            case 'id':
                where.id = {[Op.in]: filter.id};
                break;
            case 'category':
                where.categoryId = {[Op.in]: filter.category}
                break;
        }
        return where;
    }

    /**
     * Cuenta cuantos registros hay en total dependiendo del filtro utilizado
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @returns {Int}
     */
    static count = async(filter) => {
        try {
            if(!filter) filter = {};
            const u = `presentations:count:filter=${JSON.stringify(filter)}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Presentation.count({
                where: this.processFilter(filter)
            });
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'P3C');
        }
    };

    /**
     * Devuelve la lista de registros encontrados dependiendo de los filtros y la paginación deseada
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {Object} options Opciones de paginación
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns {Array}
     */
    static list = async(filter, options, locale) => {
        try {
            if(!filter) filter = {};
            if(!options) options = {};
            const u = `presentations:filter=${JSON.stringify(filter)}:options=${JSON.stringify(options)}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            if(options.ord in this.i18n_fields) options.ord = `${options.ord}${locale === 'es' ? 'Es' : 'En'}`;
            const where = this.processFilter(filter, locale),
                order = [[options.ord ? options.ord : (locale === 'es' ? 'nameEs' : 'nameEn') , options.asc ? 'ASC' : 'DESC']],
                limit = options.num || baseConfig.defaultNum,
                offset = (options.pag || 0) * limit;
            let data = await model.Presentation.scope('default').findAll({
                where, limit, offset, order
            }).map(x => resolve_i18n(x.get({plain: true}), this.i18n_fields, locale));
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'P4L');
        }
    };

    /**
     * Crea y devuelve un nuevo registro
     * 
     * @param {Object} input Datos de la nueva entrada
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns {Object}
     */
    static create = async(input, locale) => {
        try {
            if(!input.id) input.id = cryptoRandomString({type: 'url-safe', length: 10});
            const prev = await this.getById(input.id, locale);
            if(prev) throw new Error(`Ya existe una presentación con el ID ${input.id}, use otro ID`);
            const category = await PresentationCategory.getById(input.category, locale);
            if(!category) throw new Error(`No existe la categoría de presentación con el ID ${input.category}, favor de verificar`);
            input.categoryId = input.category;
            await model.Presentation.create(input);
            await destroyCache(`presentation:id=${input.id}*`);
            if(input.nameEs) await destroyCache(`presentation:name=${input.nameEs}*`)
            if(input.nameEn) await destroyCache(`presentation:name=${input.nameEn}*`)
            await destroyCache(`presentation*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`createdPresentation`, {
                createdPresentation: data
            });
            return data;
        } catch(error) {
            logError(error, 'P5CR');
        }
    };

    static update = async(input, locale) => {
        try {
            if(!input.id) throw new Error("Se requiere un ID de presentación para continuar")
            const prev = await this.getById(input.id, locale);
            if(!prev) throw new Error(`No existe una presentación con el ID ${input.id}, verifique`);
            if (input.category) {
                const category = await PresentationCategory.getById(input.category);
                if(!category) throw new Error(`No existe la categoría de presentación con el ID ${input.category}, favor de verificar`);
                input.categoryId = input.category;
            }
            await model.Presentation.update(input, {where: {id: input.id}});
            await destroyCache(`presentation:id=${input.id}*`);
            if(input.nameEs && input.nameEs != prev.nameEs) await destroyCache(`presentation:name=${input.nameEs}*`)
            await destroyCache(`presentation:name=${prev.nameEs}*`)
            if(input.nameEn && input.nameEn != prev.nameEn) await destroyCache(`presentation:name=${input.nameEn}*`)
            await destroyCache(`presentation:name=${prev.nameEn}*`)
            await destroyCache(`presentations*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`updatedPresentation:id=${input.id}`, {
                updatedPresentation: data
            });
            return data;
        } catch(error) {
            logError(error, 'P6U');
        }
    };

    /**
     * Crea y devuelve un nuevo registro
     * 
     * @param {Object} id Datos de la nueva entrada
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */
    static delete = async(id, locale) => {
        try {
            if(!id) throw new Error("Se requiere un ID de presentación para continuar")
            const prev = await this.getById(id, locale);
            if(!prev) throw new Error(`No existe una presentación con el ID ${id}, verifique`);
            await model.Fruit.destroy({where: {id}});
            await destroyCache(`presentation:id=${id}*`);
            await destroyCache(`presentation:name=${prev.nameEs}*`)
            await destroyCache(`presentation:name=${prev.nameEn}*`)
            await destroyCache(`presentations*`);
            const data = await this.getById(id, locale);
            await pubsub.publish(`deletedPresentation:id=${id}`, {
                deletedPresentation: data
            });
            return data;
        } catch(error) {
            logError(error, 'F7D');
        }
    };

    static sync = async() => {
        /**
         * Columnas de Excel donde se encuentra la información
         * 
         * @type {Object}
         */
        const ranges = {
            id: "A",
            nameEs: "I",
            nameEn: "B",
            picture: "E",
            descriptionEs: "J",
            descriptionEn: "C",
            category: "F"
        };

        try {
            const googleSheetsInstance = await googleSheets();
            const response = await googleSheetsInstance.spreadsheets.values.batchGet({
                spreadsheetId: "1KSEwxP6rmBvGi83_D38DaGEgoiK0ldJh26Mcrp16oMM",
                ranges: Object.keys(ranges).map(key => `Presentacion!${ranges[key]}2:${ranges[key]}`),
                majorDimension: 'COLUMNS',
                valueRenderOption: "UNFORMATTED_VALUE",
                dateTimeRenderOption: "SERIAL_NUMBER",
            });
            const data = response.data.valueRanges.map(result => (result?.values?.length ? result.values[0] : []));
            const current = {}
            const responseList = await this.list({}, {num: 1000}, "en")
            responseList.forEach(item => {
                current[item.id] = "delete"
            });
            for (let index = 0; index < data[0].length; index++) {
                const input = {
                    id: data[0][index],
                    nameEs: data[1].length > index ? data[1][index] : '',
                    nameEn: data[2].length > index ? data[2][index] : '',
                    picture: data[3].length > index ? data[3][index] : '',
                    descriptionEs: data[4].length > index ? data[4][index] : '',
                    descriptionEn: data[5].length > index ? data[5][index] : '',
                    category: data[6].length > index ? data[6][index] : '',
                }
                input.picture = DriveImageToURL(input.picture)
                if(!input.nameEn) continue
                const _category = await PresentationCategory.getByName(input.category, 'en')
                input.category = _category.id
                //Checar si existe
                if(input.id in current) {
                    current[input.id] = "updated"
                    await this.update(input, 'en')
                }
                else{
                    current[input.id] = "new"
                    await this.create(input, 'en')
                }
            }
            const result = {
                added: 0,
                updated: 0,
                deleted: 0
            }
            for (const [key, value] of Object.entries(current)) {
                switch (value) {
                    case 'new':
                        result.added++;
                        break;
                    case 'delete':
                        await this.delete(key, 'en')
                        result.deleted++;
                        break;
                    case 'updated':
                        result.updated++;
                        break;
                    default:
                        break;
                }
            }
            return result
        } catch (error) {
            logError(error, 'P8S')
        }
    }
}

module.exports = {
    Fruit,
    FruitVariety,
    Presentation
}
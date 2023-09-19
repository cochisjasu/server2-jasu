const cryptoRandomString = require('crypto-random-string');
const {logError, redis, pubsub, destroyCache, resolve_i18n, googleSheets} = require('./core');
const model = require('../models/product');

/**
 * Clase que administra las categorias de las frutas
 *
 * @class
 */
class FruitCategory {
    /**
     * Objeto con la definición de campos dependientes del lenguaje seleccionado
     * 
     * @type {Object}
     */
    static i18n_fields = {
        'name': 'name'
    };

    /**
     * Busca y devuelve una categoria de fruta por su ID
     * 
     * @param {String} id ID de la categoria
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns 
     */
    static getById = async(id, locale) => {
        try {
            const u = `fruitCategory:id=${id}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.FruitCategory.findOne({
                where: {id}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'FC1GI');
        }
    };

    /**
     * Busca y devuelve una categoria de fruta por su nombre
     * 
     * @param {String} name ID de la categoria
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns 
     */
    static getByName = async(name, locale) => {
        try {
            const u = `fruitCategory:name=${name}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.FruitCategory.findOne({
                where: locale === "en" ? {nameEn: name} : {nameEs: name}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'FC2GN');
        }
    };

    /**
     * Devuelve la lista de registros encontrados dependiendo de los filtros y la paginación deseada
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */ 
    static list = async (locale) => {
        try {
            const u = `fruitCategories:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.FruitCategory.findAll().map(x => resolve_i18n(x.get({plain: true}), this.i18n_fields, locale));
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'FC3L');
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
            if(prev) throw new Error(`Ya existe una categoria de fruta con el ID ${input.id}, use otro ID`);
            await model.FruitCategory.create(input);
            await destroyCache(`fruitCategory:id=${input.id}*`);
            if(input.nameEs) await destroyCache(`fruitCategory:name=${input.nameEs}*`)
            if(input.nameEn) await destroyCache(`fruitCategory:name=${input.nameEn}*`)
            await destroyCache(`fruitCategories*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`createdFruitCategory`, {
                createdFruitCategory: data
            });
            return data;
        } catch(error) {
            logError(error, 'FC4C');
        }
    };

    /**
     * Crea y devuelve un nuevo registro
     * 
     * @param {Object} input Datos de la nueva entrada
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */
    static update = async(input, locale) => {
        try {
            if(!input.id) throw new Error("Se requiere un ID de categoría de fruta para continuar")
            const prev = await this.getById(input.id, locale);
            if(!prev) throw new Error(`No existe una categoria de fruta con el ID ${input.id}, verifique`);
            await model.FruitCategory.update(input, {where: {id: input.id}});
            await destroyCache(`fruitCategory:id=${input.id}*`);
            if(input.nameEs && input.nameEs != prev.nameEs) await destroyCache(`fruitCategory:name=${input.nameEs}*`)
            await destroyCache(`fruitCategory:name=${prev.nameEs}*`)
            if(input.nameEn && input.nameEn != prev.nameEn) await destroyCache(`fruitCategory:name=${input.nameEn}*`)
            await destroyCache(`fruitCategory:name=${prev.nameEn}*`)
            await destroyCache(`fruitCategories*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`updatedFruitCategory:id=${input.id}`, {
                updatedFruitCategory: data
            });
            return data;
        } catch(error) {
            logError(error, 'FC5C');
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
            if(!id) throw new Error("Se requiere un ID de categoría de fruta para continuar")
            const prev = await this.getById(id, locale);
            if(!prev) throw new Error(`No existe una categoria de fruta con el ID ${id}, verifique`);
            await model.FruitCategory.destroy({where: {id}});
            await destroyCache(`fruitCategory:id=${id}*`);
            await destroyCache(`fruitCategory:name=${prev.nameEs}*`)
            await destroyCache(`fruitCategory:name=${prev.nameEn}*`)
            await destroyCache(`fruitCategories*`);
            const data = await this.getById(id, locale);
            await pubsub.publish(`deletedFruitCategory:id=${id}`, {
                deletedFruitCategory: data
            });
            return data;
        } catch(error) {
            logError(error, 'FC6C');
        }
    };

    static sync = async () => {
        /**
         * Columnas de Excel donde se encuentra la información
         * 
         * @type {Object}
         */
        const ranges = {
            nameEs: "A",
            nameEn: "B",
        };

        try {
            const googleSheetsInstance = await googleSheets();
            const response = await googleSheetsInstance.spreadsheets.values.batchGet({
                spreadsheetId: "1KSEwxP6rmBvGi83_D38DaGEgoiK0ldJh26Mcrp16oMM",
                ranges: Object.keys(ranges).map(key => `Datos!${ranges[key]}2:${ranges[key]}`),
                majorDimension: 'COLUMNS',
                valueRenderOption: "UNFORMATTED_VALUE",
                dateTimeRenderOption: "SERIAL_NUMBER",
            });
            const data = response.data.valueRanges.map(result => (result?.values?.length ? result.values[0] : []));
            const current = {}
            const responseList = await this.list('en')
            responseList.forEach(item => {
                current[item.name] = "delete"
            });
            for (let index = 0; index < data[0].length; index++) {
                const input = {
                    nameEs: data[0][index],
                    nameEn: data[1].length > index ? data[1][index] : '',
                }
                //Checar si existe
                if(input.nameEn in current) {
                    current[input.nameEn] = "updated"
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
            logError(error, 'FC7S')
        }
    }
}

/**
 * Clase que administra la clasificación de los procesos(presentaciones) de una fruta
 *
 * @class
 */
class PresentationCategory {
    /**
     * Objeto con la definición de campos dependientes del lenguaje seleccionado
     * 
     * @type {Object}
     */
    static i18n_fields = {
        'name': 'name'
    };

    /**
     * Busca y devuelve una categoria de procesos por su ID
     * 
     * @param {String} id ID de la categoria
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns {Object}
     */
    static getById = async(id, locale) => {
        try {
            const u = `presentationCategory:id=${id}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.PresentationCategory.findOne({
                where: {id}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PC1GI');
        }
    };

    /**
     * Busca y devuelve una categoria de fruta por su nombre
     * 
     * @param {String} name ID de la categoria
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns 
     */
    static getByName = async(name, locale) => {
        try {
            const u = `presentationCategory:name=${name}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.PresentationCategory.findOne({
                where: locale === "en" ? {nameEn: name} : {nameEs: name}
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PC2GN');
        }
    };

    /**
     * Devuelve la lista de registros encontrados dependiendo de los filtros y la paginación deseada
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */ 
    static list = async (locale) => {
        try {
            const u = `presentationCategories:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.PresentationCategory.findAll().map(x => resolve_i18n(x.get({plain: true}), this.i18n_fields, locale));
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PC3L');
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
            if(prev) throw new Error(`Ya existe una categoria de presentación con el ID ${input.id}, use otro ID`);
            await model.PresentationCategory.create(input);
            await destroyCache(`presentationCategory:id=${input.id}*`);
            if(input.nameEs) await destroyCache(`presentationCategory:name=${input.nameEs}*`)
            if(input.nameEn) await destroyCache(`presentationCategory:name=${input.nameEn}*`)
            await destroyCache(`presentationCategories*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`createdPresentationCategory`, {
                createdPresentationCategory: data
            });
            return data;
        } catch(error) {
            logError(error, 'PC4C');
        }
    };

    /**
     * Crea y devuelve un nuevo registro
     * 
     * @param {Object} input Datos de la nueva entrada
     * @param {"es"|"en"} locale Idioma seleccionado de la aplicación
     * @returns
     */
    static update = async(input, locale) => {
        try {
            if(!input.id) throw new Error("Se requiere un ID de categoría de presentación para continuar")
            const prev = await this.getById(input.id, locale);
            if(!prev) throw new Error(`No existe una categoria de presentación con el ID ${input.id}, verifique`);
            await model.PresentationCategory.update(input, {where: {id: input.id}});
            await destroyCache(`presentationCategory:id=${input.id}*`);
            if(input.nameEs && input.nameEs != prev.nameEs) await destroyCache(`presentationCategory:name=${input.nameEs}*`)
            await destroyCache(`presentationCategory:name=${prev.nameEs}*`)
            if(input.nameEn && input.nameEn != prev.nameEn) await destroyCache(`presentationCategory:name=${input.nameEn}*`)
            await destroyCache(`presentationCategory:name=${prev.nameEn}*`)
            await destroyCache(`presentationCategories*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`updatedPresentationCategory:id=${input.id}`, {
                updatedPresentationCategory: data
            });
            return data;
        } catch(error) {
            logError(error, 'PC5C');
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
            if(!id) throw new Error("Se requiere un ID de categoría de presentación para continuar")
            const prev = await this.getById(id, locale);
            if(!prev) throw new Error(`No existe una categoria de presentación con el ID ${id}, verifique`);
            await model.PresentationCategory.destroy({where: {id}});
            await destroyCache(`presentationCategory:id=${id}*`);
            await destroyCache(`presentationCategory:name=${prev.nameEs}*`)
            await destroyCache(`presentationCategory:name=${prev.nameEn}*`)
            await destroyCache(`presentationCategories*`);
            const data = await this.getById(id, locale);
            await pubsub.publish(`deletedPresentationCategory:id=${id}`, {
                deletedPresentationCategory: data
            });
            return data;
        } catch(error) {
            logError(error, 'PC6C');
        }
    };

    static sync = async () => {
        /**
         * Columnas de Excel donde se encuentra la información
         * 
         * @type {Object}
         */
        const ranges = {
            nameEs: "C",
            nameEn: "D",
        };

        try {
            const googleSheetsInstance = await googleSheets();
            const response = await googleSheetsInstance.spreadsheets.values.batchGet({
                spreadsheetId: "1KSEwxP6rmBvGi83_D38DaGEgoiK0ldJh26Mcrp16oMM",
                ranges: Object.keys(ranges).map(key => `Datos!${ranges[key]}2:${ranges[key]}`),
                majorDimension: 'COLUMNS',
                valueRenderOption: "UNFORMATTED_VALUE",
                dateTimeRenderOption: "SERIAL_NUMBER",
            });
            const data = response.data.valueRanges.map(result => (result?.values?.length ? result.values[0] : []));
            const current = {}
            const responseList = await this.list("en")
            responseList.forEach(item => {
                current[item.name] = "delete"
            });
            for (let index = 0; index < data[0].length; index++) {
                const input = {
                    nameEs: data[0][index],
                    nameEn: data[1].length > index ? data[1][index] : '',
                }
                //Checar si existe
                if(input.nameEn in current) {
                    current[input.nameEn] = "updated"
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
            logError(error, 'PC7S')
        }
    }
}

module.exports = {
    FruitCategory,
    PresentationCategory
}
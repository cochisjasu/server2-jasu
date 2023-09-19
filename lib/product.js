const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const cryptoRandomString = require('crypto-random-string');
const {logError, redis, pubsub, destroyCache, baseConfig, resolve_i18n, googleSheets} = require('./core');
const model = require('../models/product');
const {Presentation, FruitVariety, Fruit} = require('./fruit');

/**
 * Modulo que contiene la definición de las clases para la correcta
 * clasificación de los productos: Frutas, presentaciones.
 *
 * @module Product
 */

/**
 * Clase que administra la documentación de los productos disponibles
 *
 * @class
 */
class ProductFile {
    /**
     * Objeto con la definición de campos dependientes del lenguaje seleccionado
     * 
     * @type {Object}
     */
    static i18n_fields = {
        'name': 'name',
        'url': 'url',
    };

    /**
     * Busca y devuelve un archivo por su ID
     * 
     * @param {String} id ID del archivo
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns
     */
    static getById = async(id, locale) => {
        try {
            const u = `productFile:id=${id}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.ProductFile.findOne({
                where: {id},
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PRF1GI');
        }
    };

    /**
     * Procesa un filtro de SQL en formato string y lo transforma en un query Sequelize
     *
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @returns
     */
    static processFilter(filter) {
        let where = {};
        for(let x in filter) switch(x) {
            case 'name':
                where.name = {[Op.like]: `%${filter.query}%`};
                break;
            case 'id':
                where.id = {[Op.in]: filter.id};
                break;
            case 'product':
                where.productId = {[Op.in]: filter.product};
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
            const u = `productFiles:count:filter=${JSON.stringify(filter)}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            const where = this.processFilter(filter);
            let data = await model.ProductFile.count({
                where,
            });
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PRF2C');
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
            const u = `productFiles:filter=${JSON.stringify(filter)}:options=${JSON.stringify(options)}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            if(options.ord in this.i18n_fields) options.ord = `${options.ord}${locale === 'es' ? 'Es' : 'En'}`;
            const where = this.processFilter(filter, locale),
                limit = options.num || baseConfig.defaultNum,
                order = [[options.ord ? options.ord : (locale === 'es' ? 'nameEs' : 'nameEn') , options.asc ? 'ASC' : 'DESC']],
                offset = (options.pag || 0) * limit;
            let data = await model.ProductFile.findAll({
                where, limit, offset, order
            }).map(x => resolve_i18n(x.get({plain: true}), this.i18n_fields, locale));
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PRF3L');
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
            if(prev) throw new Error(`Ya existe un archivo con el ID ${input.id}, use otro ID`);
            const _product = await Product.getById(input.product, locale);
            if(!_product) throw new Error(`No existe el producto con el ID ${input.fruitVariety}, favor de verificar`);
            input.productId = input.product;
            await model.ProductFile.create(input);
            await destroyCache(`productFile:id=${input.id}*`);
            await destroyCache(`productFiles*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`createdProductFile`, {
                createdProductFile: data
            });
            return data;
        } catch(error) {
            logError(error, 'PRF4C');
        }
    };

    static update = async(input, locale) => {
        try {
            if(!input.id) throw new Error("Se requiere un ID de archivo de producto para continuar")
            const prev = await this.getById(input.id, locale);
            if(!prev) throw new Error(`No existe el archivo con el ID ${input.id}, verifique`);
            if (input.product) {
                const _product = await Product.getById(input.product, locale);
                if(!_product) throw new Error(`No existe el producto con el ID ${input.fruitVariety}, favor de verificar`);
                input.productId = input.product;
            }
            await model.ProductFile.update(input, {where: {id: input.id}});
            await destroyCache(`productFile:id=${input.id}*`);
            await destroyCache(`productFiles*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`updatedProductFile:id=${input.id}`, {
                updatedProductFile: data
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
            if(!id) throw new Error("Se requiere un ID de archivo de producto para continuar")
            const prev = await this.getById(id, locale);
            if(!prev) throw new Error(`No existe el archivo con el ID ${id}, verifique`);
            await model.ProductFile.destroy({where: {id}});
            await destroyCache(`productFile:id=${id}*`);
            await destroyCache(`productFiles*`);
            const data = await this.getById(id, locale);
            await pubsub.publish(`deletedProductFile:id=${id}`, {
                deletedProductFile: data
            });
            return data;
        } catch(error) {
            logError(error, 'F7D');
        }
    };
}

/**
 * Clase que administra los productos disponibles: Fruta sometida a un proceso(presentación)
 *
 * @class
 */
class Product {
    /**
     * Objeto con la definición de campos dependientes del lenguaje seleccionado
     * 
     * @type {Object}
     */
    static i18n_fields = {
        'description' : 'description',
        'fruitVariety' : FruitVariety,
        'presentation' : Presentation,
        'fullName' : 'fullName',
        'productFiles' : ProductFile,
    };

    static custom_fields = {
        'fullName' : "if(strcmp(`fruitVariety->fruit`.name_-0-, fruitVariety.name_-0-) = 0, `fruitVariety->fruit`.name_-0-, concat(`fruitVariety->fruit`.name_-0-, ' ', fruitVariety.name_-0-)) AS `fruitVariety.fullName-1-`",
    }

    /**
     * Busca y devuelve un producto por su ID
     * 
     * @param {String} id ID del producto
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns
     */
    static getById = async(id, locale) => {
        try {
            const u = `product:id=${id}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Product.scope('specs').findOne({
                where: {id},
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PR1GI');
        }
    };

    static getByFruitPresentation = async(fruitVarietyId, presentationId, locale) => {
        try {
            const u = `product:fruitVariety=${fruitVarietyId}:presentation=${presentationId}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Product.scope('specs').findOne({//TODO: define scope if necessary
                where: {fruitVarietyId, presentationId},
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PR2GFP');
        }
    };

    /**
     * Procesa un filtro de SQL en formato string y lo transforma en un query Sequelize
     *
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {"es"|"en"} locale Código ISO del lenguaje
     * @returns
     */
    static processFilter(filter, locale=baseConfig.defaultLocale) {
        let where = {};
        let having = {};
        for(let x in filter) switch(x) {
            case 'query':
                where = {
                    ...where,
                    [Op.and]: filter.query.trim().split(' ').map(query => ({
                        [Op.or]: [
                            {
                                '$fruitVariety.id$': query
                            },
                            {
                                '$presentation.id$': query
                            },
                        ]
                    }))
                };
                break;
            case 'search':
                const fruitName = '`fruitVariety.fullName' + (locale === 'es' ? 'Es' : 'En') + '`';
                const presentationName = '`presentation.name' + (locale === 'es' ? 'Es' : 'En') + '`';
                having = {
                    ...having,
                    [Op.and]: {[Op.or]:[
                        {
                            [fruitName] : {[Op.like]: `%${filter.search}%`}
                        },
                        {
                            [presentationName] : {[Op.like]: `%${filter.search}%`}
                        },
                    ]}
                }
                break;
            case 'id':
                where.id = {[Op.in]: filter.id};
                break;
            case 'fruitVariety':
                where.fruitVarietyId = {[Op.in]: filter.fruitVariety};
                break;
            case 'presentation':
                where.presentationId = {[Op.in]: filter.presentation};
                break;
        }
        return [where, having];
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
            const u = `products:count:filter=${JSON.stringify(filter)}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            const [where, having] = this.processFilter(filter);
            let data = await model.Product.scope('count').count({
                where,
            });
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PR3C');
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
            const u = `products:filter=${JSON.stringify(filter)}:options=${JSON.stringify(options)}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            
            let order = null;
            if(!(options.ord)){
                if ('fruitVariety' in filter) {
                    const tmp = '`presentation.name' + (locale === 'es' ? 'Es' : 'En') + '`';
                    order = [[Sequelize.literal(`${tmp} ${options.asc ? 'ASC' : 'DESC'}`)]]
                } else if ('presentation' in filter) {
                    const tmp = '`fruitVariety.fullName' + (locale === 'es' ? 'Es' : 'En') + '`';
                    order = [[Sequelize.literal(`${tmp} ${options.asc ? 'ASC' : 'DESC'}`)]]
                }
                else {
                    order = [['id', options.asc ? 'ASC' : 'DESC']]
                }
            }
            else
            {
                if(options.ord in this.i18n_fields) options.ord = `${options.ord}${locale === 'es' ? 'Es' : 'En'}`;
                order = [[options.ord, options.asc ? 'ASC' : 'DESC']]
            }

            //Custom fields
            const attributesInclude = Object.keys(this.custom_fields).map(key => (
                //(key in this.i18n_fields) ? 
                Sequelize.literal(this.custom_fields[key].replace(/-0-/g, locale).replace(/-1-/g, locale === 'es' ? 'Es' : 'En'))// : 
                //Sequelize.literal(this.custom_fields[key])
            ));

            const [where, having] = this.processFilter(filter, locale),
                limit = options.num || baseConfig.defaultNum,
                offset = (options.pag || 0) * limit;
            let data = await model.Product.scope('default').findAll({
                attributes: {include: attributesInclude},
                where, limit, offset, order, having,
            }).map(x => resolve_i18n(x.get({plain: true}), this.i18n_fields, locale));
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PR4L');
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
            if(prev) throw new Error(`Ya existe un producto con el ID ${input.id}, use otro ID`);
            const fruitVariety = await FruitVariety.getById(input.fruitVariety, locale);
            if(!fruitVariety) throw new Error(`No existe la fruta con el ID ${input.fruitVariety}, favor de verificar`);
            input.fruitVarietyId = input.fruitVariety;
            const presentation = await Presentation.getById(input.presentation, locale);
            if(!presentation) throw new Error(`No existe la presentación con el ID ${input.presentation}, favor de verificar`);
            input.presentationId = input.presentation;
            await model.Product.create(input);
            await destroyCache(`product:id=${input.id}*`);
            await destroyCache(`products*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`createdProduct`, {
                createdProduct: data
            });
            return data;
        } catch(error) {
            logError(error, 'PR5C');
        }
    };

    static update = async(input, locale) => {
        try {
            if(!input.id) throw new Error("Se requiere un ID de producto para continuar")
            const prev = await this.getById(input.id, locale);
            if(!prev) throw new Error(`No existe un producto con el ID ${input.id}, verifique`);
            if (input.fruitVariety) {
                const fruitVariety = await FruitVariety.getById(input.fruitVariety, locale);
                if(!fruitVariety) throw new Error(`No existe la variedad de fruta con el ID ${input.fruitVariety}, favor de verificar`);
                input.fruitVarietyId = input.fruitVariety;
            }
            if (input.presentation) {
                const presentation = await Presentation.getById(input.presentation, locale);
                if(!presentation) throw new Error(`No existe la presentación con el ID ${input.presentation}, favor de verificar`);
                input.presentationId = input.presentation;
            }
            await model.Product.update(input, {where: {id: input.id}});
            await destroyCache(`product:id=${input.id}*`);
            await destroyCache(`product:fruitVariety=${prev.fruitVariety.id}:presentation=${prev.presentation.id}*`)
            await destroyCache(`products*`);
            const data = await this.getById(input.id, locale);
            await destroyCache(`product:fruitVariety=${data.fruitVariety.id}:presentation=${data.presentation.id}*`)
            await pubsub.publish(`updatedProduct:id=${input.id}`, {
                updatedProduct: data
            });
            return data;
        } catch(error) {
            logError(error, 'PR6U');
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
            if(!id) throw new Error("Se requiere un ID de producto para continuar")
            const prev = await this.getById(id, locale);
            if(!prev) throw new Error(`No existe un producto con el ID ${id}, verifique`);
            await model.Product.destroy({where: {id}});
            await destroyCache(`product:id=${id}*`);
            await destroyCache(`product:fruitVariety=${prev.fruitVariety.id}:presentation=${prev.presentation.id}*`)
            await destroyCache(`products*`);
            const data = await this.getById(id, locale);
            await pubsub.publish(`deletedProduct:id=${id}`, {
                deletedProduct: data
            });
            return data;
        } catch(error) {
            logError(error, 'PR7D');
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
            fruitVarietyEn: "D",
            fruitVarietyEs: "T",
            fruit: "C",
            presentation: "E",
            descriptionEs: "Y",
            descriptionEn: "I",
            picture: "K",
            shelfLifeEs: "X",
            shelfLifeEn: "H",
            specUrlEn: "M",
            specUrlEs: "AC",
            specNameEs: "AB",
            specNameEn: "L",
            mdsUrlEn: "O",
            mdsUrlEs: "AE",
            mdsNameEs: "AD",
            mdsNameEn: "N",
        };

        try {
            const googleSheetsInstance = await googleSheets();
            const response = await googleSheetsInstance.spreadsheets.values.batchGet({
                spreadsheetId: "1KSEwxP6rmBvGi83_D38DaGEgoiK0ldJh26Mcrp16oMM",
                ranges: Object.keys(ranges).map(key => `Producto!${ranges[key]}3:${ranges[key]}`),
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
                    id:                                           data[0][index],
                    fruitVarietyEn: data[1].length > index ? data[1][index] : '',
                    fruitVarietyEs: data[2].length > index ? data[2][index] : '',
                    fruit:          data[3].length > index ? data[3][index] : '',
                    presentation:   data[4].length > index ? data[4][index] : '',
                    descriptionEs:  data[5].length > index ? data[5][index] : '',
                    descriptionEn:  data[6].length > index ? data[6][index] : '',
                    picture:        data[7].length > index ? data[7][index] : '',
                    shelfLifeEs:    data[8].length > index ? data[8][index] : '',
                    shelfLifeEn:    data[9].length > index ? data[9][index] : '',
                    specUrlEn:    data[10].length > index ? data[10][index] : '',
                    specUrlEs:    data[11].length > index ? data[11][index] : '',
                    specNameEs:   data[12].length > index ? data[12][index] : '',
                    specNameEn:   data[13].length > index ? data[13][index] : '',
                    mdsUrlEn:     data[14].length > index ? data[14][index] : '',
                    mdsUrlEs:     data[15].length > index ? data[15][index] : '',
                    mdsNameEs:    data[16].length > index ? data[16][index] : '',
                    mdsNameEn:    data[17].length > index ? data[17][index] : '',
                }
                input.shelfLifeEn = input.shelfLifeEn.substring(0, 100)
                input.shelfLifeEs = input.shelfLifeEs.substring(0, 100)
                if(!input.fruit) continue
                const variety = input.fruitVarietyEn.length ? input.fruitVarietyEn : input.fruit
                const _fruit = await Fruit.getByName(input.fruit, 'en')
                if(!_fruit) continue
                let _fruitVariety = await FruitVariety.getByName(variety, _fruit.id, 'en')
                const fruitVarietyInput = {
                    nameEs: input.fruitVarietyEs.length ? input.fruitVarietyEs : _fruit.nameEs,
                    nameEn: variety,
                    fruit: _fruit.id
                }
                if(!_fruitVariety){
                    _fruitVariety = await FruitVariety.create(fruitVarietyInput, 'en')
                }else if(!_fruitVariety.id.length > 4){
                    fruitVarietyInput.id = _fruitVariety.id
                    _fruitVariety = await FruitVariety.update(fruitVarietyInput, 'en')
                }
                input.fruitVariety = _fruitVariety.id
                const _presentation = await Presentation.getByName(input.presentation, 'en')
                if(!_presentation) continue
                input.presentation = _presentation.id

                const fileInputs = [
                    {
                        nameEs: input.specNameEs,
                        nameEn: input.specNameEn,
                        urlEn: input.specUrlEn,
                        urlEs: input.specUrlEs,
                        product: input.id
                    },
                    {
                        nameEs: input.mdsNameEs,
                        nameEn: input.mdsNameEn,
                        urlEn: input.mdsUrlEn,
                        urlEs: input.mdsUrlEs,
                        product: input.id
                    }
                ]
                
                if(input.id in current) {
                    current[input.id] = "updated"
                    await this.update(input, 'en')
                    const files = await ProductFile.list({product: [input.id]}, {}, 'en')
                    for (const file of files) {
                        await ProductFile.delete(file.id, 'en')
                    }
                }
                else{
                    current[input.id] = "new"
                    await this.create(input, 'en')
                }
                for (const fileInput of fileInputs) {
                    if(fileInput.urlEn.length || fileInput.urlEs.length) await ProductFile.create(fileInput, 'en')
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
                        await this.delete(key, 'locale')
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
            logError(error, 'PR8S')
        }
    }
}

module.exports = {
    Product,
    ProductFile,
};
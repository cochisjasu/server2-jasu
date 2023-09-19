const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const cryptoRandomString = require('crypto-random-string');
const {logError, redis, pubsub, destroyCache, baseConfig, googleSheets, ExcelDateToJSDate, resolve_i18n} = require('./core');
const model = require('../models/price');
const fruit = require('./fruit');
const product = require('./product');
const i18n = require('./i18n');

/**
 * Modulo encargado de los precios y la cosecha de productos
 *
 * @module Price
 */

/**
 * Clase que administra los precios de los productos
 *
 * @class
 */
class Price {

    /**
     * Objeto con la definición de campos dependientes del lenguaje seleccionado
     * 
     * @type {Object}
     */
    static i18n_fields = {
        'country': i18n.Country,
        'product': product.Product,
    }

    /**
     * Busca y devuelve un precio por su ID
     * 
     * @param {String} id ID del precio
     * @param {Boolean} loggedIn Indica si la sesión es de un usuario registrado o no
     * @param {String} locale Código ISO del lenguaje
     * @returns {Object}
     */
    static getById = async(id, loggedIn = false, locale) => {
        const attributes = loggedIn ? {} : {exclude:['price']};
        try {
            const u = `price:id=${id}:loggedIn=${loggedIn}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Price.scope('default').findOne({
                where: {id},
                attributes,
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PI1GI');
        }
    };

    /**
     * Busca y devuelve un precio buscando valores específicos
     * 
     * @param {String} productId ID del producto
     * @param {String} countryId ID del país origen
     * @param {String} date Fecha del precio
     * @param {Boolean} loggedIn Indica si la sesión es de un usuario registrado o no
     * @param {String} locale Código ISO del lenguaje
     * @returns {Object}
     */
    static getOne = async(productId, countryId, date, loggedIn = false, locale) => {
        const attributes = loggedIn ? {} : {exclude:['price']};
        try {
            const u = `price:product=${productId}:country=${countryId}:date${date}:loggedIn=${loggedIn}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            const where = {
                productId,
                countryId,
                date,
            }
            if (countryId == null || countryId == '') {
                delete where.countryId
            }
            let data = await model.Price.scope('default').findOne({
                where: {productId, countryId, date},
                attributes,
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch (error) {
            logError(error, 'PI2GO');
        }
    }

    /**
     * Procesa un filtro de SQL en formato string y lo transforma en un query Sequelize
     *
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @returns {Object}
     */
    static processFilter(filter) {
        let where = {};
        for(let x in filter) switch(x) {
            case 'query':
                where = {
                    ...where,
                    [Op.and]: filter.query.trim().split(' ').map(query => ({
                        [Op.or]: [
                            {
                                '$product.fruitVariety.id$': query
                            },
                            {
                                '$product.presentation.id$': query
                            },
                        ]
                    }))
                };
                break;
            case 'product':
                where.productId = {[Op.in]: filter.product};
                break;
            case 'country':
                where.countryId = {[Op.in]: filter.country};
                break;
            case 'year':
                where.date = {
                    [Op.gte]: new Date(filter.year, 0, 0),
                    [Op.lte]: new Date(filter.year, 11, 31),
                };
                break;
        }
        return where;
    }

    /**
     * Cuenta cuantas temporadas de cosechas hay en total dependiendo del filtro utilizado
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @returns {Int}
     */
    static count = async(filter) => {
        try {
            if(!filter) filter = {};
            const u = `price:count:filter=${JSON.stringify(filter)}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Price.scope('count').count({
                where: this.processFilter(filter)
            });
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PI3C');
        }
    };

    /**
     * Devuelve la lista de precios
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {Object} options Opciones de paginación
     * @param {Boolean} loggedIn Indica si la sesión es de un usuario registrado o no
     * @param {String} locale Idioma seleccionado de la aplicación
     * @returns {Array}
     */ 
    static list = async(filter, options, loggedIn = false, locale) => {
        try {
            if(!filter) filter = {};
            if(!options) options = {};
            const u = `price:filter=${JSON.stringify(filter)}:options=${JSON.stringify(options)}:loggedIn=${loggedIn}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            const query = {
                attributes: loggedIn ? {} : {exclude:['price']},
                where: this.processFilter(filter),
                order: options.ord ? [[options.ord, options.asc ? 'ASC' : 'DESC']] : [['date', 'DESC']],
                limit: options.num || baseConfig.defaultNum,
            }
            if(query.limit === -1) delete query.limit
            else query.offset = (options.pag || 0) * query.limit;

            let data = await model.Price.scope('default').findAll(query).map(x => resolve_i18n(x.get({plain: true}), this.i18n_fields, locale));
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'PI4L');
        }
    };

    /**
     * Crea y devuelve un nuevo precio
     * 
     * @param {Object} input Datos de la nueva entrada
     * @param {String} locale Idioma seleccionado de la aplicación
     * @returns {Object}
     */ 
    static create = async(input, locale) => {
        try {
            if(!input.id) input.id = cryptoRandomString({type: 'url-safe', length: 10});
            const prev = await this.getById(input.id, false, locale);
            if(prev) throw new Error(`Ya existe un precio con el ID ${input.id}, use otro ID`);
            let _product = null;
            if(input.product) _product = await product.Product.getById(input.product, locale);
            else _product = await product.Product.getByFruitPresentation(input.fruit, input.presentation, locale);
            if(!_product) throw new Error(`No existe el producto especificado, favor de verificar`);
            input.productId = _product.id;
            if (input.country.length > 0)
            {
                const _country = await i18n.Country.getById(input.country, locale);
                if(!_country) throw new Error(`No existe el país ${input.country}, favor de verificar`);
                input.countryId = _country.id;
            }
            await model.Price.create(input);
            await destroyCache(`price:id=${input.id}*`);
            await destroyCache(`price*`);
            const data = await this.getById(input.id, true, locale);
            await pubsub.publish(`createdPrice`, {
                createdPrice: data
            });
            return data;
        } catch(error) {
            logError(error, 'PI5CR');
        }
    };

    /**
     * Procesa el texto proveniente del archivo Excel que contiene la variedad de fruta y la busca
     * 
     * @param {String} label Texto con la fruta relacionada al precio
     * @param {String} locale Idioma seleccionado de la aplicación
     * @returns {Object}
     */
    static getFruitByLabel = async(label, locale) => {
        try {
            const [fruitName, ...varietyParts] = label.split(' ');
            const varietyName = varietyParts.join(' ');
            const _fruit = await fruit.Fruit.getByName(fruitName, locale);
            if (!_fruit) return null;
            const _variety = await fruit.FruitVariety.getByName(varietyName.length ? varietyName : fruitName, _fruit.id, locale);
            if (!_variety) return null;
            return _variety;
        } catch (error) {
            logError(error, 'PI7FBL');
        }
    }

    /**
     * Accede al archivo de Google Sheets donde se almacena la información de los precios,
     * la extrae y la almacena en la base de datos, devolviendo el número de registros
     * exitosos.
     * 
     * @param {String} locale Idioma seleccionado de la aplicación
     * @returns {Int}
     */
    static syncData = async(locale) => {

        /**
         * Columnas de Excel donde se encuentra la información
         * 
         * @type {Object}
         */
        const ranges = {
            fruit: "I",
            presentation: "J",
            organic: "L",
            drums: "M",
            volume: "N",
            date: "H",
            country: "Q",
            price: "P"
        };

        try {
            const googleSheetsInstance = await googleSheets();
            const response = await googleSheetsInstance.spreadsheets.values.batchGet({
                spreadsheetId: "1iwhG4tVTuQkv-oQwXsEs5Q9Xle1-9NZo2IODvilMzRo",
                ranges: Object.keys(ranges).map(key => `Available!${ranges[key]}2:${ranges[key]}`),
                majorDimension: 'COLUMNS',
                valueRenderOption: "UNFORMATTED_VALUE",
                dateTimeRenderOption: "SERIAL_NUMBER",
            });
            const data = response.data.valueRanges.map(result => (result?.values?.length ? result.values[0] : []));
            let added = 0;
            for (let index = 0; index < data[0].length; index++) {
                const input = {
                    fruit: data[0][index],
                    presentation: data[1].length > index ? data[1][index] : '',
                    organic: data[2].length > index ? data[2][index] : '',
                    drums: data[3].length > index ? data[3][index] : null,
                    volume: data[4].length > index ? data[4][index] : null,
                    date: data[5].length > index ? data[5][index] : null,
                    country: data[6].length > index ? data[6][index] : '',
                    price: data[7].length > index ? data[7][index] : null,
                }
                //Organic
                if(input.organic === 'Organic') input.organic = true;
                else input.organic = false;
                //Precio
                if(input.price === null || (typeof input.price === 'string' && !input.price.length) || isNaN(input.price) || input.price === 0) continue;
                //Presentación
                const _presentation = await fruit.Presentation.getByName(input.presentation, locale);
                if(!_presentation) continue;
                input.presentation = _presentation.id;
                //Fecha
                if(!input.date || isNaN(input.price)) continue;
                input.date = ExcelDateToJSDate(input.date)
                //Fruta
                const _fruitVariety = await this.getFruitByLabel(input.fruit, locale);
                if(!_fruitVariety) continue;
                input.fruitVariety = _fruitVariety.id; 
                //País
                if (input.country?.length > 0) {
                    const _country = await i18n.Country.getByName(input.country, locale);
                    if(!_country) continue;
                    input.country = _country.id;
                }
                else continue;
                //Producto
                const _product = await product.Product.getByFruitPresentation(input.fruitVariety, input.presentation, locale);
                if(!_product) continue;
                input.product = _product.id;
                //Checar si existe precio
                if(await this.getOne(input.product,input.country,input.date, false, locale)) continue;
                if(typeof input.drums === 'string') input.drums = null;
                if(typeof input.volume === 'string') input.volume = null;
                await this.create(input);
                added++;
            }
            return added;
        } catch (error) {
            logError(error, 'PI6SD');
        }
    }

    /**
     * Función que programa la sincronización del servidor a media noche
     * 
     */
    static updateAtMidnight = async() => {
        const now = new Date();
        const night = new Date(now);
        night.setDate(now.getDate()+1);
        night.setHours(0, 0, 0, 0);
        const msToMidnight = night.getTime() - now.getTime();

        setTimeout(async() => {
            await this.syncData('en');
            await this.updateAtMidnight();
        }, msToMidnight)
    }
}

/**
 * Clase que administra las temporadas de cosechas de productos
 *
 * @class
 */
class Harvest {

    /**
     * Objeto con la definición de campos dependientes del lenguaje seleccionado
     * 
     * @type {Object}
     */
    static i18n_fields = {
        'country': i18n.Country,
        'fruitVariety': fruit.FruitVariety,
    }

    /**
     * Busca y devuelve una cosecha por su ID
     * 
     * @param {String} id ID de la cosecha
     * @param {String} locale Código ISO del lenguaje
     * @returns {Object}
     */
    static getById = async(id, locale) => {
        try {
            const u = `harvest:id=${id}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Harvest.findOne({
                where: {id},
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'HV1GI');
        }
    };

    /**
     * Busca y devuelve una cosecha buscando valores específicos
     * 
     * @param {String} fruitVarietyId ID de la variedad de fruta
     * @param {String} countryId ID del país origen
     * @param {String} month Més de cosecha (1-12)
     * @param {String} locale Código ISO del lenguaje
     * @returns {Object}
     */
    static getOne = async(fruitVarietyId, countryId, month, locale) => {
        try {
            const u = `harvest:fruitVariety=${fruitVarietyId}:country=${countryId}:month${month}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Harvest.findOne({
                where: {
                    fruitVarietyId,
                    countryId,
                    month
                },
            });
            if(data) data = resolve_i18n(data.get({plain: true}), this.i18n_fields, locale);
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch (error) {
            logError(error, 'HV2GO');
        }
    }

    /**
     * Procesa un filtro de SQL en formato string y lo transforma en un query Sequelize
     *
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @returns {Object}
     */
    static processFilter(filter) {
        let where = {};
        for(let x in filter) switch(x) {
            case 'fruitVariety':
                where.fruitVarietyId = {[Op.in]: filter.fruitVariety};
                break;
            case 'fruit':
                where['$fruitVariety.fruit_id$'] = {[Op.in]: filter.fruit};
                break;
            case 'country':
                where.countryId = {[Op.in]: filter.country};
                break;
            case 'month':
                where.month = {[Op.in]: filter.month};
                break;
        }
        return where;
    }

    /**
     * Cuenta cuantos precios hay en total dependiendo del filtro utilizado
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @returns {Int}
     */
    static count = async(filter) => {
        try {
            if(!filter) filter = {};
            const u = `harvest:count:filter=${JSON.stringify(filter)}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            let data = await model.Harvest.count({
                where: this.processFilter(filter)
            });
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'HV3C');
        }
    };

    /**
     * Devuelve la lista de tempporadas de cosechas
     * 
     * @param {Object} filter Filtro a utilizar en Sequelize
     * @param {Object} options Opciones de paginación
     * @param {String} locale Idioma seleccionado de la aplicación
     * @returns {Array}
     */ 
    static list = async(filter, options, locale) => {
        try {
            if(!filter) filter = {};
            if(!options) options = {};
            const u = `harvest:filter=${JSON.stringify(filter)}:options=${JSON.stringify(options)}:locale=${locale}`,
                cache = await redis.get(u);
            if(cache) return JSON.parse(cache);
            const query = {
                where: this.processFilter(filter),
                order: options.ord ? [[options.ord, options.asc ? 'ASC' : 'DESC'], ['month', 'ASC']] : [['month', 'ASC']],
                limit: options.num || baseConfig.defaultNum,
            }
            if(query.limit === -1) delete query.limit
            else query.offset = (options.pag || 0) * query.limit;
            let data = await model.Harvest.findAll(query).map(x => resolve_i18n(x.get({plain: true}), this.i18n_fields, locale));
            await redis.set(u, JSON.stringify(data));
            return data;
        } catch(error) {
            logError(error, 'HV4L');
        }
    };

    /**
     * Crea y devuelve una nueva temporada de cosecha
     * 
     * @param {Object} input Datos de la nueva entrada
     * @param {String} locale Idioma seleccionado de la aplicación
     * @returns {Array}
     */ 
    static create = async(input, locale) => {
        try {
            if(!input.id) input.id = cryptoRandomString({type: 'url-safe', length: 10});
            const prev = await this.getById(input.id, 'en');
            if(prev) throw new Error(`Ya existe una temporada de cosecha con el ID ${input.id}, use otro ID`);
            const _fruitVariety = await fruit.FruitVariety.getById(input.fruitVariety, locale);
            if(!_fruitVariety) throw new Error(`No existe la variedad de fruta ${input.fruitVariety}, favor de verificar`);
            input.fruitVarietyId = _fruitVariety.id;
            const _country = await i18n.Country.getById(input.country, locale);
            if(!_country) throw new Error(`No existe el país ${input.country}, favor de verificar`);
            input.countryId = _country.id;
            await model.Harvest.create(input);
            await destroyCache(`harvest:id=${input.id}*`);
            await destroyCache(`harvest*`);
            const data = await this.getById(input.id, locale);
            await pubsub.publish(`createdHarvest`, {
                createdHarvest: data
            });
            return data;
        } catch(error) {
            logError(error, 'HV5CR');
        }
    };

    /**
     * Procesa el texto proveniente del archivo Excel que contiene la variedad de fruta y la busca
     * 
     * @param {String} fruitName Texto con la fruta
     * @param {String} fruitVariety Texto con la variedad de fruta
     * @param {String} locale Idioma seleccionado de la aplicación
     * @returns {Object}
     */
    static getFruitId = async (fruitName, fruitVariety, locale) => {
        try {
            const _fruit = await fruit.Fruit.getByName(fruitName, locale);
            if(!_fruit) return '';
            if(fruitVariety === 'Persian /Tahiti') fruitVariety = 'Persian'; //Fix
            const _fruitVariety = await fruit.FruitVariety.getByName(fruitVariety, _fruit.id, locale);
            if(_fruitVariety) return _fruitVariety.id;
            const _prev = await fruit.FruitVariety.create({
                fruit: _fruit.id,
                nameEs: fruitVariety,
                nameEn: fruitVariety,
            });
            return _prev.id;
        } catch (error) {
            logError(error, 'HV7GFID')
        }
    }

    /**
     * Accede al archivo de Google Sheets donde se almacena la información de las cosechas,
     * la extrae y la almacena en la base de datos, devolviendo el número de registros
     * exitosos.
     * 
     * @param {String} locale Idioma seleccionado de la aplicación
     * @returns {Int}
     */
    static syncData = async(locale) => {
        try {
            const googleSheetsInstance = await googleSheets();
            const response = await googleSheetsInstance.spreadsheets.values.batchGet({
                spreadsheetId: "1R-z4BHC6czFpj7NTvOthuIMMojhys-0nhps9h4Z1Mro",
                ranges: ['Fruit Summary!B3:B', 'Fruit Summary!F3:F', 'Fruit Summary!G3:G', 'Fruit Summary!I3:I','Fruit Summary!J3:U'],
                majorDimension: 'ROWS',
                valueRenderOption: "UNFORMATTED_VALUE",
            });
            
            const data = response.data.valueRanges.map(result => result.values);
            const [countryRows, fruitRows, varietyRows, organicRows, monthsRows] = data;
            let added = 0;
            for (let index = 0; index < fruitRows.length; index++) {
                if(index >= monthsRows.length || index >= countryRows.length || index >= varietyRows.length || index >= organicRows.length) break;
                if(countryRows[index].length === 0) continue;
                if(fruitRows[index].length === 0) continue;
                if(varietyRows[index].length === 0) continue;
                if(monthsRows[index].length === 0) continue;
                const fruitVariety = await this.getFruitId(fruitRows[index][0], varietyRows[index][0], locale);
                if(fruitVariety === '') continue;
                const _country = await i18n.Country.getByName(countryRows[index][0], locale);
                if(!_country) continue;
                const country = _country.id;
                const organic = Boolean(organicRows[index].length > 0 && Number(organicRows[index]) === 1)
                for (let month = 1; month <= monthsRows[index].length; month++) {
                    if(monthsRows[index][month] !== 1) continue;
                    const input = {
                        month,
                        fruitVariety,
                        country,
                        organic,
                    }
                    if(await this.getOne(input.fruitVariety,input.country,month,locale)) continue;
                    await this.create(input, locale);
                    added++;
                }
            }
            return added;
        } catch (error) {
            logError(error, 'HV6SD');
        }
    }

    /**
     * Función que programa la sincronización del servidor a media noche
     * 
     */
     static updateAtMidnight = async() => {
        const now = new Date();
        const night = new Date(now);
        night.setDate(now.getDate()+1);
        night.setHours(0, 0, 0, 0);
        const msToMidnight = night.getTime() - now.getTime();

        setTimeout(async() => {
            await this.syncData('en');
            await this.updateAtMidnight();
        }, msToMidnight)
    }
}

module.exports = {
    Price,
    Harvest,
};
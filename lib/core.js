const Redis = require('ioredis'),
  wkx = require('wkx'),
  fetch = require('node-fetch'),
  url = require('url'),
  https = require('https'),
  Stream = require('stream').Transform,
  { Base64Encode } = require('base64-stream'),
  http = require('http'),
  querystring = require('querystring'),
  btoa = require('btoa'),
  { RedisPubSub } = require('graphql-redis-subscriptions'),
  Sequelize = require('sequelize'),
  mandrill_api = require('mandrill-api'),
  AWS = require('aws-sdk'),
  Op = Sequelize.Op,
  moment = require('moment-timezone'),
  cryptoRandomString = require('crypto-random-string'),
  { Expo } = require('expo-server-sdk'),
  { google } = require("googleapis"),
  FB = require('fb');

const env = process.env.NODE_ENV || 'development',
  redisConfig = require('../config/redis.json')[env],
  queueConfig = require('../config/queue.json')[env],
  dbConfig = require('../config/db.json')[env],
  mandrillConfig = require('../config/mandrill.json')[env],
  awsConfig = require('../config/aws.json')[env],
  corsConfig = require('../config/cors.json'),
  facebookConfig = require('../config/facebook.json'),
  ipStackConfig = require('../config/ipstack.json'),
  googleConfig = require('../config/google.json')[env],
  googleApiConfig = require('../config/googleapi.json')[env],
  baseConfig = require('../config/base.json')[env],
  stripeConfig = require('../config/stripe.json')[env],
  breadcrumbConfig = require('../config/breadcrumb.json');

/**
 * Modulo del core del sistema
 *
 * @module Core
 */

/**
 * Variable de uso de la zona horaria
 *
 * @type {String}
 */
process.env.TZ = baseConfig.timezone || 'UTC';

console.log('ENV', env);

FB.options({ appSecret: facebookConfig.appSecret });

const fb = FB.extend({
  version: facebookConfig.apiVersion,
  appId: facebookConfig.appId,
  appSecret: facebookConfig.appSecret,
  access_token: facebookConfig.clientToken
});

const stripe = require('stripe')(stripeConfig.secretKey);

// console.log('---',fb)

const redis = new Redis(redisConfig),
  queue = new Redis(queueConfig),
  subscriber = new Redis(redisConfig),
  publisher = new Redis(redisConfig);

const red = () => redis;

/**
 * Función para eliminar cache con redis mediante un patron de busqueda
 *
 * @param {String} pattern Patron de busqueda de la cache
 */
const destroyCache = async pattern => {
  const keys = await redis.keys(`${redisConfig.keyPrefix}${pattern}`),
    pipeline = redis.pipeline();
  keys.forEach(key => pipeline.del(key.replace(redisConfig.keyPrefix, '')));
  await pipeline.exec();
};

const pubsub = new RedisPubSub({
  publisher,
  subscriber
});
const db = new Sequelize(dbConfig);

let _mandrill = null;
const mandrill = () => {
  if (!_mandrill) _mandrill = new mandrill_api.Mandrill(mandrillConfig.key);
  return _mandrill;
};

let _s3 = null;
const s3 = () => {
  if (!_s3) {
    const s3Config = {
      endpoint: new AWS.Endpoint(awsConfig.endpoint),
      region: 'sfo2',
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey
    };
    _s3 = new AWS.S3(s3Config);
  }
  return _s3;
};

const getStaticMap = (
  origin,
  destination,
  indexOrigin,
  indexDestination,
  size = '400x400',
  center,
  markers,
  zoom = 5,
  region = 'mx',
  format = 'png'
) =>
  new Promise((resolve, reject) => {
    const data = querystring.stringify({
      size,
      center: `${origin}`,
      zoom,
      path: `color:0xff0000ff|weight:5|${origin}|${destination}`,
      region,
      format,
      key: googleConfig.apiKey
    });
    const req = https.request(
      {
        hostname: googleConfig.staticMap.hostname,
        port: 443,
        path: `${googleConfig.staticMap.endpoint}?${data}`,
        method: 'GET'
      },
      res => {
        let body = new Stream();
        res.setEncoding('binary');
        res.on('data', data => {
          body.push(data);
        });
        res.on('end', () => {
          resolve({
            headers: res.headers,
            body: res.pipe(new Base64Encode()).toString()
          });
        });
        res.on('error', error => {
          reject(error);
        });
      }
    );
    req.write(data);
    req.end();
  });

const getPlaceDetails = (place_id, language = 'es-419', fields = undefined) =>
  new Promise((resolve, reject) => {
    const data = querystring.stringify({
      place_id,
      language,
      key: googleConfig.apiKey
    });
    console.log(data);
    const req = https.request(
      {
        hostname: googleConfig.placeDetails.hostname,
        port: 443,
        path: `${googleConfig.placeDetails.endpoint}?${data}`,
        method: 'GET'
      },
      res => {
        let body = '';
        res.on('data', data => {
          body += data;
        });
        res.on('end', () => {
          body = JSON.parse(body);
          let { error } = body;
          if (error !== undefined) reject(error);
          else resolve(body);
        });
        res.on('error', error => {
          reject(error);
        });
      }
    );
    req.write(data);
    req.end();
  });

const searchGooglePlaces = (
  input,
  fields = ['name', 'photos', 'place_id'],
  location = null
) =>
  new Promise((resolve, reject) => {
    const data = querystring.stringify({
      input,
      inputtype: 'textquery',
      key: googleConfig.apiKey,
      fields: fields.join(','),
      locationbias: location ? `point:${location.join(',')}` : null
    });
    const req = https.request(
      {
        hostname: googleConfig.searchPlaces.hostname,
        port: 443,
        path: `${googleConfig.searchPlaces.endpoint}?${data}`,
        method: 'GET'
      },
      res => {
        let body = '';
        res.on('data', data => {
          body += data;
        });
        res.on('end', () => {
          body = JSON.parse(body);
          let { error } = body;
          if (error !== undefined) reject(error);
          else resolve(body);
        });
        res.on('error', error => {
          reject(error);
        });
      }
    );
    req.write(data);
    req.end();
  });

const getPlacePhoto = (
  photoreference,
  maxwidth = undefined,
  maxheight = undefined
) =>
  new Promise((resolve, reject) => {
    const data = querystring.stringify({
      photoreference,
      maxwidth,
      maxheight,
      key: googleConfig.apiKey
    });
    const req = https.request(
      {
        hostname: googleConfig.placePhoto.hostname,
        port: 443,
        path: `${googleConfig.placePhoto.endpoint}?${data}`,
        method: 'GET'
      },
      res => {
        if (!res.headers.location) {
          return reject(new Error('Error al obtener imagen'));
        }
        resolve(res.headers.location);
      }
    );
    req.write(data);
    req.end();
  });

const getGoogleDirections = (
  origin,
  destination,
  departure_time = null,
  waypoints,
  region = 'mx',
  language = 'es-419',
  unit = 'metric'
) =>
  new Promise((resolve, reject) => {
    const data = querystring.stringify({
      origin,
      destination,
      departure_time: departure_time
        ? parseInt((new Date(departure_time).getTime() / 1000).toFixed(0))
        : null,
      waypoints,
      region,
      language,
      unit,
      key: googleConfig.apiKey
    });
    const req = https.request(
      {
        hostname: googleConfig.directions.hostname,
        port: 443,
        path: `${googleConfig.directions.endpoint}?${data}`,
        method: 'GET'
      },
      res => {
        let body = '';
        res.on('data', data => {
          body += data;
        });
        res.on('end', () => {
          body = JSON.parse(body);
          let { error } = body;
          if (error !== undefined) reject(error);
          else resolve(body);
        });
        res.on('error', error => {
          reject(error);
        });
      }
    );
    req.write(data);
    req.end();
  });

const snap2roads = (path, interpolate = true) =>
  new Promise((resolve, reject) => {
    const data = querystring.stringify({
      path: path.join('|'),
      interpolate: interpolate ? 'true' : 'false',
      key: breadcrumbConfig.apiKey
    });
    const req = https.request(
      {
        hostname: breadcrumbConfig.apiHost,
        port: 443,
        path: `${breadcrumbConfig.apiRoot}?${data}`,
        method: 'GET'
      },
      res => {
        let body = '';
        res.on('data', data => {
          body += data;
        });
        res.on('end', () => {
          body = JSON.parse(body);
          let { error } = body;
          if (error !== undefined) reject(error);
          else resolve(body);
        });
        res.on('error', error => {
          reject(error);
        });
      }
    );
    req.write(data);
    req.end();
  });

const getGoogleDistanceMatrix = (placeId_A, placeId_B, language = 'es') =>
  new Promise((resolve, reject) => {
    const data = querystring.stringify({
      origins: `place_id:${placeId_A}`,
      destinations: `place_id:${placeId_B}`,
      key: breadcrumbConfig.apiKey,
      language
    });
    const req = https.request(
      {
        hostname: googleConfig.distanceMatrix.hostname,
        port: 443,
        path: `${googleConfig.distanceMatrix.endpoint}?${data}`,
        method: 'GET'
      },
      res => {
        let body = '';
        res.on('data', data => {
          body += data;
        });
        res.on('end', () => {
          body = JSON.parse(body);
          let { error } = body;
          if (error !== undefined) reject(error);
          else resolve(body);
        });
        res.on('error', error => {
          reject(error);
        });
      }
    );
    req.write(data);
    req.end();
  });

/**
 * Función para validar clave captcha con servidor de Google
 *
 * @param {String} response Captcha generada
 * @param {String} remoteAddress Dirección remota
 * @returns {Object}
 */
const recaptcha = (response, remoteAddress) => {
  return new Promise((resolve, reject) => {
    const data = querystring.stringify({
      secret: googleConfig.recaptcha.secretKey,
      response,
      remoteip: remoteAddress
    });
    const req = https.request(
      {
        hostname: 'www.google.com',
        port: 443,
        path: `/recaptcha/api/siteverify`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': data.length
        }
      },
      res => {
        let body = '';
        res.on('data', data => {
          body += data;
        });
        res.on('end', () => {
          body = JSON.parse(body);
          let { error } = body;
          if (error !== undefined) reject(error);
          else resolve(body);
        });
        res.on('error', error => {
          reject(error);
        });
      }
    );
    req.write(data);
    req.end();
  });
};

const ipstack = remoteAddress => {
  return new Promise((resolve, reject) => {
    const args = Object.keys(ipStackConfig.params)
      .map(key => `${key}=${ipStackConfig.params[key]}`)
      .join('&');
    https.get(
      {
        hostname: 'api.ipstack.com',
        port: 443,
        path: `/${remoteAddress}?access_key=${ipStackConfig.accessKey}${args
          ? `&${args}`
          : ''}`,
        agent: false
      },
      res => {
        let body = '';
        res.on('data', data => {
          body += data;
        });
        res.on('end', () => {
          body = JSON.parse(body);
          let { error } = body;
          if (error !== undefined) reject(error);
          else resolve(body);
        });
        res.on('error', error => {
          reject(error);
        });
      }
    );
  });
};

/**
 * Función que regresa valores de localización de acuerdo a dirección IP
 *
 * @param {String} remoteAddress Dirección remota
 * @returns {Object}
 */
const ip_api = remoteAddress =>
  new Promise((resolve, reject) => {
    http.get(
      {
        hostname: 'ip-api.com',
        port: 80,
        path: `/json/${remoteAddress}`,
        agent: false
      },
      res => {
        let body = '';
        res.on('data', data => {
          body += data;
        });
        res.on('end', () => {
          body = JSON.parse(body);
          let { error } = body;
          if (error !== undefined) reject(error);
          else resolve(body);
        });
        res.on('error', error => {
          reject(error);
        });
      }
    );
  });

const expo = new Expo({});

/**
 * Función que transforma los cookies de texto a un objeto de facil lectura por la máquina
 *
 * @param {String} queryString cookies
 * @returns {Object}
 */
const parseCookieHeader = queryString => {
  let query = {};
  let pairs = (queryString[0] === '?'
    ? queryString.substr(1)
    : queryString).split('; ');
  for (let i = 0; i < pairs.length; i++) {
    let pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
};

/**
 * Función que procesa un filtro de SQL en formato string y lo transforma en un query Sequelize
 *
 * @param {Object} filter Filtro a utilizar en Sequelize {query, id}
 * @returns {Object}
 */
const processFilter = filter => {
  let where = {};
  for (let x in filter) {
    switch (x) {
      case 'query':
        let query = filter.query
          .trim()
          .split(' ')
          .map(query => ({ [Op.like]: `%${query}%` }));
        where.name = { [Op.or]: query };
        break;
      case 'id':
        where.id = { [Op.in]: filter.id.split(',') };
        break;
    }
  }
  return where;
};

const hexToBase64 = str => {
  return btoa(
    String.fromCharCode.apply(
      null,
      str
        .replace(/\r|\n/g, '')
        .replace(/([\da-fA-F]{2}) ?/g, '0x$1 ')
        .replace(/ +$/, '')
        .split(' ')
    )
  );
};

/**
 * Función que imprime error en consola
 *
 * @param {String} error Mensaje de error
 * @param {String} errorId Código de error
 * @returns {Object}
 */
const logError = (error, errorId) => {
  const tracebackId = cryptoRandomString({
    length: 12,
    type: 'hex'
  }).toUpperCase();
  console.error(`[${new Date().toJSON()}]: ${errorId}/${tracebackId}`, error);
  throw new Error(`${errorId}/${tracebackId}`);
};

Sequelize.GEOMETRY.prototype._stringify = function _stringify (value, options) {
  return `ST_GeomFromText(${options.escape(
    wkx.Geometry.parseGeoJSON(value).toWkt()
  )})`;
};
Sequelize.GEOMETRY.prototype._bindParam = function _bindParam (value, options) {
  return `ST_GeomFromText(${options.bindParam(
    wkx.Geometry.parseGeoJSON(value).toWkt()
  )})`;
};
Sequelize.GEOGRAPHY.prototype._stringify = function _stringify (value, options) {
  return `ST_GeomFromText(${options.escape(
    wkx.Geometry.parseGeoJSON(value).toWkt()
  )})`;
};
Sequelize.GEOGRAPHY.prototype._bindParam = function _bindParam (value, options) {
  return `ST_GeomFromText(${options.bindParam(
    wkx.Geometry.parseGeoJSON(value).toWkt()
  )})`;
};

/**
 * Función que obtiene el tiempo actual
 *
 * @param {Integer} date Valor de fecha en formato Excel
 * @returns {Date}
 */
const getTime = () => moment().tz('UTC');

/**
 * Función que procesa un filtro de SQL en formato string y lo transforma en un query Sequelize
 *
 * @param {Object} filter Filtro a utilizar en Sequelize {query, id, exclude}
 * @returns {Object}
 */
const defaultFilter = filter => {
  let where = {};
  for (let x in filter) {
    switch (x) {
      case 'query':
        where = {
          ...where,
          [Op.and]: filter.query.trim().split(' ').map(query => ({
            [Op.or]: [
              {
                name: {
                  [Op.like]: `%${query}%`
                }
              }
            ]
          }))
        };
        break;
      case 'id':
        if (filter.id) {
          if (filter.id.length > 0) where.id = { [Op.in]: filter.id };
        }
        break;
      case 'exclude':
        if (filter.exclude) {
          if (filter.exclude.length > 0) {
            where.id = { [Op.notIn]: filter.exclude };
          }
        }
        break;
    }
  }
  return where;
};

/**
 * Función que regresa la conexión con la API de Google Sheets
 *
 * @returns {sheets_v4.Sheets}
 */
const googleSheets = async() => {
  const googleAuth = new google.auth.GoogleAuth({
    credentials: {
      client_email: googleApiConfig.client_email,
      private_key: googleApiConfig.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"], 
  });

  const googleClient = await googleAuth.getClient();

  const googleSheetsInstance = google.sheets({
    version: "v4",
    auth: googleAuth,
  });

  return googleSheetsInstance
}

/**
 * Función que convierte una fecha en formato Excel a JS
 *
 * @param {Integer} date Valor de fecha en formato Excel
 * @returns {Date}
 */
const ExcelDateToJSDate = (date) => {
  return new Date(Math.round((date - 25568)*86400*1000));
}

/**
 * Devuelve el url de la imagen de drive
 * 
 * @param {String | null} driveImage 
 * @returns Url de imagen
 */
const DriveImageToURL = (driveImage) => {
  //https://drive.google.com/file/d/1k7AzjUZvtm4jVxIiuxija2h8J420aSbf/view?usp=share_link
  if(!driveImage?.startsWith('https://drive.google.com/file/d/')) return driveImage
  const trimmed = driveImage.replace('https://drive.google.com/file/d/', '')
  const id = trimmed.split('/')[0]
  return `https://drive.google.com/uc?export=view&id=${id}`
}

/**
 * Función que entrega los resultados de una consulta a la BD en el lenguaje preferido por el usuario
 *
 * @param {Object} data Información obtenida de la BD
 * @param {Object} fields Campos a modificar dependiendo del idioma seleccionado
 * @param {String} locale Código ISO del idioma preferido
 * @returns {Object} Información procesada de acuerdo al lenguaje seleccionado
 */
const resolve_i18n = (data, fields, locale = baseConfig.defaultLocale) => {
  if (!data) return null;
  const isArray = Array.isArray(data),
      _data = isArray ? data : [data];
  const result = _data.map(element => {
      Object.keys(fields).forEach(key => {
          if (typeof fields[key] !== 'string') {
              element[key] = resolve_i18n(element[key], fields[key].i18n_fields, locale);
          } else {
              const _locale = `${locale[0].toUpperCase()}${locale[1]}`;
              element[key] = element[`${fields[key]}${_locale}`]
          }
      });
      return element
  });
  return isArray ? result : result[0];
};

module.exports = {
  db,
  red,
  redis,
  queue,
  publisher,
  subscriber,
  pubsub,
  parseURIQuery: parseCookieHeader,
  hexToBase64,
  logError,
  breadcrumbConfig,
  mandrill,
  s3,
  ipstack,
  processFilter,
  destroyCache,
  env,
  corsConfig,
  getTime,
  recaptcha,
  googleConfig,
  defaultFilter,
  snap2roads,
  getGoogleDirections,
  getPlaceDetails,
  getPlacePhoto,
  searchGooglePlaces,
  getStaticMap,
  baseConfig,
  redisConfig,
  dbConfig,
  mandrillConfig,
  s3Config: awsConfig,
  ipStackConfig,
  queueConfig,
  ip_api,
  facebookConfig,
  fb,
  expo,
  Expo,
  stripe,
  stripeConfig,
  getGoogleDistanceMatrix,
  googleSheets,
  ExcelDateToJSDate,
  DriveImageToURL,
  resolve_i18n,
};

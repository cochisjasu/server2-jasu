#! /usr/local/bin/node
const i18n = require('../models/i18n'),
    timezone = require('../models/timezone'),
    file = require('../models/file'),
    user = require('../models/user'),
    product = require('../models/product'),
    price = require('../models/price'),
    session = require('../models/session'),
    {dbConfig} = require('../lib/core'),
    {createConnection} = require("mysql2/promise.js");

/**
 * Modulo que contiene la definición de las funciones
 * para la sincronización con la base de datos.
 *
 * @module Sync
 */

/**
 * Función sincroniza las definiciones de tablas con
 * las bases de datos.
 *
 * @param {String} name Nombre del archivo
 * @returns {Object}
 */
const syncAll = async () => {
    const connection = await createConnection({
        host: dbConfig.host,
        user: dbConfig.username,
        port: dbConfig.port,
        password: dbConfig.password,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${'' + dbConfig.database + ''}`);

    await i18n.sync();
    await timezone.sync();
    await file.sync();
    await user.sync();
    await session.sync();
    await product.sync();
    await price.sync();
    connection.end();
};

syncAll()
    .catch(error => console.error(error))
    .then(() => console.log('All tables synced'))
    .finally(() => process.exit(0));

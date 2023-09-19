#!/usr/local/bin/node
const file = require('../models/file'),
    i18n = require('../models/i18n'),
    timezone = require('../models/timezone'),
    session = require('../models/session'),
    path = require('path'),
    product = require('../models/product'),
    fs = require('fs');

/**
 * Modulo que contiene las funciones para el llenado de la
 * base de datos.
 *
 * @module Populate
 */

/**
 * Variable que contiene las definiciones de las tablas a
 * llenar en la base de datos.
 *
 * @type {Array}
 */

let populators = [
    {
        // Locales
        model: i18n.Locale,
        name: 'locales'
    },
    {
        // Country
        model: i18n.Country,
        name: 'countries'
    },
    {
        // Region
        model: i18n.Region,
        name: 'regions'
    },
    {
        // Timezone
        model: timezone.Timezone,
        name: 'timezones'
    },
    {
        //File Statuses
        model: file.FileStatus,
        name: 'file_statuses'
    },
    {
        //File Classes
        model: file.FileClass,
        name: 'file_classes'
    },
    {
        //File Types
        model: file.FileType,
        name: 'file_types'
    },
    {
        // RemoteAddress whitelist & blacklist
        model: session.RemoteAddress,
        name: 'remote_addresses'
    },
];

/**
 * Función que lee el archivo JSON con los datos a subir a
 * la base de datos.
 *
 * @param {String} name Nombre del archivo
 * @returns {Object}
 */
const loadSeed = (name) => {
    const filePath = path.join(__dirname, `../seeds/${name}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

/**
 * Función que construye los elementos necesarios para
 * la inserción de los datos iniciales a la base de datos
 *
 * @returns {Object}
 */
const buildPopulators = () => {
    const structure = loadSeed('index');
    for (let { name, verifyProperty } of structure) {
        const data = loadSeed(name);
        populators = populators.map(p => {
            if (p.name === name) return {
                model: p.model,
                verifyProperty,
                data
            }
            else return p;
        });
    }
};

buildPopulators();
let x = 0;

/**
 * Función que itera entre las tablas a llenar de la base de datos
 *
 */
const nextPopulator = () => {
    if (x >= populators.length) {
        console.log('Population terminated');
        process.exit(0);
        return;
    }
    let populator = populators[x],
        new_data = [],
        y = 0;

    /**
     * Función encargada de insertar los datos en la tabla
     * deseada de la base de datos
     *
     */
    const insertData = () => {
        populator.model.bulkCreate(new_data).then(() => {
            console.log(`Inserted ${new_data.length} items in ${populator.model.name}`);
        }).catch(error => {
            console.dir(error);
        }).finally(() => {
            x++;
            nextPopulator();
        });
    }

    /**
     * Función que itera entre los registros de la semilla, validando
     * si se encuentra ya en la base de datos antes de insertarlo
     *
     */
    const sig = () => {
        if (y >= populator.data.length) return insertData();
        let item = populator.data[y],
            where = {};
        where[populator.verifyProperty] = item[populator.verifyProperty];
        populator.model.findOne({where}).then((data) => {
            if (!data) new_data.push(item);
        }).catch(error => {
            console.dir(error);
        }).finally(() => {
            y++;
            sig();
        });
    }

    sig();
}

console.log('Populating DB');
nextPopulator();

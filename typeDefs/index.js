const path = require('path'),
    { fileLoader, mergeTypes } = require('merge-graphql-schemas');

const typesArray = fileLoader(path.join(__dirname, "./"));

module.exports = mergeTypes(typesArray);

const path = require('path'),
    { fileLoader } = require('merge-graphql-schemas');

module.exports = fileLoader(path.join(__dirname, './**/*.resolver.*'));
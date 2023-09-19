const core = require('./lib/core'),
    i18n = require('./lib/i18n'),
    timezone = require('./lib/timezone'),
    mail = require('./lib/mail'),
    user = require('./lib/user'),
    file = require('./lib/file'),
    category = require('./lib/category'),
    fruit = require('./lib/fruit'),
    product = require('./lib/product'),
    price = require('./lib/price'),
    contact = require('./lib/contact'),
    session = require('./lib/session');

module.exports = {
    core, i18n, timezone, mail, user, file, category, fruit, session, product, price, contact
};

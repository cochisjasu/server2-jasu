const Sequelize = require("sequelize");
const core = require('../lib/core');

class Locale extends Sequelize.Model {
}

Locale.init({
    id: {
        type: Sequelize.STRING(2),
        primaryKey: true
    },
    nativeName: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
}, {
    sequelize: core.db
});
exports.Locale = Locale;

class Country extends Sequelize.Model {
}

Country.init({
    id: {
        type: Sequelize.STRING(6),
        primaryKey: true
    },
    nameEs: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
    nameEn: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
    dialCode: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
    },
    payPalAccepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    cardsAccepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    lsId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: true
    },
}, {
    sequelize: core.db,
    defaultScope: {
        include: [
            {
                model: Locale,
                as: 'defaultLocale',
                required: true,
            },
        ]
    },
});
Country.belongsTo(Locale, {
    as: 'defaultLocale',
    foreignKey: {
        name: 'defaultLocaleId',
        allowNull: false,
    },
});

exports.Country = Country;

class Region extends Sequelize.Model {
}

Region.init({
    id: {
        type: Sequelize.STRING(50),
        primaryKey: true
    },
    nameEs: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
    nameEn: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
}, {
    sequelize: core.db,
    defaultScope: {
        include: [
            {
                model: Country,
                as: 'country',
                required: true
            }
        ]
    }
});
Region.belongsTo(Country, {
    as: 'country',
    foreignKey: 'countryId'
});
exports.Region = Region;

exports.sync = async (options = {force: false, alter: true}) => {
    console.log('i18n SYNC');
    await Locale.sync(options);
    await Country.sync(options);
    await Region.sync(options);
};

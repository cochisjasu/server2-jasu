const Sequelize = require("sequelize"),
    core = require('../lib/core'),
    i18n = require('./i18n'),
    product = require('./product');

class Price extends Sequelize.Model {
}

class Harvest extends Sequelize.Model {
}

Price.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true,
    },
    date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
    },
    price: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false,
    },
    drums: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
    volume: {
        type: Sequelize.DECIMAL(15,1),
        allowNull: true,
    },
    organic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
    },
}, {
    sequelize: core.db,
    indexes:[{
        fields : ['product_id', 'country_id', 'date'],
        unique: true,
    }],
    scopes: {
        default: {
            include: [
                {
                    model: product.Product.scope('default'),
                    as: 'product',
                    required: true,
                },
                {
                    model: i18n.Country,
                    as: 'country',
                    required: false,
                },
            ]
        },
        count: {
            include: [
                {
                    model: product.Product.scope('prices'),
                    as: 'product',
                    required: true,
                },
            ]
        }
    }
})
Price.belongsTo(product.Product, {
    as: 'product',
    foreignKey: {
        name: 'productId',
        allowNull: false,
    },
    onDelete: 'CASCADE'
});
Price.belongsTo(i18n.Country, {
    as: 'country',
    foreignKey: {
        name: 'countryId',
        allowNull: true,
    },
});

Harvest.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true,
    },
    month: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    organic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
    },
}, {
    sequelize: core.db,
    defaultScope: {
        include: [
            {
                model: product.FruitVariety.scope('default'),
                as: 'fruitVariety',
                required: true,
            },
            {
                model: i18n.Country,
                as: 'country',
                required: true,
            },
        ]
    }
})
Harvest.belongsTo(product.FruitVariety, {
    as: 'fruitVariety',
    foreignKey: {
        name: 'fruitVarietyId',
        allowNull: false,
    },
    onDelete: 'CASCADE'
});
Harvest.belongsTo(i18n.Country, {
    as: 'country',
    foreignKey: {
        name: 'countryId',
        allowNull: false,
    },
});

exports.Price = Price;
exports.Harvest = Harvest;
exports.sync = async (options = {force: false, alter: true}) => {
    console.log('price SYNC');
    await Price.sync(options);
    await Harvest.sync(options);
};

exports.truncate = async(options = {cascade: true, restartIdentity: true, force: true}) => {
    await Price.truncate(options);
    await Harvest.truncate(options);
}
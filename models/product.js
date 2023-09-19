const Sequelize = require('sequelize');
const core = require('../lib/core');

class FruitCategory extends Sequelize.Model {}
class Fruit extends Sequelize.Model {}
class FruitVariety extends Sequelize.Model {}
class PresentationCategory extends Sequelize.Model {}
class Presentation extends Sequelize.Model {}
class Product extends Sequelize.Model {}
class ProductFile extends Sequelize.Model {}

FruitCategory.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true,
    },
    nameEs: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
    },
    nameEn: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
    },
}, {
    sequelize: core.db,
})

Fruit.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true,
    },
    nameEs: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
    },
    nameEn: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
    },
    picture: {
        type: Sequelize.TEXT('tiny'),
    },
    descriptionEs: {
        type: Sequelize.TEXT,
    },
    descriptionEn: {
        type: Sequelize.TEXT,
    },
}, {
    sequelize: core.db,
    scopes: {
        default: {
            include: [
                {
                    model: FruitCategory,
                    as: 'category',
                    required: true,
                },
            ]
        }
    }
});

FruitVariety.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true,
    },
    nameEs: {
        type: Sequelize.STRING(40),
        allowNull: false,
    },
    nameEn: {
        type: Sequelize.STRING(40),
        allowNull: false,
    },
    fullNameEs: {
        type: Sequelize.VIRTUAL,
        get() {
            const _fruit = this.getDataValue('fruit')?.getDataValue('nameEs') || this.getDataValue('nameEs');
            const _variety = this.getDataValue('nameEs');
            if(_fruit == _variety) return _variety;
            return `${_fruit} ${_variety}`;
        }
    },
    fullNameEn: {
        type: Sequelize.VIRTUAL,
        get() {
            const _fruit = this.getDataValue('fruit')?.getDataValue('nameEn') || this.getDataValue('nameEn');
            const _variety = this.getDataValue('nameEn');
            if(_fruit == _variety) return _variety;
            return `${_fruit} ${_variety}`;
        }
    },
    picture: {
        type: Sequelize.TEXT('tiny'),
    },
    descriptionEs: {
        type: Sequelize.TEXT
    },
    descriptionEn: {
        type: Sequelize.TEXT,
    }
}, {
    sequelize: core.db,
    scopes: {
        default: {
            include: [
                {
                    model: Fruit,
                    as: 'fruit',
                    required: true,
                },
                {
                    model: Product,
                    as: 'products',
                    required: true,
                }
            ]
        },
        sync: {
            include: [
                {
                    model: Fruit,
                    as: 'fruit',
                    required: true,
                }
            ]
        },
        count: {
            include: [
                {
                    model: Fruit,
                    as: 'fruit',
                    required: true,
                    attributes: [],
                },
                {
                    model: Product,
                    as: 'products',
                    required: true,
                    attributes: [],
                }
            ]
        }
    }
});

PresentationCategory.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true,
    },
    nameEs: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
    },
    nameEn: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
    },
}, {
    sequelize: core.db,
})

Presentation.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true,
    },
    nameEs: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
    },
    nameEn: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
    },
    picture: {
        type: Sequelize.TEXT('tiny'),
        allowNull: false,
    },
    descriptionEs: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
    descriptionEn: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
}, {
    sequelize: core.db,
    scopes: {
        default: {
            include: [
                {
                    model: PresentationCategory,
                    as: 'category',
                    required: true,
                },
            ]
        }
    }
});

Product.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true,
    },
    descriptionEs: {
        type: Sequelize.STRING(500),
        allowNull: false,
    },
    descriptionEn: {
        type: Sequelize.STRING(500),
        allowNull: false,
    },
    picture: {
        type: Sequelize.TEXT('tiny'),
        allowNull: false,
    },
    shelfLifeEs: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: '',
    },
    shelfLifeEn: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: '',
    },
}, {
    sequelize: core.db,
    scopes: {
        default: {
            include: [
                {
                    model: FruitVariety.scope('default'),
                    as: 'fruitVariety',
                    required: true,
                },
                {
                    model: Presentation.scope('default'),
                    as: 'presentation',
                    required: true,
                },
            ]
        },
        specs: {
            include: [
                {
                    model: FruitVariety.scope('default'),
                    as: 'fruitVariety',
                    required: true,
                },
                {
                    model: Presentation,
                    as: 'presentation',
                    required: true,
                },
                {
                    model: ProductFile,
                    as: 'productFiles'
                }
            ]
        },
        count: {
            
        },
        prices: {
            include: [
                {
                    model: FruitVariety,
                    as: 'fruitVariety',
                    required: true,
                },
                {
                    model: Presentation,
                    as: 'presentation',
                    required: true,
                },
            ]
        }
    }
});


ProductFile.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true,
    },
    nameEs: {
        type: Sequelize.STRING(100),
        allowNull: false,
    },
    nameEn: {
        type: Sequelize.STRING(100),
        allowNull: false,
    },
    urlEs: {
        type: Sequelize.TEXT('tiny'),
        allowNull: false,
    },
    urlEn: {
        type: Sequelize.TEXT('tiny'),
        allowNull: false,
    },
}, {
    sequelize: core.db,
});

Fruit.belongsTo(FruitCategory, {
    as: 'category',
    foreignKey: {
        name: 'categoryId',
        allowNull: false,
    },
    onDelete: 'CASCADE'
});

FruitVariety.belongsTo(Fruit, {
    as: 'fruit',
    foreignKey: {
        name: 'fruitId',
        allowNull: false,
    },
    onDelete: 'CASCADE',
});
Fruit.hasMany(FruitVariety, {as:'varieties', foreignKey:{name:'fruitId', allowNull: false}, onDelete: 'CASCADE'})

Presentation.belongsTo(PresentationCategory, {
    as: 'category',
    foreignKey: {
        name: 'categoryId',
        allowNull: false,
    },
    onDelete: 'CASCADE'
});

Product.belongsTo(FruitVariety, {
    as: 'fruitVariety',
    foreignKey: {
        name: 'fruitVarietyId',
        allowNull: false,
    },
    onDelete: 'CASCADE',
});
Product.belongsTo(Presentation, {
    as: 'presentation',
    foreignKey: {
        name: 'presentationId',
        allowNull: false,
    },
    onDelete: 'CASCADE',
});
FruitVariety.hasMany(Product, {as: 'products', foreignKey: {name:'fruitVarietyId', allowNull: false}})

ProductFile.belongsTo(Product, {
    as: 'product',
    foreignKey: {
        name: 'productId',
        allowNull: false,
    },
    onDelete: 'CASCADE',
});
Product.hasMany(ProductFile, {
    as: 'productFiles',
    foreignKey: {
        name: 'productId',
        allowNull: false,
    },
    onDelete: 'CASCADE'
})

exports.FruitCategory = FruitCategory;
exports.Fruit = Fruit;
exports.FruitVariety = FruitVariety;
exports.PresentationCategory = PresentationCategory;
exports.Presentation = Presentation;
exports.Product = Product;
exports.ProductFile = ProductFile;
exports.sync = async (options = {force: false, alter: true}) => {
    console.log('product SYNC');
    await FruitCategory.sync(options);
    await Fruit.sync(options);
    await FruitVariety.sync(options);
    await PresentationCategory.sync(options);
    await Presentation.sync(options);
    await Product.sync(options);
    await ProductFile.sync(options);
};

exports.truncate = async(options = {cascade: true, restartIdentity: true, force: true}) => {
    await core.db.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    await ProductFile.truncate(options); 
    await Product.truncate(options);
    await Presentation.truncate(options);
    await PresentationCategory.truncate(options);
    await FruitVariety.truncate(options);
    await Fruit.truncate(options);
    await FruitCategory.truncate(options);
    await core.db.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
}
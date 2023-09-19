const Sequelize = require('sequelize'),
    core = require('../lib/core');

class User extends Sequelize.Model {
}

User.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true
    },
    firstName: {
        type: Sequelize.STRING(40),
        allowNull: false
    },
    lastName: {
        type: Sequelize.STRING(40),
        allowNull: false
    },
    fullName: {
        type: Sequelize.VIRTUAL,
        get() {
            return `${this.getDataValue('firstName')} ${this.getDataValue('lastName')}`
        }
    },
    email: {
        type: Sequelize.STRING(128),
        unique: true,
        allowNull: false
    },
    companyName: {
        type: Sequelize.STRING(40),
        allowNull: false
    },
    companyWebsite: {
        type: Sequelize.STRING(128),
        allowNull: false
    },
    validated: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    connected: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    connectedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
    },
    disconnectedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    sequelize: core.db,
    timestamps: true,
    paranoid: true,
    defaultScope: {
        include: [

        ]
    }
});
exports.User = User;

class UserPassword extends Sequelize.Model {
}

UserPassword.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    passwordData: {
        type: Sequelize.STRING(64),
        allowNull: false
    }
}, {
    sequelize: core.db,
    timestamps: true
});
UserPassword.belongsTo(User, {
    as: 'user',
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
exports.UserPassword = UserPassword;

exports.sync = async (options = {force: false, alter: true}) => {
    console.log('user SYNC');
    await User.sync(options);
    await UserPassword.sync(options);
};

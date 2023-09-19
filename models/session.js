const Sequelize = require("sequelize"),
    core = require('../lib/core'),
    i18n = require('./i18n'),
    timezone = require('./timezone'),
    user = require('./user');

class ClientOS extends Sequelize.Model {}
ClientOS.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: false
    },
}, {
    sequelize: core.db
});
exports.ClientOS = ClientOS;

class ClientBrowser extends Sequelize.Model {}
ClientBrowser.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: false
    }
}, {
    sequelize: core.db
});
exports.ClientBrowser = ClientBrowser;

class ClientPlatform extends Sequelize.Model {}
ClientPlatform.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: false
    },
}, {
    sequelize: core.db
});
exports.ClientPlatform = ClientPlatform;


class AgentSession extends Sequelize.Model {}
AgentSession.init({
    id: {
        type: Sequelize.STRING(36),
        primaryKey: true
    },
    clientBrowserVersion: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null
    },
    isBot: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    isMobile: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    isTablet: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    isDesktop: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    isSmartTv: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    sequelize: core.db,
    timestamps: true,
    defaultScope: {
        include: [
            {
                model: timezone.Timezone,
                as: 'timezone',
                required: true
            },
            {
                model: i18n.Locale,
                as: 'locale',
                required: true
            },
            {
                model: ClientOS,
                as: 'clientOs',
                required: true
            },
            {
                model: ClientBrowser,
                as: 'clientBrowser',
                required: true
            },
            {
                model: ClientPlatform,
                as: 'clientPlatform',
                required: true
            }
        ]
    }
});
AgentSession.belongsTo(i18n.Locale, {
    as: 'locale',
    foreignKey: {
        name: 'localeId',
        allowNull: true,
        defaultValue: 'en'
    }
});
AgentSession.belongsTo(timezone.Timezone, {
    as: 'timezone',
    foreignKey: 'timezoneId'
});
AgentSession.belongsTo(ClientOS, {
    as: 'clientOs',
    foreignKey: 'clientOsId'
});
AgentSession.belongsTo(ClientBrowser, {
    as: 'clientBrowser',
    foreignKey: 'clientBrowserId'
});
AgentSession.belongsTo(ClientPlatform, {
    as: 'clientPlatform',
    foreignKey: 'clientPlatformId'
});
exports.AgentSession = AgentSession;


class RemoteAddress extends Sequelize.Model {}
RemoteAddress.init({
    id: {
        type: Sequelize.STRING(45),
        primaryKey: true,
        allowNull: true
    },
    type: {
        type: Sequelize.ENUM('ipv4', 'ipv6'),
        allowNull: false,
        defaultValue: 'ipv4'
    },
    city: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null
    },
    zipCode: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null
    },
    whiteList: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    greyList: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    blackList: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    sequelize: core.db,
    timestamps: true,
    defaultScope: {
        include: [
            {
                model: timezone.Timezone,
                as: 'timezone',
                required: false
            },
            {
                model: i18n.Region,
                as: 'region',
                required: false
            },
            {
                model: i18n.Country,
                as: 'country',
                required: false
            }
        ]
    }
});
RemoteAddress.belongsTo(timezone.Timezone, {
    as: 'timezone',
    foreignKey: 'timezoneId'
});
RemoteAddress.belongsTo(i18n.Country, {
    as: 'country',
    foreignKey: 'countryId'
});
RemoteAddress.belongsTo(i18n.Region, {
    as: 'region',
    foreignKey: 'regionId'
});
exports.RemoteAddress = RemoteAddress;


class RemoteSession extends Sequelize.Model {}
RemoteSession.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true
    },
    isDst: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    sequelize: core.db,
    timestamps: true,
    defaultScope: {
        include: [
            {
                model: RemoteAddress,
                as: 'remoteAddress',
                required: true
            }
        ]
    }
});
RemoteSession.belongsTo(AgentSession, {
    as: 'agent',
    foreignKey: 'agentId'
});
RemoteSession.belongsTo(RemoteAddress, {
    as: 'remoteAddress',
    foreignKey: 'remoteAddressId',
    allowNull: false
});
exports.RemoteSession = RemoteSession;


class Session extends Sequelize.Model {}
Session.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true
    },
    loggedOutAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
    },
    connected: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    sequelize: core.db,
    timestamps: true,
    defaultScope: {
        include: [
            {
                model: user.User,
                as: 'user',
                required: true
            }
        ]
    }
});
Session.belongsTo(user.User, {
    as: 'user',
    foreignKey: 'userId'
});
Session.belongsTo(AgentSession, {
    as: 'agent',
    foreignKey: 'agentId'
});
exports.Session = Session;

class Recovery extends Sequelize.Model {
}
Recovery.init({
    id: {
        type: Sequelize.STRING(64),
        primaryKey: true
    },
    redeemedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    sequelize: core.db,
    timestamps: true,
    defaultScope: {
        include: [
            {
                model: user.User,
                as: 'user'
            }
        ]
    }
});
Recovery.belongsTo(user.User, {
    as: 'user',
    foreignKey: 'userId'
});
exports.Recovery = Recovery;

exports.sync = async(options = {force: false, alter: true}) => {
    console.log('session SYNC');
    await ClientOS.sync(options);
    await ClientBrowser.sync(options);
    await ClientPlatform.sync(options);
    await AgentSession.sync(options);
    await RemoteAddress.sync(options);
    await RemoteSession.sync(options);
    await Session.sync(options);
    await Recovery.sync(options);
};

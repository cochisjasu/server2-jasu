const Sequelize = require("sequelize"),
    cryptoRandomString = require('crypto-random-string'),
    core = require('../lib/core');

class FileClass extends Sequelize.Model {}
FileClass.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    }, name: {
        type: Sequelize.STRING(100),
        allowNull: false
    }
}, {
    sequelize: core.db
});
exports.FileClass = FileClass;

class FileType extends Sequelize.Model {}
FileType.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    }, name: {
        type: Sequelize.STRING(100),
        allowNull: false
    },  mime: {
        type: Sequelize.STRING(100),
        allowNull: false
    }, extension: {
        type: Sequelize.STRING(10),
        allowNull: false
    }
}, {
    sequelize: core.db,
    defaultScope: {
        include: [
            {
                model: FileClass,
                as: 'class',
                required: true
            }
        ]
    }
});
FileType.belongsTo(FileClass, {
    as: 'class',
    foreignKey: 'classId'
});
exports.FileType = FileType;

class FileStatus extends Sequelize.Model {}
FileStatus.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    }, name: {
        type: Sequelize.STRING(100),
        allowNull: false
    }
}, {
    sequelize: core.db
});
exports.FileStatus = FileStatus;

class File extends Sequelize.Model {}
File.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true
    }, name: {
        type: Sequelize.STRING(250),
        allowNull: true,
        defaultValue: null,
    }, url: {
        type: Sequelize.STRING(1024),
        allowNull: false
    }, text: {
        type: Sequelize.TEXT,
        defaultValue: '',
        allowNull: false
    }, cdnUrl: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }, path: {
        type: Sequelize.STRING(1024),
        allowNull: false,
        defaultValue: '/'
    }, size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
    }, checksum: {
        type: Sequelize.STRING(32),
        allowNull: true,
        defaultValue: null
    }, width: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
    }, height: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
    }, duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
    }, progress: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0
    }, hlsUrl: {
        type: Sequelize.STRING(1024),
        allowNull: true,
        defaultValue: null
    }, mp4Url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
        defaultValue: null
    }, mp3Url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
        defaultValue: null
    }, pdfUrl: {
        type: Sequelize.STRING(1024),
        allowNull: true,
        defaultValue: null
    }
}, {
    sequelize: core.db,
    timestamps: true,
    paranoid: true,
    defaultScope: {
        include: [
            {
                model: FileType,
                as: 'type',
                required: true
            }, {
                model: FileStatus,
                as: 'status',
                required: true
            }
        ]
    }
});
File.belongsTo(FileType, {
    as: 'type',
    foreignKey: 'typeId',
    allowNull:false

});
File.belongsTo(FileStatus, {
    as: 'status',
    foreignKey: 'statusId',
    allowNull:false
});
exports.File = File;

class FilePreview extends Sequelize.Model {}
FilePreview.init({
    id: {
        type: Sequelize.STRING(10),
        primaryKey: true
    }, index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
    }, jpegUrl: {
        type: Sequelize.STRING(1024),
        allowNull: true,
        defaultValue: null
    }, webpUrl: {
        type: Sequelize.STRING(1024),
        allowNull: true,
        defaultValue: null
    }, jpegSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
    }, webpSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
    }, jpegChecksum: {
        type: Sequelize.STRING(32),
        allowNull: true,
        defaultValue: null
    }, webpChecksum: {
        type: Sequelize.STRING(32),
        allowNull: true,
        defaultValue: null
    }, width: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
    }, height: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
    }
}, {
    sequelize: core.db,
    timestamps: true,
    paranoid: true,
    defaultScope: {
        include: [
            {
                model: File,
                as: 'file',
                required: true
            }
        ]
    }
});
FilePreview.belongsTo(File, {
    as: 'file',
    foreignKey: 'fileId',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    allowNull: false
});
exports.FilePreview = FilePreview;

exports.sync = async (options = {force: false, alter: true}) => {
    console.log('file SYNC');
    await FileClass.sync(options);
    await FileType.sync(options);
    await FileStatus.sync(options);
    await File.sync(options);
    await FilePreview.sync(options);
};

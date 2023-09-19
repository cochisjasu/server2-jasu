const Sequelize = require("sequelize");
const core = require('../lib/core');

class Timezone extends Sequelize.Model {}
Timezone.init({
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    }, name: {
        type: Sequelize.STRING(50),
        allowNull: false
    }, gmtOffset: {
        type: Sequelize.FLOAT,
        allowNull: false
    }, gmtOffsetDst: {
        type: Sequelize.FLOAT,
        allowNull: false
    }
}, {
    sequelize: core.db,
    tableName: 'timezones'
});
exports.Timezone = Timezone;

exports.sync = async (options = {force: false, alter: true}) => {;
    console.log('timezone SYNC');
    await Timezone.sync(options);
};

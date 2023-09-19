const {GraphQLScalarType} = require('graphql'),
    moment = require('moment-timezone'),
    pjson = require('../package');

module.exports = {
    Date: new GraphQLScalarType({
        name: 'Date',
        serialize: value => {
            return moment(value).toDate();
        },
        parseValue: value => {
            return moment(value).toJSON();
        },
        parseLiteral: ast => {
            return moment(ast.value).toDate();
        }
    }),
    Query: {
        version: () => pjson.version,
        time: () => moment().tz('UTC').format()
    }
};

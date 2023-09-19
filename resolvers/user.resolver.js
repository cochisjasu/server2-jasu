const {user, session} = require('../index');

module.exports = {
    Query: {
        user: async (parent, {id, email}, {agentId}) => {
            const _session = await session.Session.getByAgentId(agentId);
            if (!_session) throw new Error('Inicie sesión para poder acceder a éste recurso');
            let _user = null;
            if (id) _user = user.User.getById(id);
            else if (email) _user = user.User.getByEmail(email);
            else _user = session.Session.getUserByAgentId(agentId);
            return _user;
        },
        users: async (parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _session = await session.Session.getByAgentId(agentId);
            if (!_session) throw new Error('Inicie sesión para poder acceder a éste recurso');
            const data = await user.User.list(filter, {pag, num, ord, asc}),
                totalCount = await user.User.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        }
    },
    Mutation: {
        validateUser: async(parent, {id, email, locale}, {}) =>
            await user.User.validate(id, email, locale)
    },
};

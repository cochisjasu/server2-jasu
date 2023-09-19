const {session, timezone} = require('../index');

module.exports = {
    Query: {
        timezone: async (parent, {id, name}, {agentId}) => {
            return id ? await timezone.Timezone.getById(id) : (name ? await timezone.Timezone.getByName(name) : null);
        },
        timezones: async (parent, {pag, num, ord, asc, filter}, {agentId}) => {
            let data = await timezone.Timezone.list(filter, {pag, num, ord, asc});
            const totalCount = await timezone.Timezone.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node: node}))
            }
        },
    }
};

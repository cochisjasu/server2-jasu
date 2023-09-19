const {i18n, session} = require('../index');
const { baseConfig } = require('../lib/core');

module.exports = {
    Query: {
        country: async(parent, {id}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await i18n.Country.getById(id, locale);
        },
        countries: async(parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            const data = await i18n.Country.list(filter, {pag, num, ord, asc}, locale),
                totalCount = await i18n.Country.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        },
        region: async(parent, {id}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await i18n.Region.getById(id, locale)
        }, 
        regions: async(parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            const data = await i18n.Region.list(filter, {pag, num, ord, asc}, locale),
                totalCount = await i18n.Region.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        },
        locales: async () =>
            await i18n.Locale.list()
    },
    Mutation: {
        updateCountry: async(parent, {input}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await i18n.Country.update(input, locale);
        },
    },
};

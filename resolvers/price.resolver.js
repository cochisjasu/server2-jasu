const {category, fruit, product, price, session} = require('../index');
const {truncate: productTruncate} = require('../models/product')
const {truncate: priceTruncate} = require('../models/price')
const { baseConfig, destroyCache } = require('../lib/core');

module.exports = {
    Query: {
        price: async(parent, {input}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            const _session = await session.Session.getByAgentId(agentId);
            const loggedIn = !_session ? false : true;
            if("id" in input) return await price.Price.getById(input.id, loggedIn, locale);
            return await price.Price.getOne(input.product, input.country, input.date, loggedIn, locale);
        },
        prices: async(parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            const _session = await session.Session.getByAgentId(agentId);
            const loggedIn = !_session ? false : true;
            const data = await price.Price.list(filter, {pag, num, ord, asc}, loggedIn, locale),
                totalCount = await price.Price.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        },
        harvest: async(parent, {input}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            if("id" in input) return await price.Harvest.getById(input.id, locale);
            return await price.Harvest.getOne(input.fruitVariety, input.country, input.month, locale);
        },
        harvests: async(parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            const data = await price.Harvest.list(filter, {pag, num, ord, asc}, locale),
                totalCount = await price.Harvest.count(filter, locale);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        },
    },
    Mutation: {
        createPrice: async(parent, {input}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await price.Price.create(input, locale)
        },
        syncPricesData: async(parent, {}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            return await price.Price.syncData('en')
        },
        createHarvest: async(parent, {input}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await price.Harvest.create(input, locale)
        },
        syncHarvestsData: async(parent, {}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            return await price.Harvest.syncData('en')
        },
        syncAll: async(parent, {}, {agentId}) => {
            await priceTruncate()
            await productTruncate()
            destroyCache('*')
            await category.FruitCategory.sync();
            await category.PresentationCategory.sync();
            await fruit.Fruit.sync();
            await fruit.FruitVariety.sync();
            await fruit.Presentation.sync();
            await product.Product.sync();
            await price.Price.syncData('en');
            await price.Harvest.syncData('en');
            return true
        }
    },
}
const {category, fruit, product, session} = require('../index');

module.exports = {
    Query: {
        fruitCategory: async(parent, {id}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await category.FruitCategory.getById(id, locale);
        },
        fruitCategories: async(parent, {}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await category.FruitCategory.list(locale)
        },
        fruit: async(parent, {id}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await fruit.Fruit.getById(id, locale);
        },
        fruits: async(parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            const data = await fruit.Fruit.list(filter, {pag, num, ord, asc}, locale),
                totalCount = await fruit.Fruit.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        },
        fruitVariety: async(parent, {id}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await fruit.FruitVariety.getById(id, locale);
        },
        fruitVarieties: async(parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            const data = await fruit.FruitVariety.list(filter, {pag, num, ord, asc}, locale),
                totalCount = await fruit.FruitVariety.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        },
        presentationCategory: async(parent, {id}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await category.PresentationCategory.getById(id, locale);
        },
        presentationCategories: async(parent, {}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await category.PresentationCategory.list(locale)
        },
        presentation: async(parent, {id}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await fruit.Presentation.getById(id, locale);
        },
        presentations: async(parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            const data = await fruit.Presentation.list(filter, {pag, num, ord, asc}, locale),
                totalCount = await fruit.Presentation.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        },
        product: async(parent, {input}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            if("id" in input) return await product.Product.getById(input.id, locale);
            return await product.Product.getByFruitPresentation(input.fruitVariety, input.presentation, locale);
        },
        products: async(parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            if ('query' in filter) {
                const _fruitVariety = await fruit.FruitVariety.getById(filter.query, locale)
                if(!_fruitVariety){
                    const _presentation = await fruit.Presentation.getById(filter.query, locale)
                    if(_presentation){
                        filter.presentation = [filter.query]
                        delete filter.query
                    }
                }
                else{
                    filter.fruitVariety = [filter.query]
                    delete filter.query
                }
            }
            const data = await product.Product.list(filter, {pag, num, ord, asc}, locale),
                totalCount = await product.Product.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        },
        productFile: async(parent, {input}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await product.ProductFile.getById(input.id, locale);
        },
        productFiles: async(parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            const data = await product.ProductFile.list(filter, {pag, num, ord, asc}, locale),
                totalCount = await product.ProductFile.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            }
        },
    },
    Mutation: {
        createFruitCategory: async(parent, {input}, {agentId}) => {
            await session.Session.requireSession(agentId);
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await category.FruitCategory.create(input, locale)
        },
        createFruit: async(parent, {input}, {agentId}) => {
            await session.Session.requireSession(agentId);
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await fruit.Fruit.create(input, locale)
        },
        createFruitVariety: async(parent, {input}, {agentId}) => {
            await session.Session.requireSession(agentId);
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await fruit.FruitVariety.create(input, locale)
        },
        createPresentationCategory: async(parent, {input}, {agentId}) => {
            await session.Session.requireSession(agentId);
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await category.PresentationCategory.create(input, locale)
        },
        createPresentation: async(parent, {input}, {agentId}) => {
            await session.Session.requireSession(agentId);
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await fruit.Presentation.create(input, locale)
        },
        createProduct: async(parent, {input}, {agentId}) => {
            await session.Session.requireSession(agentId);
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await product.Product.create(input, locale)
        },
        createProductFile: async(parent, {input}, {agentId}) => {
            await session.Session.requireSession(agentId);
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await product.ProductFile.create(input, locale)
        },
        syncFruitCategory: async(parent, {}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            return await category.FruitCategory.sync()
        },
        syncPresentationCategory: async(parent, {}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            return await category.PresentationCategory.sync()
        },
        syncFruit: async(parent, {}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            return await fruit.Fruit.sync()
        },
        syncFruitVariety: async(parent, {}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            return await fruit.FruitVariety.sync()
        },
        syncPresentation: async(parent, {}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            return await fruit.Presentation.sync()
        },
        syncProduct: async(parent, {}, {agentId}) => {
            //await session.Session.requireSession(agentId);
            return await product.Product.sync()
        },
    },
}
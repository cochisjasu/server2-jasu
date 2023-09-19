const {GraphQLServer} = require('graphql-yoga'),
    express = require('express'),
    cookieParser = require('cookie-parser'),
    useragent = require('express-useragent'),
    moment = require('moment-timezone')
    typeDefs = require('../typeDefs'),
    resolvers = require('../resolvers'),
    {truncate: productTruncate} = require('../models/product'),
    {truncate: priceTruncate} = require('../models/price'),
    {core, session, file, category, fruit, product, price} = require('../index');


const sockets = new Map();
const context = async (req) => {
    if (req.request && req.response) {
        const {remoteAddress, agentId} = await session.AgentSession.expressGateway(req.request, req.response);
        return {
            req: req.request, res: req.response, agentId,
            pubsub: core.pubsub, remoteAddress
        };
    } else return {
        pubsub: core.pubsub, agentId: req.connection.context.agentId
    }
};
const options = {
    uploads: {
        maxFieldSize: 1000000000,
        maxFileSize: 1000000000
    },
    bodyParserOptions: {
        limit: '10mb', extended: true
    },
    port: process.env.PORT || 4000,
    cors: {
        origin: core.corsConfig.origin,
        credentials: core.corsConfig.credentials
    },
    subscriptions: {
        onConnect: async (connectionParams, websocket, context) => {
            if (!connectionParams) return false;
            if (!connectionParams.authToken) return false;
            const agent = await session.AgentSession.getById(connectionParams.authToken);
            if (!agent) return false;
            sockets.set(websocket, agent.id);
            await session.AgentSession.setConnected(agent.id, true);
            return {
                agentId: agent.id
            };
        },
        onDisconnect: async (websocket, context) => {
            const agentId = sockets.get(websocket);
            if (!agentId) return;
            await session.AgentSession.setConnected(agentId, false);
            sockets.delete(websocket);
        }
    }
};
const server = new GraphQLServer({
    typeDefs,
    resolvers,
    context
});

server.express.set('trust proxy', true);

server.express.use(useragent.express());

server.express.use(cookieParser());

server.express.use(express.json());

server.express.use(async (req, res, next) => {
    next();
});

server.express.get('/preview/:fileId', (req, res, next) => {
    file.FilePreview.reqHandler(req, res, next);
})

server.express.get('/preview/:fileId/:height', (req, res, next) => {
    file.FilePreview.reqHandler(req, res, next);
})

const previewRouter = express.Router();
previewRouter.get('/')

const updateAtMidnight = async () => {
    const now = moment().tz('America/Mexico_City');
    const night = moment().tz('America/Mexico_City').endOf('day');
    const msToMidnight = night.valueOf() - now.valueOf();

    setTimeout(async() => {
        await priceTruncate()
        await productTruncate()
        core.destroyCache('*')
        await category.FruitCategory.sync();
        await category.PresentationCategory.sync();
        await fruit.Fruit.sync();
        await fruit.FruitVariety.sync();
        await fruit.Presentation.sync();
        await product.Product.sync();
        await price.Price.syncData('en');
        await price.Harvest.syncData('en');
        await updateAtMidnight();
    }, msToMidnight)
}

server.start(options).then(() => {
    console.log(`Server is running ⚡ on localhost:${options.port}`);
    updateAtMidnight()
}).catch(error => {
    console.error('GraphQL Error', error);
});

const {session} = require('../index');

module.exports = {
    Query: {
        agent: async(parent, {}, {agentId, remoteAddress}) => {
            const agent = await session.AgentSession.getById(agentId),
                remoteSession = await session.RemoteSession.getByAgentId(remoteAddress, agentId),
                _session = await session.Session.getByAgentId(agentId);
            return {
                ...agent,
                remoteSession, session: _session
            }
        }
    },
    Mutation: {
        login: async(parent, {email, password, nonce}, {agentId, remoteAddress}) =>
            await session.Session.login(email, password, nonce, agentId, remoteAddress),
        logout: async(parent, {}, {agentId}) =>
            await session.Session.logout(agentId, false),
        nonce: async() =>
            await session.Session.generateNonce(),
        signUp: async(parent, {input}, {agentId, remoteAddress}) =>{
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await session.Session.signUp(input, agentId, remoteAddress, locale);
        },
        generateRecovery: async(parent, {email, gre}, {remoteAddress, agentId}) =>
        {
            const _agent = await session.AgentSession.getById(agentId);
            const locale = _agent ? _agent.locale.id : baseConfig.defaultLocale;
            return await session.Recovery.generateRecovery(email, gre, remoteAddress, locale)
        },
        redeemRecovery: async(parent, {recovery, password}, {agentId, remoteAddress}) =>
            await session.Recovery.redeemRecoveryPassword(recovery, password, agentId, remoteAddress),
        setLocale: async(parent, {locale}, {agentId}) =>
            await session.AgentSession.setLocale(agentId, locale),
    },
    Subscription: {
        loggedIn: {
            subscribe: (parent, {}, {pubsub, agentId}) =>
                pubsub.asyncIterator(`loggedIn:agentId=${agentId}`)
        },
        loggedOut: {
            subscribe: (parent, {id, path}, {pubsub, agentId}) =>
                pubsub.asyncIterator(`loggedOut:agentId=${agentId}`)
        },
        changedRemoteSession: {
            subscribe: (parent, {}, {pubsub, agentId}) =>
                pubsub.asyncIterator(`changedRemoteSession:agentId=${agentId}`)
        },
        changedLocale: {
            subscribe: (parent, {}, {pubsub, agentId}) =>
                pubsub.asyncIterator(`changedLocale:agentId=${agentId}`)
        }
    }
};

const {contact, session} = require('../index.js');

module.exports = {
    Mutation: {
        sendComment: async (parent, {input}, {remoteAddress}) => 
            await contact.Contact.sendComment(input),
        sendUserComment: async (parent, {input}, {agentId}) => {
            const _session = await session.Session.getByAgentId(agentId);
            if (!_session) throw new Error('Inicie sesión para poder acceder a éste recurso');
            return await contact.Contact.sendUserComment({
                ...input,
                fullName: _session.user.fullName,
                email: _session.user.email,
                companyName: _session.user.companyName,
            })
        },
            
    }
}
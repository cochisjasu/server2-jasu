const { mandrillConfig, baseConfig } = require("./core");
const mail = require("./mail");

/**
 * Modulo de contacto
 *
 * @module Contact
 */

/**
 * Clase que se encarga de conectarse con la API de MailChimp para enviar correo de contacto
 * a administrador de Jasu
 *
 * @class
 */
class Contact {
    /**
     * Método para enviar mensaje de comentarios de la página
     * 
     * @param {Obiject} input Contenido del mensaje
     * @returns
     */ 
    static sendComment = async (input) => {
        try{
            const newInput = Object.entries(input).map(([key, value]) => ({
                name: key,
                content: value
            }));
            newInput.push({
                name: "baseLink",
                content: `${baseConfig.rootDomain}`
            });
            await mail.MailMessage.send(
                mandrillConfig.adminEmail,
                "Jasu",
                'Nuevo mensaje en Jasu',
                newInput,
                'contactMessage');
            return true;
        }
        catch(error)
        {
            logError(error, 'CSM1');
        }
    }

    /**
     * Método para enviar mensaje proveniente de usuario
     * 
     * @param {Obiject} input Contenido del mensaje
     * @returns
     */ 
    static sendUserComment = async (input) => {
        try{
            const newInput = Object.entries(input).map(([key, value]) => ({
                name: key,
                content: value
            }));
            newInput.push({
                name: "baseLink",
                content: `${baseConfig.rootDomain}`
            });
            await mail.MailMessage.send(
                mandrillConfig.adminEmail,
                "Jasu",
                input.topic,
                newInput,
                'contactUserMessage');
            return true;
        }
        catch(error)
        {
            logError(error, 'CSM1');
        }
    }
}

module.exports = {
    Contact
}
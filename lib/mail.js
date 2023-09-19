const {mandrill, mandrillConfig} = require('./core'),
    fs = require('fs'),
    path = require('path');

/**
 * Modulo de envio de correos
 *
 * @module Mail
 */

/**
 * Clase que administra el envio de correos
 *
 * @class
 */
class MailMessage {

    /**
     * Objeto que almacena las plantillas a utilizar para la aplicación
     * 
     * @type {Object}
     */
    static templateData = {

    }

    /**
     * Llama a la API de mandrill para enviar un correo
     * 
     * @param {String} email Correo electrónico del destinatario
     * @param {String} name Nombre del destinatario
     * @param {String} subject Asunto del correo
     * @param {Array} variables Datos que se sustituiran en el correo
     * @param {String} template Nombre de la plantilla a enviar
     * @param {Array} attachments Lista de archivos adjuntos a enviar
     * @param {Array} images Lista de imágenes a enviar
     * @returns {Promise}
     */ 
    static send = (email, name, subject,
                   variables = [], template = 'contactMessage',
                   attachments = [], images = []) =>
        new Promise(async (resolve, reject) => {
            try {
                if(!this.templateData[template]) this.templateData[template] = {
                    html: fs.readFileSync(path.join(__dirname, `../mail/templates/${template}.html`)).toString(),
                    text: fs.readFileSync(path.join(__dirname, `../mail/templates/${template}.txt`)).toString(),
                };
                const mandrill_client = mandrill();
                mandrill_client.messages.send({
                    message: {
                        ...this.templateData[template],
                        subject,
                        from_email: mandrillConfig.fromEmail,
                        from_name: mandrillConfig.fromName,
                        to: [{
                            email, name, type: 'to'
                        }],
                        headers: {
                            'Reply-To': mandrillConfig.replyTo
                        },
                        merge: true,
                        merge_language: 'mailchimp',
                        global_merge_vars: variables,
                        metadata: {
                            website: mandrillConfig.website
                        }, attachments, images
                    },
                    async: true,
                    ip_pool: 'Main Pool'
                }, resolve, reject)
            } catch(error) {
                reject(error)
            }
        });
}

module.exports = {
    MailMessage
};

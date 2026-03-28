const Joi = require('joi');

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        next();
    };
};

const schemas = {
    register: Joi.object({
        name: Joi.string().min(2).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    }),
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),
    sendMessage: Joi.object({
        chat_id: Joi.number().required(),
        message: Joi.object({
            type: Joi.string().valid('text', 'image', 'audio', 'video', 'file').required(),
            text: Joi.string().allow(null, ''),
            audio: Joi.string().allow(null, ''),
            image: Joi.string().allow(null, ''),
            video: Joi.string().allow(null, ''),
            file: Joi.object({
                url: Joi.string().required(),
                name: Joi.string().required()
            }).allow(null)
        }).required()
    }),
    n8nWebhook: Joi.object({
        chat_id: Joi.number().required(),
        user_id: Joi.number().required(),
        reply: Joi.object({
            type: Joi.string().valid('text', 'image', 'audio', 'video', 'file').required(),
            text: Joi.string().allow(null, ''),
            url: Joi.string().allow(null, ''),
            filename: Joi.string().allow(null, ''),
            contentType: Joi.string().allow(null, '')
        }).required(),
        webhook_secret: Joi.string().required(),
        session_id: Joi.string().allow(null, '')
    })
};

module.exports = { validate, schemas };

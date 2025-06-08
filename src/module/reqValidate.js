const Ajv = require('ajv')
const addFormats = require('ajv-formats')

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

const validate = ajv.compile({
    type: 'object',
    properties: {
        mode: {
            type: 'string',
            enum: ['source', 'turnstile-min', 'turnstile-max', 'waf-session']
        },
        proxy: {
            type: 'object',
            properties: {
                host: { type: 'string' },
                port: { type: 'integer' },
                username: { type: 'string' },
                password: { type: 'string' }
            },
            additionalProperties: false
        },
        url: {
            type: 'string',
            format: 'uri'
        },
        authToken: {
            type: 'string'
        },
        siteKey: {
            type: 'string'
        }
    },
    required: ['mode', 'url'],
    additionalProperties: false
})

module.exports = (data) => (validate(data) ? true : validate.errors)

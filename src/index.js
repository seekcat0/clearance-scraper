const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const bodyParser = require('body-parser')
const authToken = process.env.authToken || null
const cors = require('cors')
const reqValidate = require('./module/reqValidate')

global.browserLength = 0
global.browserLimit = +process.env.browserLimit || 20
global.timeOut = +process.env.timeOut || 60000

// Middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())

if (process.env.NODE_ENV !== 'development') {
    const server = app.listen(port, () => console.log(`Server running on port ${port}`))
    server.timeout = global.timeOut
}

if (process.env.SKIP_LAUNCH !== 'true') require('./module/createBrowser')

// Endpoints
const getSource = require('./endpoints/getSource')
const solveTurnstileMin = require('./endpoints/solveTurnstile.min')
const solveTurnstileMax = require('./endpoints/solveTurnstile.max')
const wafSession = require('./endpoints/wafSession')

// Main Route
app.post('/cf-clearance-scraper', async (req, res) => {
    const data = req.body
    const check = reqValidate(data)

    if (check !== true) return res.status(400).json({ code: 400, message: 'Bad Request', schema: check })
    if (authToken && data.authToken !== authToken) return res.status(401).json({ code: 401, message: 'Unauthorized' })
    if (global.browserLength >= global.browserLimit) return res.status(429).json({ code: 429, message: 'Too Many Requests' })
    if (process.env.SKIP_LAUNCH !== 'true' && !global.browser) {
        return res.status(500).json({ code: 500, message: 'The scanner is not ready yet. Please try again a little later.' })
    }

    global.browserLength++
    let result = { code: 500 }

    try {
        switch (data.mode) {
            case "source":
                result = { source: await getSource(data), code: 200 }
                break
            case "turnstile-min":
                result = { token: await solveTurnstileMin(data), code: 200 }
                break
            case "turnstile-max":
                result = { token: await solveTurnstileMax(data), code: 200 }
                break
            case "waf-session":
                result = { ...(await wafSession(data)), code: 200 }
                break
        }
    } catch (err) {
        result = { code: 500, message: err.message }
    }

    global.browserLength--
    res.status(result.code ?? 500).send(result)
})

// 404 Handler
app.use((_, res) => res.status(404).json({ code: 404, message: 'Not Found' }))

if (process.env.NODE_ENV === 'development') module.exports = app

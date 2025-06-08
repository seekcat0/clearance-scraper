const { connect } = require('puppeteer-real-browser')

async function createBrowser() {
    if (global.finished) return

    global.browser = null

    try {
        const { browser } = await connect({
            headless: false,
            turnstile: true,
            connectOption: { defaultViewport: null },
            disableXvfb: false
        })

        global.browser = browser

        browser.on('disconnected', async () => {
            if (global.finished) return
            console.log('Browser disconnected')
            await delay(3000)
            await createBrowser()
        })

    } catch (err) {
        console.log(err.message)
        if (global.finished) return
        await delay(3000)
        await createBrowser()
    }
}

function delay(ms) {
    return new Promise(res => setTimeout(res, ms))
}

createBrowser()

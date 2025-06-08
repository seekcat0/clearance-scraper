const fs = require("fs")

module.exports = function solveTurnstileMax({ url, proxy }) {
  return new Promise(async (resolve, reject) => {
    if (!url) return reject("Missing url parameter")

    const context = await global.browser
      .createBrowserContext({
        proxyServer: proxy ? `http://${proxy.host}:${proxy.port}` : undefined
      })
      .catch(() => null)

    if (!context) return reject("Failed to create browser context")

    let isResolved = false
    const timeout = global.timeOut || 60000

    const timer = setTimeout(async () => {
      if (!isResolved) {
        await context.close().catch(() => {})
        reject("Timeout Error")
      }
    }, timeout)

    try {
      const page = await context.newPage()

      if (proxy?.username && proxy?.password) {
        await page.authenticate({
          username: proxy.username,
          password: proxy.password
        })
      }

      await page.evaluateOnNewDocument(() => {
        let token = null
        async function waitForToken() {
          while (!token) {
            try {
              token = window.turnstile?.getResponse?.()
            } catch {}
            await new Promise((r) => setTimeout(r, 500))
          }
          const input = document.createElement("input")
          input.type = "hidden"
          input.name = "cf-response"
          input.value = token
          document.body.appendChild(input)
        }
        waitForToken()
      })

      await page.goto(url, { waitUntil: "domcontentloaded" })

      await page.waitForSelector('[name="cf-response"]', { timeout })

      const token = await page.evaluate(() => {
        const el = document.querySelector('[name="cf-response"]')
        return el?.value || null
      })

      isResolved = true
      clearTimeout(timer)
      await context.close().catch(() => {})

      if (!token || token.length < 10) return reject("Failed to get token")
      return resolve(token)

    } catch (err) {
      console.log(err)
      if (!isResolved) {
        clearTimeout(timer)
        await context.close().catch(() => {})
        reject(err.message)
      }
    }
  })
}

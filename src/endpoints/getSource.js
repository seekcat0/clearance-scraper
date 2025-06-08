module.exports = function getSource({ url, proxy }) {
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

      await page.setRequestInterception(true)
      page.on("request", req => req.continue())

      page.on("response", async (res) => {
        if (
          [200, 302].includes(res.status()) &&
          [url, url + "/"].includes(res.url())
        ) {
          try {
            await page.waitForNavigation({ waitUntil: "load", timeout: 5000 }).catch(() => {})
            const html = await page.content()
            clearTimeout(timer)
            isResolved = true
            await context.close().catch(() => {})
            resolve(html)
          } catch {}
        }
      })

      await page.goto(url, { waitUntil: "domcontentloaded" })

    } catch (err) {
      if (!isResolved) {
        clearTimeout(timer)
        await context.close().catch(() => {})
        reject(err.message)
      }
    }
  })
}

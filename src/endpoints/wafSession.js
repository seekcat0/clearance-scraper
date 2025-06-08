async function findAcceptLanguage(page) {
  try {
    const res = await page.evaluate(async () => {
      try {
        const data = await fetch("https://httpbin.org/get").then(res => res.json())
        return data.headers["Accept-Language"] || data.headers["accept-language"] || null
      } catch {
        return null
      }
    })
    return res
  } catch {
    return null
  }
}

module.exports = function getWafSession({ url, proxy }) {
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

      const acceptLanguage = await findAcceptLanguage(page)

      await page.setRequestInterception(true)

      page.on("request", request => request.continue())

      page.on("response", async response => {
        try {
          const resUrl = response.url()
          if (
            [200, 302].includes(response.status()) &&
            [url, url + "/"].includes(resUrl)
          ) {
            await page.waitForNavigation({ waitUntil: "load", timeout: 5000 }).catch(() => {})

            const cookies = await page.cookies()
            const headers = { ...response.request().headers() }

            delete headers["content-type"]
            delete headers["accept-encoding"]
            delete headers["accept"]
            delete headers["content-length"]

            if (acceptLanguage) {
              headers["accept-language"] = acceptLanguage
            }

            isResolved = true
            clearTimeout(timer)
            await context.close().catch(() => {})

            resolve({ cookies, headers })
          }
        } catch {
          // Silent error
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

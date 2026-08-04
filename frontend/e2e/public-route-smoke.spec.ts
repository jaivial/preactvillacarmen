import { expect, test } from '@playwright/test'

const publicRoutes = [
  '/',
  '/contacto',
  '/eventos',
  '/menusdegrupos',
  '/postres',
  '/vinos',
  '/cafes',
  '/bebidas',
  '/reservas',
  '/avisolegal',
  '/booking-policies',
  '/protecciondatos',
  '/menufindesemana',
  '/menudeldia',
  '/unknown-qa-route',
]

test.describe('Public route smoke', () => {
  for (const route of publicRoutes) {
    test(`${route} renders a non-empty document`, async ({ page }) => {
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(response?.status(), `${route} HTTP status`).toBe(200)
      await expect(page.locator('body')).not.toBeEmpty()
      // The dev-server Vite HMR websocket can fail to open when the HMR client
      // port is tunneled (e.g. Cloudflare). It is environmental, not an app
      // error, so it must not make unrelated route smoke checks fail.
      const unrelatedErrors = pageErrors.filter(
        (error) => !error.includes('WebSocket closed without opened.')
      )
      expect(unrelatedErrors, `${route} unrelated page errors`).toEqual([])
    })
  }
})

import { expect, test } from '@playwright/test'

/**
 * Regression: on mobile Safari the first wines shown on /vinos kept a blank
 * placeholder instead of their photo.
 *
 * The cards mount after the list request resolves. The page loads each wine
 * photo lazily from an IntersectionObserver callback, but that callback can be
 * delivered before Preact has flushed the passive effect that populated the
 * lookup refs. The old `ensureWine` treated "wine not found in the ref yet" as
 * "this wine has no photo" and cached a permanent `null`, so the initially
 * visible cards (the first two or three) never issued their photo request.
 *
 * These specs pin the timing by slowing `requestAnimationFrame` down: Preact
 * flushes passive effects on the next frame, while IntersectionObserver runs
 * from the rendering steps. That reliably reproduces the device timing without
 * a real iPhone.
 */

type MockVino = {
  num: number
  nombre: string
  precio: number
  descripcion: string
  bodega: string
  denominacion_origen: string
  tipo: string
  graduacion: number
  anyo: string
  active: 0 | 1
  has_foto: boolean
  foto_url?: string
}

function mockVino(num: number, withFoto: boolean): MockVino {
  return {
    num,
    nombre: `Vino ${num}`,
    precio: 20 + num,
    descripcion: `Descripcion ${num}`,
    bodega: `Bodega ${num}`,
    denominacion_origen: 'Valencia',
    tipo: 'TINTO',
    graduacion: 13.5,
    anyo: '2020',
    active: 1,
    has_foto: withFoto,
  }
}

const PHOTO_DATA_URL = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><rect width='12' height='12' fill='#8b0000'/></svg>"
)}`

const VISIBLE_WINES = [mockVino(101, true), mockVino(102, true), mockVino(103, true), mockVino(104, false)]

test.describe('Wines page lazy photo loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (cb: FrameRequestCallback) =>
        window.setTimeout(() => raf(cb), 400)
    })

    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url())
      const json = (body: unknown) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

      if (url.pathname === '/api/menus/sidebar') {
        return json({
          success: true,
          menus: [],
          visible_sections: [],
          vinos_page_active: true,
          cafe_page_active: true,
          bebidas_page_active: true,
          postres_page_active: true,
          vinos_web_placement: 'inside_menus',
          cafes_web_placement: 'inside_menus',
          bebidas_web_placement: 'inside_menus',
          postres_web_placement: 'inside_menus',
        })
      }

      if (url.pathname === '/api/public/ads') {
        return json({ success: true, restaurant_id: 1, ads: [] })
      }

      if (url.pathname === '/api/vinos') {
        const num = url.searchParams.get('num')
        if (num) {
          return json({ success: true, vinos: [{ ...mockVino(Number(num), true), foto_url: PHOTO_DATA_URL }] })
        }
        return json({ success: true, vinos: VISIBLE_WINES })
      }

      return json({ success: true })
    })
  })

  test('renders a photo for every wine that has one, even on the first frame', async ({ page }) => {
    await page.goto('/vinos')

    const cards = page.locator('.wineCardWrap')
    await expect(cards).toHaveCount(VISIBLE_WINES.length)

    // The first cards are the ones the observer fires for immediately: they are
    // the ones the race used to strand on a blank placeholder.
    for (let i = 0; i < VISIBLE_WINES.length; i++) {
      const card = cards.nth(i)
      if (VISIBLE_WINES[i].has_foto) {
        await expect(card.locator('.winePhoto img'), `card ${i} (num ${VISIBLE_WINES[i].num}) image`).toHaveCount(1)
      } else {
        await expect(card.locator('.winePhoto img'), `card ${i} (num ${VISIBLE_WINES[i].num}) has no image`).toHaveCount(0)
        await expect(card.locator('.winePhotoPlaceholder')).toHaveCount(1)
      }
      await expect(card.locator('.winePhotoPlaceholder.is-loading'), `card ${i} not stuck loading`).toHaveCount(0)
    }
  })
})

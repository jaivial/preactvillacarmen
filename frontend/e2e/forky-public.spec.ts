import { test, expect } from '@playwright/test'

/**
 * Public-site Forky smoke: the widget mounts on every page, and the anonymous
 * chat endpoint answers end-to-end (browser -> vite WS tunnel -> Go backend ->
 * MiniMax stub).
 *
 * The modal's assistant-ui thread rendering is not asserted here: its
 * store-driven primitives do not react to input under headless Chromium (see
 * backoffice/e2e/specs/forky — reproduced with a minimal raw Thread/Composer).
 * The raw WS round-trip below exercises the real public chat path
 * deterministically.
 */
test('Forky button is present on the homepage', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  const button = page.getByTestId('forky-button')
  // The app's boot-loader waits on CDN media (up to 45s) before mounting.
  await expect(button).toBeVisible({ timeout: 90_000 })
  await expect(button).toHaveAttribute('aria-label', 'Abrir asistente Forky')
  await expect(button.locator('img')).toHaveAttribute(
    'src',
    /\/assets\/forky\/forky-preview\.png/
  )
})

test('anonymous chat round-trip through /api/assistant/ws', async ({ page }) => {
  await page.goto('/')

  const frames = await page.evaluate(
    () =>
      new Promise<{ hello: Record<string, unknown>; reply: string }>((resolve, reject) => {
        const token = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
        const ws = new WebSocket(
          `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/assistant/ws`
        )
        const timer = setTimeout(() => reject(new Error('ws timeout')), 15000)
        const collect: string[] = []
        ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', session_id: null, session_token: token }))
        ws.onmessage = (ev) => {
          const frame = JSON.parse(String(ev.data)) as Record<string, unknown>
          if (frame.type === 'hello') {
            ws.send(JSON.stringify({ type: 'message', content: 'hola public' }))
          } else if (frame.type === 'delta') {
            collect.push(String(frame.text))
          } else if (frame.type === 'done') {
            clearTimeout(timer)
            ws.close()
            resolve({ hello: frame, reply: collect.join('') })
          } else if (frame.type === 'error') {
            clearTimeout(timer)
            reject(new Error(`frame error: ${String(frame.message)}`))
          }
        }
        ws.onerror = () => {
          clearTimeout(timer)
          reject(new Error('ws error'))
        }
      })
  )

  expect(frames.hello.type).toBe('done')
  expect(frames.reply).toMatch(/Soy Forky, (?:tu )?asistente/i)
})

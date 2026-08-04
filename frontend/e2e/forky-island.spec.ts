import { test } from '@playwright/test'

test('island state', async ({ page }) => {
  const logs: string[] = []
  page.on('pageerror', (err) => logs.push(`PAGEERROR: ${err.message.slice(0, 200)}`))
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text().slice(0, 160)}`))
  await page.goto('/')
  const button = page.getByTestId('forky-button')
  await button.waitFor({ timeout: 60000 })
  await page.waitForTimeout(1500)
  await page.evaluate(() => document.querySelector('[data-testid="forky-button"]')?.dispatchEvent(new Event('click', { bubbles: true })))
  await page.waitForTimeout(6000)
  const host = await page.evaluate(() => {
    const h = document.querySelector('[data-testid="forky-modal-host"]')
    return { children: h ? h.children.length : -1, html: h ? h.innerHTML.slice(0, 250) : null }
  })
  console.log('HOST:', JSON.stringify(host))
  console.log('LOGS:', JSON.stringify(logs.filter((l) => l.includes('forky') || l.includes('PAGEERROR')).slice(-8)))
})

import { test, expect } from '@playwright/test'

test('modal island renders', async ({ page }) => {
  await page.goto('/')
  const button = page.getByTestId('forky-button')
  await expect(button).toBeVisible({ timeout: 60_000 })
  await expect(async () => {
    await button.evaluate((el) => el.dispatchEvent(new Event('click', { bubbles: true })))
    await expect(page.getByTestId('forky-modal')).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 20_000 })
  await expect(page.getByTestId('forky-canvas')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('forky-modal')).toBeHidden()
})

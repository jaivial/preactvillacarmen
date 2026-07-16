import { expect, test, type Page } from '@playwright/test'

// Rice step E2E — runs against the live dev backend.
// Rice step only shows when NO mandatory/group menu is chosen.

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://preact-dev.menustudioai.com'

type RiceTypes = { riceTypes: string[]; riceTypesEnglish?: string[] }

async function getRiceTypes(page: Page): Promise<string[]> {
  const res = await page.request.get(`${BASE}/api/reservations/rice-types`)
  const body = (await res.json()) as RiceTypes
  return (body.riceTypes || []).map((s) => String(s).trim()).filter(Boolean)
}

// Open a PopoverSelect by aria-label, return its option <button> locator.
function popover(page: Page, ariaLabel: string) {
  return page.locator(`.resvSelect:has(> .resvSelectAnchor > button[aria-label="${ariaLabel}"])`)
}

// Try to book `party`; if no selectable date on dev has an hour slot with that
// per-slot capacity, fall back to smaller sizes. Returns the party size actually used.
async function pickDatePartyTime(page: Page, party: number): Promise<number> {
  await expect(page.locator('.resvDay').first()).toBeVisible()
  const pop = popover(page, 'Number of guests')
  for (let want = party; want >= 2; want--) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.waitForTimeout(1500) // let month-availability populate & settle
      const days = page.locator('.resvDay:not(.disabled):not(.other)')
      const n = await days.count()
      for (let i = 0; i < n; i++) {
        const day = days.nth(i)
        if (!(await day.isEnabled())) continue
        await day.click()
        await pop.locator('button[aria-label="Number of guests"]').click()
        const opt = pop.locator('.resvSelectOpt', { has: page.locator(`.resvSelectOpt__left:text-is("${want}")`) })
        if (!(await opt.count())) {
          await page.keyboard.press('Escape')
          continue
        }
        await opt.first().click()
        await maybePickFloorAndShift(page)
        const slot = page.locator('.resvHourBtn').first()
        try {
          await expect(slot).toBeVisible({ timeout: 3500 })
        } catch {
          continue // this date has no slot with capacity for `want`
        }
        await slot.click()
        return want
      }
      await page.getByRole('button', { name: /Next month/i }).click()
    }
    // Reset calendar to the first month before trying a smaller party.
    await page.reload()
    await expect(page.locator('.resvDay').first()).toBeVisible()
  }
  throw new Error('No selectable date with an available hour slot found')
}

async function maybePickFloorAndShift(page: Page) {
  const floor = popover(page, 'Dining room')
  if (await floor.locator('button[aria-label="Dining room"]').count()) {
    await floor.locator('button[aria-label="Dining room"]').click()
    await floor.locator('.resvSelectOpt').first().click()
  }
  const shift = popover(page, 'Service')
  if (await shift.locator('button[aria-label="Service"]').count()) {
    await shift.locator('button[aria-label="Service"]').click()
    await shift.locator('.resvSelectOpt').first().click()
  }
}

// Navigate date -> party -> time -> Next, skipping group menu if it appears.
// Leaves the page on the rice step. Returns the party size actually used.
// Skips the test if a mandatory menu forces a menu.
async function reachRiceStep(page: Page, party: number): Promise<number> {
  test.setTimeout(120_000) // date-hunting loop can span several dates/months/party sizes
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'en'))
  await page.goto('/reservas')
  const actualParty = await pickDatePartyTime(page, party)
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  // After Next: rice, groupMenu, or mandatoryMenu card.
  const title = page.locator('.resvCardTitle')
  await expect(title.filter({ hasText: /Rice selection|Group menu|Recommended menu/ })).toBeVisible()

  if (await title.filter({ hasText: 'Recommended menu' }).count()) {
    test.skip(true, 'Mandatory menu active for chosen date on dev — rice step is skipped')
  }
  if (await title.filter({ hasText: 'Group menu' }).count()) {
    // Choose "No" group menu -> proceeds to rice.
    await page.locator('.resvChoice', { hasText: /^No$/ }).click()
    await page.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await expect(title.filter({ hasText: 'Rice selection' })).toBeVisible()
  return actualParty
}

test('rice step appears after time selection (no menu)', async ({ page }) => {
  await reachRiceStep(page, 2)
  await expect(page.locator('.resvChoice', { hasText: /^Yes$/ })).toBeVisible()
  await expect(page.locator('.resvChoice', { hasText: /^No$/ })).toBeVisible()
})

test('choosing no rice proceeds to personal step', async ({ page }) => {
  await reachRiceStep(page, 2)
  await page.locator('.resvChoice', { hasText: /^No$/ }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.locator('.resvCardTitle', { hasText: 'Personal details' })).toBeVisible()
})

test('choosing yes rice shows type selector', async ({ page }) => {
  await reachRiceStep(page, 2)
  await page.locator('.resvChoice', { hasText: /^Yes$/ }).click()
  const typeSel = popover(page, 'Rice dish')
  await expect(typeSel.locator('button[aria-label="Rice dish"]')).toBeVisible()

  // Cross-check option count vs API.
  const apiTypes = await getRiceTypes(page)
  await typeSel.locator('button[aria-label="Rice dish"]').click()
  await expect(typeSel.locator('.resvSelectOpt')).toHaveCount(apiTypes.length)
})

test('selecting rice type shows servings selector', async ({ page }) => {
  const party = await reachRiceStep(page, 2)
  await page.locator('.resvChoice', { hasText: /^Yes$/ }).click()
  const typeSel = popover(page, 'Rice dish')
  await typeSel.locator('button[aria-label="Rice dish"]').click()
  await typeSel.locator('.resvSelectOpt').first().click()

  const servings = popover(page, 'Servings')
  await servings.locator('button[aria-label="Servings"]').click()
  const lefts = (await servings.locator('.resvSelectOpt__left').allTextContents()).map((s) => s.trim())
  // Options are 2..partySize.
  const expected = Array.from({ length: party - 1 }, (_, i) => String(i + 2))
  expect(lefts).toEqual(expected)
})

test('rice servings minimum is 2', async ({ page }) => {
  await reachRiceStep(page, 2)
  await page.locator('.resvChoice', { hasText: /^Yes$/ }).click()
  const servings = popover(page, 'Servings')
  await servings.locator('button[aria-label="Servings"]').click()
  const first = await servings.locator('.resvSelectOpt__left').first().textContent()
  expect(first?.trim()).toBe('2')
})

test('rice servings cannot exceed party size', async ({ page }) => {
  const party = await reachRiceStep(page, 2)
  await page.locator('.resvChoice', { hasText: /^Yes$/ }).click()
  const servings = popover(page, 'Servings')
  await servings.locator('button[aria-label="Servings"]').click()
  const nums = (await servings.locator('.resvSelectOpt__left').allTextContents()).map((s) => Number(s.trim()))
  // Max servings == party size; nothing above it, and the value equals partySize exactly.
  expect(Math.max(...nums)).toBe(party)
  expect(nums.every((n) => n <= party)).toBe(true)
})

test('must select both type and servings to proceed', async ({ page }) => {
  await reachRiceStep(page, 2)
  const next = page.getByRole('button', { name: 'Next', exact: true })
  await page.locator('.resvChoice', { hasText: /^Yes$/ }).click()
  // Neither selected -> no Next.
  await expect(next).toHaveCount(0)

  // Type only -> still blocked.
  const typeSel = popover(page, 'Rice dish')
  await typeSel.locator('button[aria-label="Rice dish"]').click()
  await typeSel.locator('.resvSelectOpt').first().click()
  await expect(next).toHaveCount(0)

  // Both -> allowed.
  const servings = popover(page, 'Servings')
  await servings.locator('button[aria-label="Servings"]').click()
  await servings.locator('.resvSelectOpt').first().click()
  await expect(next).toBeVisible()
})

test('completes booking with rice', async ({ page }) => {
  const party = await reachRiceStep(page, 2)
  await page.locator('.resvChoice', { hasText: /^Yes$/ }).click()

  const typeSel = popover(page, 'Rice dish')
  await typeSel.locator('button[aria-label="Rice dish"]').click()
  await typeSel.locator('.resvSelectOpt').first().click()

  const servings = popover(page, 'Servings')
  await servings.locator('button[aria-label="Servings"]').click()
  await servings.locator(`.resvSelectOpt:has(.resvSelectOpt__left:text-is("${party}"))`).click()

  await page.getByRole('button', { name: 'Next', exact: true }).click()

  // Personal
  await expect(page.locator('.resvCardTitle', { hasText: 'Personal details' })).toBeVisible()
  await page.locator('input[autocomplete="name"]').fill('E2E Rice Test')
  await page.locator('input[type="email"]').fill(`e2e-rice-${Date.now()}@example.com`)
  await page.locator('input[autocomplete="tel-national"]').fill('600123456')
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  // Adults (default = party, kids 0 -> skip accessories)
  await expect(page.locator('.resvCardTitle', { hasText: /How many adults/ })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  // Summary -> accept terms, submit
  await expect(page.locator('.resvCardTitle', { hasText: 'Reservation summary' })).toBeVisible()
  await page.locator('.resvCheck').nth(0).locator('button, input').first().click()
  await page.locator('.resvCheck').nth(1).locator('button, input').first().click()

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/bookings/front')),
    page.getByRole('button', { name: 'Complete reservation' }).click(),
  ])
  expect(res.ok()).toBe(true)
  await expect(page.locator('.resvModal')).toBeVisible()
})

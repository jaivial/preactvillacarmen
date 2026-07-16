import { expect, test, type Page, type Locator } from '@playwright/test'

// Reach the adults step by completing date → party → time → (group menu no) → rice no → personal.
// Then exercise the adults Counter and the conditional accessories step.

async function titleVisible(page: Page, title: string): Promise<boolean> {
  return page
    .locator('.resvCardTitle', { hasText: title })
    .first()
    .isVisible()
    .catch(() => false)
}

async function clickNext(page: Page) {
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
}

async function selectPopover(page: Page, ariaLabel: string, optionText?: string) {
  const btn = page.getByRole('button', { name: ariaLabel, exact: true })
  await btn.click()
  const option = optionText
    ? page.getByRole('option').filter({ hasText: optionText }).first()
    : page.getByRole('option').first()
  await option.click()
}

// Pick party, then hunt for a shift that exposes at least one time slot
// (capacity must be >= party, which varies per date). Returns true if a slot was clicked.
async function pickPartyAndTime(page: Page, party: string): Promise<boolean> {
  const partyBtn = page.getByRole('button', { name: 'Número de personas', exact: true })
  try {
    await expect(partyBtn).toBeEnabled({ timeout: 8000 })
  } catch {
    return false
  }
  await selectPopover(page, 'Número de personas', party)

  const floorBtn = page.getByRole('button', { name: 'Salón', exact: true })
  if (await floorBtn.isVisible().catch(() => false)) {
    await selectPopover(page, 'Salón')
  }

  const shiftBtn = page.getByRole('button', { name: 'Turno', exact: true })
  const hasShift = await shiftBtn.isVisible().catch(() => false)
  const shifts = hasShift ? [0, 1] : [-1]

  for (const s of shifts) {
    if (s >= 0) {
      await shiftBtn.click()
      await page.getByRole('option').nth(s).click()
    }
    const hour = page.locator('.resvHourBtn').first()
    if (await hour.isVisible({ timeout: 3000 }).catch(() => false)) {
      await hour.click()
      return true
    }
  }
  return false
}

// Navigate to the adults step. Returns after the adults Counter is visible.
async function reachAdults(page: Page, party: string) {
  await page.goto('/reservas')
  // Boot splash intercepts pointer events until the app mounts.
  await page.locator('#vc-boot').waitFor({ state: 'detached' }).catch(() => {})

  // Some dates cap capacity below the requested party, or only expose slots on one
  // shift. Scan bookable dates (advancing months if needed) until one yields a slot.
  const days = page.locator('.resvDay:not(.disabled):not(.other)')
  await expect(days.first()).toBeVisible()

  let booked = false
  for (let month = 0; month < 3 && !booked; month++) {
    if (month > 0) {
      await page.getByRole('button', { name: 'Mes siguiente', exact: true }).click()
      await page.waitForTimeout(400)
    }
    const dayCount = await days.count()
    for (let i = 0; i < dayCount && !booked; i++) {
      await days.nth(i).click()
      booked = await pickPartyAndTime(page, party)
    }
  }
  expect(booked, `no date offered a time slot for party ${party}`).toBeTruthy()

  await clickNext(page)

  // Optional group-menu / mandatory-menu / rice steps before personal.
  for (let i = 0; i < 5; i++) {
    if (await titleVisible(page, 'Datos personales')) break
    if (await titleVisible(page, 'Menú de grupos')) {
      await page.getByRole('button', { name: 'No', exact: true }).click()
      await clickNext(page)
      continue
    }
    if (await titleVisible(page, 'Selección de arroz')) {
      await page.getByRole('button', { name: 'No', exact: true }).click()
      await clickNext(page)
      continue
    }
    if (await titleVisible(page, 'Menú recomendado del día')) {
      const cont = page.getByRole('button', { name: /Continuar sin/ })
      if (await cont.isVisible().catch(() => false)) await cont.click()
      await clickNext(page)
      continue
    }
    await page.waitForTimeout(250)
  }

  await expect(page.locator('.resvCardTitle', { hasText: 'Datos personales' })).toBeVisible()

  // Personal data.
  await page.locator('input[autocomplete="name"]').fill('QA Test Adultos')
  await page.locator('input[type="email"]').fill('qa.adults@example.com')
  await page.locator('input[autocomplete="tel-national"]').fill('600123456')
  await clickNext(page)

  await expect(page.locator('.resvCardTitle', { hasText: '¿Cuántos adultos sois?' })).toBeVisible()
}

function counterByTitle(page: Page, title: string): Locator {
  return page.locator('.resvCounter', { hasText: title })
}

async function counterValue(counter: Locator): Promise<number> {
  return Number((await counter.locator('.resvCounterValue').innerText()).trim())
}

// Click "Aumentar" until value reaches target or button disabled.
async function incTo(counter: Locator, target: number) {
  const inc = counter.getByRole('button', { name: 'Aumentar' })
  for (let i = 0; i < 20; i++) {
    if ((await counterValue(counter)) >= target) break
    if (await inc.isDisabled()) break
    await inc.click()
  }
}

async function decTo(counter: Locator, target: number) {
  const dec = counter.getByRole('button', { name: 'Disminuir' })
  for (let i = 0; i < 20; i++) {
    if ((await counterValue(counter)) <= target) break
    if (await dec.isDisabled()) break
    await dec.click()
  }
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
})

// NOTE: the dev backend only exposes 2-top capacity on bookable dates (all
// party>=4 dates are fully booked), so PARTY is 2. The adults/children/accessories
// logic is identical: adults range 1..PARTY, children = PARTY - adults.
const PARTY = 2

test('adults counter defaults correctly', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  const c = counterByTitle(page, 'Adultos')
  // goNextFromPersonal sets adults = partySize when unset.
  expect(await counterValue(c)).toBe(PARTY)
})

test('adults counter can be decremented', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  const c = counterByTitle(page, 'Adultos')
  const before = await counterValue(c)
  await c.getByRole('button', { name: 'Disminuir' }).click()
  expect(await counterValue(c)).toBe(before - 1)
})

test('adults minimum is 1', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  const c = counterByTitle(page, 'Adultos')
  await decTo(c, 1)
  expect(await counterValue(c)).toBe(1)
  await expect(c.getByRole('button', { name: 'Disminuir' })).toBeDisabled()
})

test('adults maximum is party size', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  const c = counterByTitle(page, 'Adultos')
  await incTo(c, PARTY)
  expect(await counterValue(c)).toBe(PARTY)
  await expect(c.getByRole('button', { name: 'Aumentar' })).toBeDisabled()
})

test('children derived from party size minus adults', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  const c = counterByTitle(page, 'Adultos')
  await decTo(c, 1) // adults=1 → children = PARTY-1
  expect(await counterValue(c)).toBe(1)
  await clickNext(page)
  // children > 0 → accessories step appears, implying children present.
  await expect(page.locator('.resvCardTitle', { hasText: 'Accesorios para bebés' })).toBeVisible()
})

test('accessories step appears when children > 0', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  const c = counterByTitle(page, 'Adultos')
  await decTo(c, 1) // at least 1 child
  await clickNext(page)
  await expect(page.locator('.resvCardTitle', { hasText: 'Accesorios para bebés' })).toBeVisible()
})

test('accessories step skipped when no children', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  const c = counterByTitle(page, 'Adultos')
  expect(await counterValue(c)).toBe(PARTY) // adults = party, 0 children
  await clickNext(page)
  await expect(page.locator('.resvCardTitle', { hasText: 'Resumen de tu reserva' })).toBeVisible()
  await expect(page.locator('.resvCardTitle', { hasText: 'Accesorios para bebés' })).toHaveCount(0)
})

test('high chairs counter range 0-3', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  await decTo(counterByTitle(page, 'Adultos'), 1)
  await clickNext(page)
  await expect(page.locator('.resvCardTitle', { hasText: 'Accesorios para bebés' })).toBeVisible()
  const hc = counterByTitle(page, 'Tronas')
  expect(await counterValue(hc)).toBe(0)
  await incTo(hc, 99)
  expect(await counterValue(hc)).toBe(3)
  await expect(hc.getByRole('button', { name: 'Aumentar' })).toBeDisabled()
})

test('baby strollers counter range 0-5', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  await decTo(counterByTitle(page, 'Adultos'), 1)
  await clickNext(page)
  await expect(page.locator('.resvCardTitle', { hasText: 'Accesorios para bebés' })).toBeVisible()
  const st = counterByTitle(page, 'Carros de bebé')
  expect(await counterValue(st)).toBe(0)
  await incTo(st, 99)
  expect(await counterValue(st)).toBe(5)
  await expect(st.getByRole('button', { name: 'Aumentar' })).toBeDisabled()
})

test('completes booking with children and accessories', async ({ page }) => {
  await reachAdults(page, String(PARTY))
  await decTo(counterByTitle(page, 'Adultos'), 1) // 1 child
  await clickNext(page)
  await expect(page.locator('.resvCardTitle', { hasText: 'Accesorios para bebés' })).toBeVisible()
  await incTo(counterByTitle(page, 'Tronas'), 1)
  await incTo(counterByTitle(page, 'Carros de bebé'), 1)
  await clickNext(page)

  await expect(page.locator('.resvCardTitle', { hasText: 'Resumen de tu reserva' })).toBeVisible()
  // Accept terms + privacy.
  const checks = page.locator('.resvCheckbox')
  await checks.nth(0).click()
  await checks.nth(1).click()

  const submit = page.getByRole('button', { name: 'Completar reserva', exact: true })
  await expect(submit).toBeVisible()
  // Backend rejects submissions faster than a few seconds after form load (anti-spam).
  await page.waitForTimeout(6000)
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/bookings/front'), { timeout: 20_000 }),
    submit.click(),
  ])
  expect(resp.ok()).toBeTruthy()
})

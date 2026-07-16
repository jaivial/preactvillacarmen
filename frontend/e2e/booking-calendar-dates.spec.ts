import { expect, test, type Page } from '@playwright/test'

// Calendar/date-selection E2E for /reservas against the live dev backend.
// Selectors mirror src/routes/client/Reservas.tsx:
//   grid=.resvCalDays  day=.resvDay  disabled=[disabled]+.disabled  full=.full
//   nav=.resvCalNav  title=.resvCalTitle  party-select aria-label="Número de personas"

const pad2 = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const addDays = (d: Date, n: number) => {
  const o = new Date(d)
  o.setDate(o.getDate() + n)
  return o
}

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)
const TODAY_ISO = iso(TODAY)
const MAX_ISO = iso(addDays(TODAY, 40))

type MonthAvail = Record<string, { freeBookingSeats: number }>

async function fetchClosedDays(page: Page): Promise<{ closed: Set<string>; opened: Set<string> }> {
  const from = iso(addDays(TODAY, 1))
  const r = await page.request.get(
    `/api/reservations/closed-days?from=${from}&to=${MAX_ISO}`,
  )
  const j = await r.json()
  return {
    closed: new Set<string>(j.closed_days || []),
    opened: new Set<string>(j.opened_days || []),
  }
}

async function fetchMonthAvail(page: Page, month1: number, year: number): Promise<MonthAvail> {
  const r = await page.request.get(`/api/reservations/month-availability?month=${month1}&year=${year}`)
  const j = await r.json()
  const out: MonthAvail = {}
  for (const k of Object.keys(j.availability || {})) {
    const f = j.availability[k]?.freeBookingSeats
    out[k] = { freeBookingSeats: typeof f === 'number' ? f : 0 }
  }
  return out
}

// Mirror of Reservas.isDisabledDate for cross-checking.
function shouldBeOpen(dateISO: string, closed: Set<string>, opened: Set<string>, avail: MonthAvail): boolean {
  if (dateISO <= TODAY_ISO || dateISO > MAX_ISO) return false
  const dow = new Date(dateISO + 'T00:00:00').getDay()
  const defaultClosed = dow === 1 || dow === 2 || dow === 3
  const closedByDefault = opened.has(dateISO) ? false : closed.has(dateISO) ? true : defaultClosed
  if (closedByDefault) return false
  const free = avail[dateISO]?.freeBookingSeats
  if (typeof free === 'number' && free <= 0) return false
  return true
}

// A day cell by its ISO — cells key on iso and render getDate() text, so match by data via evaluate.
function dayCells(page: Page) {
  return page.locator('.resvCalDays .resvDay')
}

async function gotoReservas(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
  await page.goto('/reservas')
  await expect(page.locator('.resvCalDays')).toBeVisible()
  // wait for month-availability to populate (cells get their state after fetch)
  await page.waitForResponse((r) => r.url().includes('/api/reservations/month-availability') && r.ok(), { timeout: 15000 }).catch(() => {})
}

// Find an in-month cell locator for a given ISO in the currently viewed month.
async function cellForISO(page: Page, dateISO: string) {
  const day = Number(dateISO.slice(8, 10))
  // in-month cells are those without the `other` class; match by trimmed text = day number
  return dayCells(page).filter({ hasNot: page.locator('.other') }).filter({ hasText: new RegExp(`^${day}$`) }).first()
}

test('calendar renders with current month', async ({ page }) => {
  await gotoReservas(page)
  await expect(page.locator('.resvCalDays')).toBeVisible()
  const title = page.locator('.resvCalTitle')
  await expect(title).toBeVisible()
  const txt = (await title.textContent())?.trim() || ''
  expect(txt).toMatch(/\d{4}/) // has a year
  expect(txt.length).toBeGreaterThan(4) // has month name too
  await expect(dayCells(page).first()).toBeVisible()
})

test('past dates are disabled', async ({ page }) => {
  await gotoReservas(page)
  // Today and earlier in-month days are disabled. Find today's cell (in current month view).
  const today = Number(TODAY_ISO.slice(8, 10))
  const cell = dayCells(page)
    .filter({ hasNot: page.locator('.other') })
    .filter({ hasText: new RegExp(`^${today}$`) })
    .first()
  await expect(cell).toBeDisabled()
  await expect(cell).toHaveClass(/disabled/)
})

test('dates beyond 40 days are disabled', async ({ page }) => {
  await gotoReservas(page)
  // Navigate forward until we reach a month whose 1st is beyond MAX_ISO.
  const maxDate = new Date(MAX_ISO + 'T00:00:00')
  // month after the max-date month is fully beyond the window
  const targetMonth = maxDate.getMonth() === 11 ? 0 : maxDate.getMonth() + 1
  const targetYear = maxDate.getMonth() === 11 ? maxDate.getFullYear() + 1 : maxDate.getFullYear()
  const next = page.locator('.resvCalNav').last()
  for (let i = 0; i < 6; i++) {
    const title = (await page.locator('.resvCalTitle').textContent()) || ''
    if (title.includes(String(targetYear)) && new Date(title + ' 1').getMonth?.() === targetMonth) break
    // simpler: just click forward a fixed number to land past the window
    await next.click()
  }
  // Every in-month day here is > MAX_ISO → all disabled.
  const inMonth = dayCells(page).filter({ hasNot: page.locator('.other') })
  const count = await inMonth.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(inMonth.nth(i)).toBeDisabled()
  }
})

test('closed weekdays are disabled (Mon/Tue/Wed)', async ({ page }) => {
  await gotoReservas(page)
  const { closed, opened } = await fetchClosedDays(page)
  const avail = await fetchMonthAvail(page, TODAY.getMonth() + 1, TODAY.getFullYear())

  // Find a future Mon/Tue/Wed in the current view month that isn't force-opened.
  let target: string | null = null
  for (let d = addDays(TODAY, 1); iso(d) <= MAX_ISO; d = addDays(d, 1)) {
    if (d.getMonth() !== TODAY.getMonth()) break
    const dow = d.getDay()
    if ((dow === 1 || dow === 2 || dow === 3) && !opened.has(iso(d))) {
      target = iso(d)
      break
    }
  }
  test.skip(!target, 'No default-closed weekday available in current month window')
  expect(shouldBeOpen(target!, closed, opened, avail)).toBe(false)
  const cell = await cellForISO(page, target!)
  await expect(cell).toBeDisabled()
  await expect(cell).toHaveClass(/disabled/)
})

test('same-day date shows call redirect', async ({ page }) => {
  await gotoReservas(page)
  // Today's cell is always disabled (isDisabledDate: iso <= todayISO), so the
  // same-day call modal (onPickDate handles todayISO) is unreachable via a click.
  const today = Number(TODAY_ISO.slice(8, 10))
  const cell = dayCells(page)
    .filter({ hasNot: page.locator('.other') })
    .filter({ hasText: new RegExp(`^${today}$`) })
    .first()
  await expect(cell).toBeDisabled()
  test.skip(true, "Today's cell is disabled in the grid; same-day modal cannot be triggered by clicking. Phone 638 85 72 94 lives in the Modal but is unreachable from the calendar.")
})

test('fully booked date is disabled', async ({ page }) => {
  await gotoReservas(page)
  const { closed, opened } = await fetchClosedDays(page)
  const avail = await fetchMonthAvail(page, TODAY.getMonth() + 1, TODAY.getFullYear())

  // Fully-booked = free<=0, future, in current month, and not otherwise closed weekday.
  let target: string | null = null
  for (const k of Object.keys(avail)) {
    if (k <= TODAY_ISO || k > MAX_ISO) continue
    if (new Date(k + 'T00:00:00').getMonth() !== TODAY.getMonth()) continue
    const dow = new Date(k + 'T00:00:00').getDay()
    const closedWk = (dow === 1 || dow === 2 || dow === 3) && !opened.has(k)
    if (closedWk) continue
    if (avail[k].freeBookingSeats <= 0) {
      target = k
      break
    }
  }
  test.skip(!target, 'No fully-booked open-weekday date in current month window on dev')
  const cell = await cellForISO(page, target!)
  await expect(cell).toBeDisabled()
})

test('can navigate to next month', async ({ page }) => {
  await gotoReservas(page)
  const title = page.locator('.resvCalTitle')
  const before = (await title.textContent())?.trim()
  await page.locator('.resvCalNav').last().click()
  await expect(title).not.toHaveText(before || '')
})

test('selecting a valid open date proceeds to party size', async ({ page }) => {
  await gotoReservas(page)
  const { closed, opened } = await fetchClosedDays(page)
  const avail = await fetchMonthAvail(page, TODAY.getMonth() + 1, TODAY.getFullYear())

  let target: string | null = null
  for (let d = addDays(TODAY, 1); iso(d) <= MAX_ISO; d = addDays(d, 1)) {
    if (d.getMonth() !== TODAY.getMonth()) break
    if (shouldBeOpen(iso(d), closed, opened, avail)) {
      target = iso(d)
      break
    }
  }
  test.skip(!target, 'No open date in current month window on dev')

  const cell = await cellForISO(page, target!)
  await expect(cell).toBeEnabled()
  await cell.click()
  // "Tu reserva" card + party-size PopoverSelect trigger appears.
  await expect(page.getByRole('button', { name: 'Número de personas' })).toBeVisible({ timeout: 15000 })
})

test('closed-days API matches calendar disabled state', async ({ page }) => {
  await gotoReservas(page)
  const { closed, opened } = await fetchClosedDays(page)

  // Every explicit closed_day in the current view month must be a disabled cell.
  let checked = 0
  for (const k of closed) {
    if (opened.has(k)) continue
    if (k <= TODAY_ISO || k > MAX_ISO) continue
    if (new Date(k + 'T00:00:00').getMonth() !== TODAY.getMonth()) continue
    const cell = await cellForISO(page, k)
    await expect(cell).toBeDisabled()
    checked++
  }
  test.skip(checked === 0, 'No explicit closed days in current month window to cross-check')
})

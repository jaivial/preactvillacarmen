import type { Lang } from './i18n'

/**
 * Date helpers and grey-out rules for the reservation calendar, shared by the
 * booking wizard and the self-service modify wizard so both offer exactly the
 * same selectable days.
 *
 * Coordination id: reservation_calendar_rules_v1
 */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoFromLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function parseISODateLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const da = Number(m[3])
  const d = new Date(y, mo, da)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDaysLocal(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

export function monthName(monthIndex0: number, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(2024, monthIndex0, 1))
}

export function buildCalendarCells(year: number, month0: number): { date: Date; iso: string; inMonth: boolean }[] {
  const first = new Date(year, month0, 1)
  const firstDow = first.getDay() // 0=Sun
  const offsetMonFirst = (firstDow + 6) % 7 // 0=Mon
  const start = addDaysLocal(first, -offsetMonFirst)
  const cells: { date: Date; iso: string; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = addDaysLocal(start, i)
    cells.push({ date: d, iso: isoFromLocalDate(d), inMonth: d.getMonth() === month0 })
  }
  return cells
}

/**
 * Normalises the `closed_days` / `opened_days` payload (plain dates or
 * datetimes) into a lookup set.
 */
export function normalizeDateSet(values: unknown): Set<string> {
  const out = new Set<string>()
  if (!Array.isArray(values)) return out
  for (const value of values) {
    const raw = String(value ?? '').trim()
    if (!raw) continue
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw)
    out.add(match ? match[1] : raw)
  }
  return out
}

export type CalendarSpecialDate = { is_active?: boolean; prereserva_enabled?: boolean }

export type CalendarRuleContext = {
  todayISO: string
  /** Last bookable day (today + 40). */
  maxISO: string
  openedDays: ReadonlySet<string>
  closedDays: ReadonlySet<string>
  specialDates: Record<string, CalendarSpecialDate>
  monthAvailability: Record<string, { freeBookingSeats: number }> | null
}

/** Mon/Tue/Wed are closed unless the day is explicitly opened. */
export function isClosedByDefaultISO(
  iso: string,
  openedDays: ReadonlySet<string>,
  closedDays: ReadonlySet<string>,
): boolean {
  const d = parseISODateLocal(iso)
  if (!d) return true
  const dow = d.getDay()
  const defaultClosed = dow === 1 || dow === 2 || dow === 3
  if (openedDays.has(iso)) return false
  if (closedDays.has(iso)) return true
  return defaultClosed
}

/**
 * Coordination id: special_booking_v1
 * Active special dates with prereserva_enabled bypass ALL the grey-out rules:
 * Mon/Tue defaults, explicit closed days and the 40-day window. Only past days
 * remain disabled.
 */
export function isPrereservaSpecialISO(iso: string, specialDates: Record<string, CalendarSpecialDate>): boolean {
  const sd = specialDates[iso]
  return Boolean(sd && sd.is_active && sd.prereserva_enabled)
}

export function isCalendarDateDisabled(iso: string, inMonth: boolean, ctx: CalendarRuleContext): boolean {
  if (!inMonth) return true
  if (iso < ctx.todayISO) return true
  const free = ctx.monthAvailability?.[iso]?.freeBookingSeats
  if (isPrereservaSpecialISO(iso, ctx.specialDates)) {
    if (typeof free === 'number' && free <= 0) return true
    return false
  }
  if (iso > ctx.maxISO) return true
  if (isClosedByDefaultISO(iso, ctx.openedDays, ctx.closedDays)) return true
  if (typeof free === 'number' && free <= 0) return true
  return false
}

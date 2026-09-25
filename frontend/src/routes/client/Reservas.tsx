import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { Banknote, CreditCard, Landmark, Plus, Smartphone, Trash2 } from 'lucide-react'
import { apiFetch, apiGetJson } from '../../lib/api'
import { localized, localizedArray, useI18n } from '../../lib/i18n'
import type { Lang } from '../../lib/i18n'
import type {
  ClosedDaysResponse,
  HourDataResponse,
  InsertBookingResponse,
  MesasDeDosResponse,
  MandatoryMenuResponse,
  MonthAvailabilityResponse,
  PaymentMethodKey,
  ReservationDayContextFloor,
  ReservationDayContextResponse,
  RiceTypesResponse,
  SpecialDatePublic,
  SpecialDateResponse,
  SpecialDateSummary,
  SpecialDatesResponse,
  ValidGroupMenusForPartySizeResponse,
  GroupMenuDisplay,
  PublicMenu,
} from '../../lib/types'
import { PopoverSelect, type PopoverSelectOption } from '../../components/reservas/PopoverSelect'
import { CounterGroup, type CounterField } from '../../components/reservas/CounterGroup'
import { Checkbox } from '../../components/reservas/Checkbox'
import { InlineCounter } from '../../components/reservas/InlineCounter'
import { Counter } from '../../components/reservas/Counter'
import { Modal } from '../../components/reservas/Modal'
import { DuplicateBookingModal } from '../../components/reservas/DuplicateBookingModal'
import { buildCountries, countrySelectOptions } from '../../components/reservas/countryOptions'
import { lookupDuplicateReservation, storeSelfServiceProof, type DuplicateCheckResponse } from '../../lib/reservationSelfService'
import { onlyDigits } from '../../lib/phone'
import { fetchMenuByID } from '../../lib/menuApi'
import {
  addDaysLocal,
  isClosedByDefaultISO,
  isPrereservaSpecialISO,
  normalizeDateSet,
  isoFromLocalDate,
  parseISODateLocal,
  startOfDayLocal,
  type CalendarRuleContext,
} from '../../lib/reservationCalendar'
import { ReservationCalendar } from '../../components/reservas/ReservationCalendar'
import { ReservationHourPicker } from '../../components/reservas/ReservationHourPicker'
import { ReservationChoice } from '../../components/reservas/ReservationChoice'

type ToastType = 'error' | 'warning' | 'success' | 'info'
type Toast = { id: number; type: ToastType; title: string; message: string }

type StepId = 'date' | 'mandatoryMenu' | 'specialMenu' | 'specialPrincipales' | 'mobility' | 'groupMenu' | 'rice' | 'personal' | 'adults' | 'summary'

const STEP_IDS: StepId[] = ['date', 'mandatoryMenu', 'specialMenu', 'specialPrincipales', 'mobility', 'groupMenu', 'rice', 'personal', 'adults', 'summary']

// Coordination id: mobility_day_override_v1 — resolved mobility setting for a
// date (global default + per-day override, the concrete day wins). Primary is
// the day-context payload, which exists for any day; the special-date payloads
// only cover its loading window, so the question never flickers on.
const resolveMobilityEnabled = (
  dayCtx?: { mobility_enabled?: boolean } | null,
  fallback?: { mobility_enabled?: boolean } | null
): boolean => dayCtx?.mobility_enabled ?? fallback?.mobility_enabled ?? false

type PrincipalesRow = { name: string; servings: number }

type SpecialPrincipalesRow = { name: string; servings: number }

type SpecialMenuSelection = {
  special_date_menu_id: number
  count: number
  // Rows per principales group (group key -> rows). See SpecialPrincipalesGroup.
  rows: Record<string, SpecialPrincipalesRow[]>
}

// Coordination id: special_menu_principales_v1
// Main courses a guest must choose for one special-date menu. A special-type
// menu yields one group per image section that has dishes; a regular menu
// yields a single group from its "principales" section. No groups == nothing
// to choose (also when the toggle is on but no dish was added).
type SpecialPrincipalesGroup = {
  key: string
  title: string
  options: string[]
  dishIds: Record<string, number>
}

function specialPrincipalesGroupsFor(menu: PublicMenu | null | undefined): SpecialPrincipalesGroup[] {
  if (!menu) return []
  if (menu.menu_type === 'special') {
    return (menu.special_menu_sections || [])
      .filter((sec) => Array.isArray(sec.principales) && sec.principales.length > 0)
      .map((sec) => ({
        key: `section-${sec.id}`,
        title: sec.title,
        options: sec.principales.map((p) => p.title),
        dishIds: Object.fromEntries(sec.principales.map((p) => [p.title, p.dish_id])),
      }))
  }
  const options = getPrincipalesItemsPublic(menu)
  if (options.length === 0) return []
  const dishIds: Record<string, number> = {}
  for (const sec of Array.isArray(menu.sections) ? menu.sections : []) {
    if (!sec || sec.kind !== 'principales') continue
    for (const d of Array.isArray(sec.dishes) ? sec.dishes : []) {
      if (d && typeof d.title === 'string' && typeof d.id === 'number' && d.title.trim()) dishIds[d.title.trim()] = d.id
    }
  }
  return [{ key: 'principales', title: '', options, dishIds }]
}

// Coordination id: special_date_section_menus_v1
// A special-type menu is booked per image section, so the wizard expands it
// into one bookable entry per section: its own counter, price, adelanto and
// principales. Entry ids are negative (never clash with special_date_menu ids)
// and the submit regroups them into menus[].sections[].
function specialSectionEntryId(sectionId: number): number {
  return -sectionId
}

// Readable test-id key for a step-2 entry: "section-<id>" or the menu id.
function specialEntryKey(menu: { id: number; section?: { section_id: number } }): string {
  return menu.section ? `section-${menu.section.section_id}` : String(menu.id)
}

function expandSpecialDateMenus(sd: SpecialDatePublic): SpecialDatePublic {
  const menus = (sd.menus || []).flatMap((m) => {
    if (!m.is_special_menu || !Array.isArray(m.sections) || m.sections.length === 0) return [m]
    return m.sections.map((sec) => ({
      id: specialSectionEntryId(sec.id),
      menu_id: m.menu_id,
      label: sec.title ? `${m.label} · ${sec.title}` : m.label,
      price: sec.price,
      is_custom: false,
      adelanto_amount: sec.adelanto_amount,
      section: { special_date_menu_id: m.id, section_id: sec.id, title: sec.title, principales: sec.principales || [] },
    }))
  })
  return { ...sd, menus }
}

// Coordination id: special_menu_url_state_v1
// Festive selections live in the URL so every step rehydrates on refresh:
//   ?sm=<entryId>:<count>,<entryId>:<count>
//   &sp=<entryId>.<groupKey>.<dishIndex>*<servings>|…   (dish index in group.options)
//   &pm=<payment method>
// Entry ids may be negative (section entries), so ":" / "." / "*" / "|" are the separators.
function encodeSpecialCounts(selections: Record<number, SpecialMenuSelection>): string {
  return Object.values(selections)
    .filter((sel) => sel && sel.count > 0)
    .map((sel) => `${sel.special_date_menu_id}:${sel.count}`)
    .join(',')
}

function decodeSpecialCounts(raw: string | null): Record<number, SpecialMenuSelection> {
  const out: Record<number, SpecialMenuSelection> = {}
  for (const part of (raw || '').split(',')) {
    const [id, count] = part.split(':').map(Number)
    if (Number.isFinite(id) && id !== 0 && Number.isFinite(count) && count > 0) out[id] = { special_date_menu_id: id, count, rows: {} }
  }
  return out
}

function encodeSpecialRows(selections: Record<number, SpecialMenuSelection>, groupsByMenu: Record<number, SpecialPrincipalesGroup[]>): string {
  const parts: string[] = []
  for (const sel of Object.values(selections)) {
    for (const group of groupsByMenu[sel.special_date_menu_id] || []) {
      for (const row of sel.rows[group.key] || []) {
        const idx = group.options.indexOf(row.name)
        if (idx >= 0 && row.servings > 0) parts.push(`${sel.special_date_menu_id}.${group.key}.${idx}*${row.servings}`)
      }
    }
  }
  return parts.join('|')
}

function applySpecialRows(
  raw: string | null,
  selections: Record<number, SpecialMenuSelection>,
  groupsByMenu: Record<number, SpecialPrincipalesGroup[]>
): Record<number, SpecialMenuSelection> {
  if (!raw) return selections
  const next = { ...selections }
  for (const part of raw.split('|')) {
    const m = /^(-?\d+)\.(.+)\.(\d+)\*(\d+)$/.exec(part)
    if (!m) continue
    const [id, key, idx, servings] = [Number(m[1]), m[2], Number(m[3]), Number(m[4])]
    const sel = next[id]
    const name = (groupsByMenu[id] || []).find((g) => g.key === key)?.options[idx]
    if (!sel || !name || servings <= 0) continue
    const rows = sel.rows[key] || []
    if (rows.some((r) => r.name === name)) continue
    next[id] = { ...sel, rows: { ...sel.rows, [key]: [...rows, { name, servings }] } }
  }
  return next
}

function flattenSpecialRows(sel: SpecialMenuSelection | undefined): SpecialPrincipalesRow[] {
  return sel ? Object.values(sel.rows || {}).flat() : []
}

function sumSpecialServings(rows: SpecialPrincipalesRow[] | undefined): number {
  return (rows || []).reduce((acc, r) => acc + (Number(r.servings) || 0), 0)
}

// Coordination id: special_menu_principales_step_v1 - when a menu count goes
// down, trim its rows (last first) so no group's servings exceed the count.
function capSpecialRows(rows: Record<string, SpecialPrincipalesRow[]>, count: number): Record<string, SpecialPrincipalesRow[]> {
  const out: Record<string, SpecialPrincipalesRow[]> = {}
  for (const [key, list] of Object.entries(rows || {})) {
    let left = count
    const kept: SpecialPrincipalesRow[] = []
    for (const r of list) {
      if (left <= 0) break
      const servings = Math.min(r.servings, left)
      kept.push({ ...r, servings })
      left -= servings
    }
    out[key] = kept
  }
  return out
}

// Coordination id: special_booking_v1
// Spanish label map for payment methods exposed to the user on special dates.
const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  card: 'Tarjeta',
  bizum: 'Bizum',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  stripe: 'Tarjeta (online)',
}

const PAYMENT_METHOD_OPTIONS: PaymentMethodKey[] = ['card', 'bizum', 'transferencia', 'efectivo']

// Coordination id: festive_menu_counter_v1 - one icon per deposit method.
const PAYMENT_METHOD_ICONS: Record<PaymentMethodKey, typeof CreditCard> = {
  card: CreditCard,
  bizum: Smartphone,
  transferencia: Landmark,
  efectivo: Banknote,
  stripe: CreditCard,
}

function paymentMethodOptions(methods: PaymentMethodKey[]): { value: PaymentMethodKey; label: string }[] {
  const allowed = methods.length > 0 ? methods : PAYMENT_METHOD_OPTIONS
  return allowed.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))
}


function textFor(lang: Lang, es: string, en: string) {
  return lang === 'en' ? en : es
}

function reservationDateDisplay(iso: string, lang: Lang) {
  const d = parseISODateLocal(iso)
  if (!d) return ''
  const date = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  return `${textFor(lang, 'Reserva para', 'Reservation for')} ${date}`
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'string' ? x : String(x)))
    .map((s) => s.trim())
    .filter(Boolean)
}

function getPrincipalesItems(menu: GroupMenuDisplay | null): string[] {
  if (!menu || !menu.principales || typeof menu.principales !== 'object') return []
  const items = (menu.principales as any).items
  return readStringArray(items)
}

function getPrincipalesItemsPublic(menu: any | null): string[] {
  if (!menu || !menu.principales || typeof menu.principales !== 'object') return []
  const items = (menu.principales as any).items
  return readStringArray(items)
}

function getPrincipalesTitle(menu: GroupMenuDisplay | null, lang: Lang): string {
  if (!menu || !menu.principales || typeof menu.principales !== 'object') return textFor(lang, 'Principales', 'Main courses')
  const es = (menu.principales as any).titulo_principales
  const en = menu.principales_english?.titulo_principales
  return localized(typeof es === 'string' && es.trim() ? es.trim() : 'Principales', en, lang)
}

function ToastIcon(props: { type: ToastType; testId: string }) {
  const tid = props.testId
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  } as const

  if (props.type === 'success') {
    return (
      <svg {...common} data-testid={tid}>
        <path
          data-testid={`${tid}-check`}
          d="M20 7L10.5 16.5L4 10"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    )
  }

  if (props.type === 'error') {
    return (
      <svg {...common} data-testid={tid}>
        <path
          data-testid={`${tid}-cross`}
          d="M18 6L6 18M6 6l12 12"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    )
  }

  if (props.type === 'info') {
    return (
      <svg {...common} data-testid={tid}>
        <path
          data-testid={`${tid}-stem`}
          d="M12 17v-6"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          data-testid={`${tid}-dot`}
          d="M12 7h.01"
          stroke="currentColor"
          stroke-width="3.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          data-testid={`${tid}-circle`}
          d="M21 12a9 9 0 11-18 0a9 9 0 0118 0Z"
          stroke="currentColor"
          stroke-width="2.0"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.2"
        />
      </svg>
    )
  }

  // warning
  return (
    <svg {...common} data-testid={tid}>
      <path
        data-testid={`${tid}-stem`}
        d="M12 9v5"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        data-testid={`${tid}-dot`}
        d="M12 17h.01"
        stroke="currentColor"
        stroke-width="3.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        data-testid={`${tid}-triangle`}
        d="M10.3 3.7h3.4l9 16.6a1.2 1.2 0 01-1.05 1.8H2.35A1.2 1.2 0 011.3 20.3l9-16.6Z"
        stroke="currentColor"
        stroke-width="2.0"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.2"
      />
    </svg>
  )
}

export function Reservas() {
  const reduceMotion = useReducedMotion()
  const { t, lang } = useI18n()
  const text = (es: string, en: string) => textFor(lang, es, en)
  const formLoadTimeRef = useRef(Math.floor(Date.now() / 1000))
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)

  const pushToast = (type: ToastType, title: string, message: string) => {
    const id = ++toastIdRef.current
    const t: Toast = { id, type, title, message }
    setToasts((prev) => [...prev, t])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 5200)
  }

  const today = useMemo(() => startOfDayLocal(new Date()), [])
  // Coordination id: special_booking_v1
  // The ordinary booking window. Only an active special date with prereserva
  // may be booked past this, and ONLY that exact date — see
  // `isPrereservaSpecial` in `isDisabledDate` / `onPickDate`. Widening this
  // bound instead would open every ordinary day in between, which is not
  // what the bypass is for.
  const BOOKING_MAX_DAYS = 40
  // Upper bound for data fetches (closed days). It stretches to the furthest
  // special date so those days render with real data, but it deliberately
  // does NOT govern whether a date is bookable. The cap of 6 months prevents
  // unbounded growth when many special dates are scheduled.
  const SPECIAL_MAX_DAYS = 183
  const [specialDatesMap, setSpecialDatesMap] = useState<Record<string, SpecialDateSummary>>({})
  const maxDate = useMemo(() => {
    let furthest = addDaysLocal(today, BOOKING_MAX_DAYS)
    const cap = addDaysLocal(today, SPECIAL_MAX_DAYS)
    for (const iso of Object.keys(specialDatesMap)) {
      const sd = specialDatesMap[iso]
      if (!sd || !sd.is_active || !sd.prereserva_enabled) continue
      const d = parseISODateLocal(iso)
      if (!d) continue
      if (d > furthest && d <= cap) furthest = d
      else if (d > cap) {
        furthest = cap
        break
      }
    }
    return furthest
  }, [today, specialDatesMap])
  const todayISO = useMemo(() => isoFromLocalDate(today), [today])
  // Fetch bound: may reach a far special date so its day has real data.
  const maxISO = useMemo(() => isoFromLocalDate(maxDate), [maxDate])
  // Booking bound: the plain 40-day rule, never stretched. Ordinary dates are
  // measured against this, so a distant special date no longer opens up every
  // day between today and itself.
  const bookingMaxISO = useMemo(
    () => isoFromLocalDate(addDaysLocal(today, BOOKING_MAX_DAYS)),
    [today],
  )
  // Coordination id: special_booking_v1
  // Discovery horizon for the special-dates lookup. It must NOT depend on
  // `maxISO`: `maxISO` only extends once a special date is already known, so
  // querying up to `maxISO` could never find one past the default 40-day
  // window — the bypass below was unreachable for exactly the dates it
  // exists for. Querying the full cap breaks that cycle. It matches the
  // server's own `publicSpecialDatesMaxRangeDays`, so the span is accepted.
  const specialLookupToISO = useMemo(
    () => isoFromLocalDate(addDaysLocal(today, SPECIAL_MAX_DAYS)),
    [today],
  )

  const [closedDays, setClosedDays] = useState<Set<string>>(new Set())
  const [openedDays, setOpenedDays] = useState<Set<string>>(new Set())
  const [monthAvailability, setMonthAvailability] = useState<Record<string, { freeBookingSeats: number }> | null>(null)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth0, setViewMonth0] = useState(today.getMonth())

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dateDisplay, setDateDisplay] = useState<string>('')
  const [freeSeats, setFreeSeats] = useState<number | null>(null)
  const [twoTopAvailable, setTwoTopAvailable] = useState<boolean>(true)
  const [hourData, setHourData] = useState<HourDataResponse | null>(null)
  const [dayContext, setDayContext] = useState<ReservationDayContextResponse | null>(null)
  const [activeFloors, setActiveFloors] = useState<ReservationDayContextFloor[]>([])
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(null)
  const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null)
  const [selectedShift, setSelectedShift] = useState<'morning' | 'night' | null>(null)

  const [partySize, setPartySize] = useState<number | null>(null)
  const [reservationTime, setReservationTime] = useState<string | null>(null)

  const [step, setStep] = useState<StepId>('date')
  // Coordination id: mobility_issues_v1 — only asked when the selected day's
  // resolved setting (mobility_day_override_v1) enables the question.
  const [hasMobilityIssues, setHasMobilityIssues] = useState<boolean | null>(null)
  const [mobilityPeople, setMobilityPeople] = useState<number>(1)
  const stepsScrollerRef = useRef<HTMLDivElement | null>(null)
  const stepsScrollRafRef = useRef<number | null>(null)
  const pageScrollRafRef = useRef<number | null>(null)
  const prevStepRef = useRef<StepId | null>(null)

  // Shareable URL state: ?step=rice&date=2026-08-10&party=4
  const initialUrlStateRef = useRef<{ step: StepId | null; date: string | null; party: number | null; sm: string | null; sp: string | null; pm: string | null } | null>(null)
  // Coordination id: special_menu_url_state_v1 - main-course rows from ?sp=
  // wait here until the menus' principales groups are loaded.
  const pendingSpecialRowsRef = useRef<string | null>(null)
  const urlSyncReadyRef = useRef(false)
  // Blocks the URL writer while the async restore is still resolving.
  // Without it, loadDateContext sets `selectedDate` mid-restore, the sync
  // effect fires while `step` is still 'date', and it strips ?step= from the
  // URL before the resolver has decided where the guest belongs.
  const restoringRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const rawStep = params.get('step')
    const stepParam = rawStep && (STEP_IDS as string[]).includes(rawStep) ? (rawStep as StepId) : null
    const rawParty = Number(params.get('party'))
    const partyParam = Number.isFinite(rawParty) && rawParty >= 2 ? rawParty : null
    initialUrlStateRef.current = { step: stepParam, date: params.get('date'), party: partyParam, sm: params.get('sm'), sp: params.get('sp'), pm: params.get('pm') }
    return () => {
      initialUrlStateRef.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!urlSyncReadyRef.current) {
      urlSyncReadyRef.current = true
      return
    }
    if (restoringRef.current) return
    const params = new URLSearchParams(window.location.search)
    const curStep = params.get('step') || null
    const curDate = params.get('date') || null
    const curParty = params.get('party') || null
    const nextStep = step === 'date' ? null : step
    const nextDate = selectedDate || null
    const nextParty = partySize ? String(partySize) : null
    // Skip write if state already matches URL (avoids clobbering other params).
    if (curStep === nextStep && curDate === nextDate && curParty === nextParty) return
    const setOrDelete = (key: string, value: string | null) => {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    setOrDelete('step', nextStep)
    setOrDelete('date', nextDate)
    setOrDelete('party', nextParty)
    const qs = params.toString()
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    window.history.replaceState(window.history.state, '', next)
  }, [step, selectedDate, partySize])

  // Group menus.
  const [groupMenus, setGroupMenus] = useState<GroupMenuDisplay[] | null>(null)
  const [wantsGroupMenu, setWantsGroupMenu] = useState<boolean | null>(null)
  const [groupMenuId, setGroupMenuId] = useState<number | null>(null)
  const [principalesEnabled, setPrincipalesEnabled] = useState<boolean | null>(null)
  const [principalesRows, setPrincipalesRows] = useState<PrincipalesRow[]>([])

  // Mandatory menus.
  const [mandatoryMenuData, setMandatoryMenuData] = useState<MandatoryMenuResponse | null>(null)
  const [mandatoryMenuId, setMandatoryMenuId] = useState<number | null>(null)
  const [mandatoryPrincipalesEnabled, setMandatoryPrincipalesEnabled] = useState<boolean | null>(null)
  const [mandatoryPrincipalesRows, setMandatoryPrincipalesRows] = useState<PrincipalesRow[]>([])

  // Rice.
  const [riceTypes, setRiceTypes] = useState<string[]>([])
  const [riceTypesEnglish, setRiceTypesEnglish] = useState<string[]>([])
  const [wantsRice, setWantsRice] = useState<boolean | null>(null)
  const [riceType, setRiceType] = useState<string>('')
  const [riceServings, setRiceServings] = useState<number | null>(null)

  // Special date menu step.
  // Coordination id: special_booking_v1
  const [activeSpecialDate, setActiveSpecialDate] = useState<SpecialDatePublic | null>(null)
  const [specialMenuSelections, setSpecialMenuSelections] = useState<Record<number, SpecialMenuSelection>>({})
  const [specialPaymentMethod, setSpecialPaymentMethod] = useState<PaymentMethodKey | null>(null)
  // Coordination id: special_menu_principales_v1
  // Principales groups per non-custom special-date menu, keyed by
  // special_date_menu_id. Loaded lazily by fetching the backing PublicMenu.
  // Each group carries its options and the name -> dish_id map the booking
  // submit needs (the backend validates items[] per menu type).
  const [specialMenuPrincipales, setSpecialMenuPrincipales] = useState<Record<number, SpecialPrincipalesGroup[]>>({})

  // Coordination id: special_menu_url_state_v1 - mirror the festive choices
  // (counts, main courses, payment method) into ?sm=&sp=&pm= so a refresh on
  // any step rehydrates exactly where the guest was. Same guards as the
  // step/date writer: never write while the restore is still resolving.
  useEffect(() => {
    if (typeof window === 'undefined' || !urlSyncReadyRef.current || restoringRef.current) return
    if (pendingSpecialRowsRef.current) return // principales not applied yet
    const params = new URLSearchParams(window.location.search)
    const want: Record<string, string> = activeSpecialDate
      ? { sm: encodeSpecialCounts(specialMenuSelections), sp: encodeSpecialRows(specialMenuSelections, specialMenuPrincipales), pm: specialPaymentMethod || '' }
      : { sm: '', sp: '', pm: '' }
    let changed = false
    for (const [k, v] of Object.entries(want)) {
      if ((params.get(k) || '') === v) continue
      if (v) params.set(k, v)
      else params.delete(k)
      changed = true
    }
    if (!changed) return
    const qs = params.toString()
    window.history.replaceState(window.history.state, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
  }, [activeSpecialDate, specialMenuSelections, specialMenuPrincipales, specialPaymentMethod])

  // Apply ?sp= rows once every counted menu has its principales groups.
  useEffect(() => {
    const raw = pendingSpecialRowsRef.current
    if (!raw || !activeSpecialDate) return
    const counted = Object.values(specialMenuSelections).filter((sel) => sel.count > 0)
    const ready = counted.every((sel) => {
      const m = activeSpecialDate.menus.find((mm) => mm.id === sel.special_date_menu_id)
      return !m || m.is_custom || specialMenuPrincipales[m.id] !== undefined
    })
    if (!ready) return
    pendingSpecialRowsRef.current = null
    setSpecialMenuSelections((prev) => applySpecialRows(raw, prev, specialMenuPrincipales))
    console.log('[checkpoint] special_menu_url_rows_restored')
  }, [activeSpecialDate, specialMenuSelections, specialMenuPrincipales])

  // Coordination id: special_booking_v1
  // Lookup the active special-date summary for the currently selected date.
  // Declared before the steps useMemo and peopleOptions because both depend on it.
  const activeSpecialSummary = selectedDate ? specialDatesMap[selectedDate] : null
  const isSpecialActiveForSelected = Boolean(activeSpecialSummary && activeSpecialSummary.is_active)
  // Coordination id: stripe_prereserva_adelanto_v1 - prereserva + adelanto
  // paid only by Stripe: no method to choose, the summary opens the payment.
  const stripeOnlyAdelanto = Boolean(
    activeSpecialDate &&
      activeSpecialDate.prereserva_enabled &&
      activeSpecialDate.requires_adelanto &&
      (activeSpecialDate.adelanto_payment_methods || []).length === 1 &&
      activeSpecialDate.adelanto_payment_methods[0] === 'stripe'
  )

  // Coordination id: mobility_day_override_v1 — resolved per-day mobility flag
  // (day-context carries the global setting with the per-day override applied;
  // a concrete day wins over the special-date summary). Falls back to the
  // special-date summary only while day-context has not loaded, so the step
  // never flickers on.
  const mobilityEnabledForSelectedDate: boolean = resolveMobilityEnabled(dayContext, activeSpecialSummary)

  // Coordination id: special_booking_v1
  // Lazy-load principales for each non-custom special menu by fetching the
  // underlying PublicMenu. We only request once per special_date_menu_id.
  useEffect(() => {
    if (!activeSpecialDate) return
    // Coordination id: special_date_section_menus_v1 - section entries bring
    // their principales from the special menu configuracion tab.
    const sectionGroups: Record<number, SpecialPrincipalesGroup[]> = {}
    for (const m of activeSpecialDate.menus) {
      if (!m.section || specialMenuPrincipales[m.id]) continue
      sectionGroups[m.id] = m.section.principales.length > 0
        ? [{
            key: `section-${m.section.section_id}`,
            title: '',
            options: m.section.principales.map((p) => p.title),
            dishIds: Object.fromEntries(m.section.principales.map((p) => [p.title, p.dish_id])),
          }]
        : []
    }
    if (Object.keys(sectionGroups).length > 0) {
      setSpecialMenuPrincipales((prev) => ({ ...prev, ...sectionGroups }))
      return
    }
    const missing = activeSpecialDate.menus.filter(
      (m) => !m.is_custom && !m.section && m.menu_id && !specialMenuPrincipales[m.id]
    )
    if (missing.length === 0) return
    let cancelled = false
    ;(async () => {
      const updates: Record<number, SpecialPrincipalesGroup[]> = {}
      await Promise.all(
        missing.map(async (m) => {
          try {
            updates[m.id] = specialPrincipalesGroupsFor(await fetchMenuByID(Number(m.menu_id)))
          } catch {
            updates[m.id] = []
          }
        })
      )
      if (cancelled) return
      if (Object.keys(updates).length > 0) {
        setSpecialMenuPrincipales((prev) => ({ ...prev, ...updates }))
        console.log('[checkpoint] special_menu_principales_loaded', Object.entries(updates).map(([id, g]) => `${id}:${g.length}`).join(','))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeSpecialDate, specialMenuPrincipales])

  // Personal.
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('34')
  const [phoneNational, setPhoneNational] = useState('')

  // Adults/kids.
  const [adults, setAdults] = useState<number | null>(null)

  // Accessories.
  const [highChairs, setHighChairs] = useState(0)
  const [babyStrollers, setBabyStrollers] = useState(0)

  // Terms.
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  // Coordination id: special_booking_v1
  // Special-dates politics acceptance. Required for the summary submit when
  // the booking lands on an active special date.
  const [specialTermsAccepted, setSpecialTermsAccepted] = useState(false)

  const [sameDayOpen, setSameDayOpen] = useState(false)
  const [moreThan10Open, setMoreThan10Open] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  // Coordination id: reservation_self_modification_v1
  // Personal-step duplicate guard: when the typed email / phone already match a
  // live booking for the selected date we stop the wizard and offer to modify.
  const [checkingContact, setCheckingContact] = useState(false)
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResponse | null>(null)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  // Coordination id: special_booking_v1
  // Snapshot of the latest special-date booking that was successfully submitted.
  // Drives the confirmation-modal headline + total-adelanto line for special
  // bookings only.
  const [confirmationSpecial, setConfirmationSpecial] = useState<{
    title: string
    totalAdelanto: number
    paymentMethod: PaymentMethodKey | null
  } | null>(null)

  const dateStepReady = Boolean(
    selectedDate &&
    partySize &&
    reservationTime &&
    activeFloors.length > 0 &&
    // When the floor toggle is off the selector is hidden; don't block the
    // step on the user picking one. When the toggle is on, require the floor
    // the same way as before (single active floor or an explicit pick).
    (dayContext?.locationBooking?.allowFloorReservation === false
      ? true
      : activeFloors.length === 1 || selectedFloorNumber != null) &&
    (dayContext?.openingMode !== 'both' || selectedShift)
  )
  const riceStepReady = wantsRice === false || Boolean(wantsRice && riceType && riceServings && riceServings >= 2 && (!partySize || riceServings <= partySize))
  const personalStepReady = Boolean(
    fullName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    onlyDigits(countryCode).length >= 1 &&
    onlyDigits(countryCode).length <= 4 &&
    onlyDigits(phoneNational).length >= 6 &&
    onlyDigits(phoneNational).length <= 15 &&
    (onlyDigits(countryCode) + onlyDigits(phoneNational)).length <= 15
  )
  const groupMenuStepReady = wantsGroupMenu === false || Boolean(wantsGroupMenu && groupMenuId)

  // Coordination id: special_booking_v1
  // Per-menu summary rows for the "Menú especial" block: paired with the
  // active special date's menus so the summary can list label + count, the
  // tree of principales per menu, and the per-menu / total adelanto.
  const specialSummaryRows = useMemo(() => {
    if (!activeSpecialDate) return [] as { menu: import('../../lib/types').SpecialDateMenuPublic; count: number; rows: SpecialPrincipalesRow[]; subtotal: number }[]
    const menus = activeSpecialDate.menus || []
    const selections = Object.values(specialMenuSelections).filter((s) => s && s.count > 0)
    return selections.map((s) => {
      const menu = menus.find((m) => m.id === s.special_date_menu_id)
      const subtotal = menu && menu.adelanto_amount ? Number(menu.adelanto_amount) * s.count : 0
      return {
        menu: menu || { id: s.special_date_menu_id, label: '', is_custom: false },
        count: s.count,
        rows: flattenSpecialRows(s),
        subtotal,
      }
    })
  }, [activeSpecialDate, specialMenuSelections])

  // Coordination id: special_booking_v1
  // Total adelanto for the active special booking (sum of per-menu
  // adelanto_amount × count). Used in the summary block and the
  // post-submit confirmation modal.
  const specialTotalAdelanto = useMemo(
    () => specialSummaryRows.reduce((acc, r) => acc + (r.subtotal || 0), 0),
    [specialSummaryRows]
  )

  // Coordination id: special_booking_v1
  // Special-terms gating: only required when the booking targets an active
  // special date. Forced false otherwise to keep the submit button available
  // on the legacy flow even if the user toggled it before navigating away.
  const specialTermsRequired = isSpecialActiveForSelected && Boolean(activeSpecialSummary?.prereserva_enabled)

  // Coordination id: special_menu_principales_step_v1 - does any counted
  // (non-custom) menu have principales to choose? Drives step 3's presence.
  const specialNeedsPrincipales = Boolean(
    activeSpecialDate &&
      Object.values(specialMenuSelections).some((sel) => {
        if (!sel || sel.count <= 0) return false
        const m = activeSpecialDate.menus.find((mm) => mm.id === sel.special_date_menu_id)
        return Boolean(m && !m.is_custom && (specialMenuPrincipales[m.id] || []).length > 0)
      })
  )

  const steps = useMemo(() => {
    const out: { id: StepId; label: string }[] = [{ id: 'date', label: text('Fecha y personas', 'Date and guests') }]

    // Coordination id: special_booking_v1
    // Active special dates with prereserva_enabled replace the legacy menu
    // flow (mandatoryMenu / groupMenu / rice) with a single "specialMenu" step.
    if (isSpecialActiveForSelected && activeSpecialSummary?.prereserva_enabled) {
      // A special date with no menus assigned has nothing to choose, so the
      // menu step is dropped from the queue entirely rather than rendered
      // empty. `activeSpecialDate` is only loaded once the guest leaves the
      // date step, so before that we keep the step listed (the summary of
      // the flow stays stable) and drop it as soon as we know it is empty.
      if (!activeSpecialDate || (activeSpecialDate.menus || []).length > 0) {
        out.push({ id: 'specialMenu', label: text('Menú', 'Menu') })
        // Coordination id: special_menu_principales_step_v1 - step 3 picks
        // the main courses of the menus counted in step 2 (only if any has).
        if (specialNeedsPrincipales) out.push({ id: 'specialPrincipales', label: text('Principales', 'Main courses') })
      }
      if (mobilityEnabledForSelectedDate) {
        out.push({ id: 'mobility', label: text('Movilidad', 'Mobility') })
      }
      out.push({ id: 'personal', label: text('Datos', 'Details') })
      out.push({ id: 'adults', label: text('Adultos', 'Adults') })
      out.push({ id: 'summary', label: text('Resumen', 'Summary') })
      return out
    }

    // Check if mandatory menu is active for this date
    const hasMandatoryMenu = mandatoryMenuData?.status === true && !!mandatoryMenuData?.menus && mandatoryMenuData.menus.length > 0

    if (hasMandatoryMenu) {
      out.push({ id: 'mandatoryMenu', label: text('Menú', 'Menu') })
    }

    const hasMenu = !!groupMenus && groupMenus.length > 0
    // Only show groupMenu step if mandatory menu is not forcing menu selection
    if (hasMenu && !hasMandatoryMenu) out.push({ id: 'groupMenu', label: text('Menú', 'Menu') })

    // Legacy-like: before the user chooses (null), keep Arroz visible.
    // If mandatory menu is selected, skip rice and group menu steps
    const mandatoryMenuSelected = hasMandatoryMenu && mandatoryMenuId !== null
    const includeRice = !hasMandatoryMenu || !mandatoryMenuSelected
    if (includeRice) out.push({ id: 'rice', label: text('Arroz', 'Rice') })

    // Coordination id: mobility_day_override_v1 — ordinary days ask too, in the
    // same slot as the special flow (right before the personal details).
    if (mobilityEnabledForSelectedDate) out.push({ id: 'mobility', label: text('Movilidad', 'Mobility') })

    out.push({ id: 'personal', label: text('Datos', 'Details') })
    out.push({ id: 'adults', label: text('Adultos', 'Adults') })

    out.push({ id: 'summary', label: text('Resumen', 'Summary') })
    return out
  }, [groupMenus, wantsGroupMenu, mandatoryMenuData, mandatoryMenuId, lang, isSpecialActiveForSelected, activeSpecialSummary, activeSpecialDate, mobilityEnabledForSelectedDate, specialNeedsPrincipales])

  const currentStepIndex = useMemo(() => steps.findIndex((s) => s.id === step), [steps, step])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (prevStepRef.current == null) {
      prevStepRef.current = step
      return
    }
    prevStepRef.current = step

    const anchor = stepsScrollerRef.current
    if (!anchor) return

    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0
    const offset = headerH + 12

    const rect = anchor.getBoundingClientRect()
    const rawTarget = rect.top + window.scrollY - offset
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const target = clamp(rawTarget, 0, maxScroll)

    if (pageScrollRafRef.current != null) {
      window.cancelAnimationFrame(pageScrollRafRef.current)
      pageScrollRafRef.current = null
    }

    const durationMs = reduceMotion ? 0 : 2000
    if (durationMs === 0) {
      window.scrollTo(0, target)
      return
    }

    const startY = window.scrollY
    const delta = target - startY
    if (Math.abs(delta) < 1) return

    const startTime = performance.now()
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs)
      const eased = easeInOutCubic(t)
      window.scrollTo(0, startY + delta * eased)
      if (t < 1) {
        pageScrollRafRef.current = window.requestAnimationFrame(tick)
      } else {
        pageScrollRafRef.current = null
      }
    }

    pageScrollRafRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (pageScrollRafRef.current != null) {
        window.cancelAnimationFrame(pageScrollRafRef.current)
        pageScrollRafRef.current = null
      }
    }
  }, [step, reduceMotion])

  useEffect(() => {
    const scroller = stepsScrollerRef.current
    if (!scroller) return
    const activeEl = scroller.querySelector<HTMLElement>(`[data-step-id="${step}"]`)
    if (!activeEl) return

    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
    if (maxScroll <= 0) return

    const scrollerRect = scroller.getBoundingClientRect()
    const activeRect = activeEl.getBoundingClientRect()
    const activeLeft = activeRect.left - scrollerRect.left + scroller.scrollLeft
    const target = clamp(activeLeft + activeRect.width / 2 - scroller.clientWidth / 2, 0, maxScroll)

    if (stepsScrollRafRef.current != null) {
      window.cancelAnimationFrame(stepsScrollRafRef.current)
      stepsScrollRafRef.current = null
    }

    const durationMs = reduceMotion ? 0 : 1000
    if (durationMs === 0) {
      scroller.scrollLeft = target
      return
    }

    const start = scroller.scrollLeft
    const delta = target - start
    if (Math.abs(delta) < 1) return

    const startTime = performance.now()
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs)
      const eased = easeInOutCubic(t)
      scroller.scrollLeft = start + delta * eased
      if (t < 1) {
        stepsScrollRafRef.current = window.requestAnimationFrame(tick)
      } else {
        stepsScrollRafRef.current = null
      }
    }

    stepsScrollRafRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (stepsScrollRafRef.current != null) {
        window.cancelAnimationFrame(stepsScrollRafRef.current)
        stepsScrollRafRef.current = null
      }
    }
  }, [step, steps, reduceMotion])

  const selectedMenu = useMemo(() => {
    if (!groupMenus || !groupMenuId) return null
    return groupMenus.find((m) => m.id === groupMenuId) || null
  }, [groupMenus, groupMenuId])

  const principalesItems = useMemo(() => getPrincipalesItems(selectedMenu), [selectedMenu])

  const countryOptions = useMemo<PopoverSelectOption[]>(
    () => countrySelectOptions(buildCountries(text)),
    [lang]
  )

  const peopleOptions = useMemo<PopoverSelectOption[]>(() => {
    const out: PopoverSelectOption[] = []
    const suffix = t('reservations.people.suffix')
    // Coordination id: special_booking_v1
    // Special dates with max_per_table_enabled cap at min(max_per_table, freeSeats)
    // and never expose the "10+" pseudo-option (which would normally trigger the
    // groups-of-10 modal). Otherwise the legacy 2..10(+ groups modal) behaviour
    // is preserved.
    if (isSpecialActiveForSelected && activeSpecialSummary?.max_per_table_enabled && activeSpecialSummary.max_per_table) {
      const cap = Math.min(activeSpecialSummary.max_per_table, freeSeats ?? 0)
      for (let i = 2; i <= cap; i++) {
        if (i === 2 && !twoTopAvailable) continue
        out.push({ value: String(i), label: suffix, left: String(i) })
      }
      return out
    }
    const max = freeSeats == null ? 0 : Math.min(10, freeSeats)
    for (let i = 2; i <= max; i++) {
      if (i === 2 && !twoTopAvailable) continue
      out.push({ value: String(i), label: suffix, left: String(i) })
    }
    if (freeSeats != null && freeSeats > 10) {
      out.push({ value: 'more_than_10', label: suffix, left: '10+' })
    }
    return out
  }, [freeSeats, twoTopAvailable, t, isSpecialActiveForSelected, activeSpecialSummary])

  const groupMenuOptions = useMemo<PopoverSelectOption[]>(() => {
    if (!groupMenus || groupMenus.length === 0) return []
    return groupMenus.map((m) => {
      const title = localized(m.menu_title, m.menu_title_english, lang)
      return {
        value: String(m.id),
        label: title,
        right: `${m.price}€/${text('persona', 'person')}`,
        keywords: `${m.menu_title} ${m.menu_title_english || ''} ${m.price}`.toLowerCase(),
      }
    })
  }, [groupMenus, lang])

  const principalesOptions = useMemo<PopoverSelectOption[]>(() => {
    const english = selectedMenu?.principales_english?.items
    return principalesItems.map((it, index) => {
      const label = localized(it, english?.[index], lang)
      return { value: it, label, keywords: `${it} ${english?.[index] || ''}`.toLowerCase() }
    })
  }, [principalesItems, selectedMenu, lang])

  const riceTypeOptions = useMemo<PopoverSelectOption[]>(
    () => riceTypes.map((it, index) => {
      const label = localized(it, riceTypesEnglish[index], lang)
      return { value: it, label, keywords: `${it} ${riceTypesEnglish[index] || ''}`.toLowerCase() }
    }),
    [riceTypes, riceTypesEnglish, lang]
  )

  const riceServingsOptions = useMemo<PopoverSelectOption[]>(() => {
    const ps = Math.max(2, partySize || 2)
    const out: PopoverSelectOption[] = []
    for (let n = 2; n <= ps; n++) {
      out.push({ value: String(n), label: text('raciones', 'servings'), left: String(n) })
    }
    return out
  }, [partySize, lang])

  const locationBooking = dayContext?.locationBooking ?? null
  const allowFloorBooking = locationBooking?.allowFloorReservation === true
  const allowSalonBooking = locationBooking?.allowSalonReservation === true

  const floorOptions = useMemo<PopoverSelectOption[]>(
    () =>
      activeFloors.map((floor) => ({
        value: String(floor.floorNumber),
        label: lang === 'en' ? (floor.isGround ? 'Ground floor' : `Floor ${floor.floorNumber}`) : floor.name,
        keywords: `${floor.name} ${floor.floorNumber}`.toLowerCase(),
      })),
    [activeFloors, lang]
  )

  const selectedFloor = useMemo(() => {
    if (selectedFloorNumber == null) return null
    return activeFloors.find((floor) => floor.floorNumber === selectedFloorNumber) || null
  }, [activeFloors, selectedFloorNumber])

  const salonOptions = useMemo(() => {
    if (!allowSalonBooking || !locationBooking) return []
    if (allowFloorBooking) {
      const byFloor = locationBooking.floors.find((f) => f.floorNumber === selectedFloorNumber)
      return byFloor?.salons ?? []
    }
    return locationBooking.floors.flatMap((f) => f.salons)
  }, [allowSalonBooking, allowFloorBooking, locationBooking, selectedFloorNumber])

  const selectedSalon = useMemo(() => {
    if (selectedSalonId == null) return null
    return salonOptions.find((salon) => salon.id === selectedSalonId) || null
  }, [salonOptions, selectedSalonId])

  const showUpperFloorWarning = useMemo(() => {
    if (activeFloors.length === 0) return false
    const hasGroundOpen = activeFloors.some((floor) => floor.isGround)
    if (hasGroundOpen) return false
    return activeFloors.some((floor) => !floor.isGround)
  }, [activeFloors])

  const openingMode = dayContext?.openingMode
  const hasShiftChoice = openingMode === 'both'
  const hasSingleShift = openingMode === 'morning' || openingMode === 'night'
  // The shift and hours blocks are revealed progressively: nothing is shown
  // until a party size is picked, and on days with two services the hours
  // wait until the shift has been chosen.
  const showShiftField = Boolean(partySize) && (hasShiftChoice || hasSingleShift)
  const shiftDone = !hasShiftChoice || Boolean(selectedShift)
  const floorRequired = allowFloorBooking && activeFloors.length > 1
  const floorDone = !floorRequired || selectedFloorNumber != null
  const salonRequired =
    allowSalonBooking && salonOptions.length > 0 && (!allowFloorBooking || selectedFloorNumber != null)
  const salonDone = !salonRequired || selectedSalonId != null
  const showFloorField = floorRequired && Boolean(partySize) && shiftDone
  const showSalonField = salonRequired && Boolean(partySize) && shiftDone
  const showHoursField = Boolean(partySize) && shiftDone && floorDone && salonDone

  const shiftOptions = useMemo<PopoverSelectOption[]>(() => {
    const all: PopoverSelectOption[] = [
      { value: 'morning', label: text('Comida', 'Lunch'), keywords: 'comida lunch mañana mediodia' },
      { value: 'night', label: text('Cena', 'Dinner'), keywords: 'cena dinner noche' },
    ]
    if (openingMode === 'morning' || openingMode === 'night') {
      return all.filter((o) => o.value === openingMode)
    }
    return all
  }, [lang, openingMode])

  const shiftLabel = useMemo(() => {
    if (dayContext?.openingMode === 'morning') return text('Comida', 'Lunch')
    if (dayContext?.openingMode === 'night') return text('Cena', 'Dinner')
    if (selectedShift === 'morning') return text('Comida', 'Lunch')
    if (selectedShift === 'night') return text('Cena', 'Dinner')
    return null
  }, [dayContext?.openingMode, selectedShift, lang])

  const activeShiftHours = useMemo(() => {
    if (!dayContext) return []
    if (dayContext.openingMode === 'morning') return Array.isArray(dayContext.morningHours) ? dayContext.morningHours : []
    if (dayContext.openingMode === 'night') return Array.isArray(dayContext.nightHours) ? dayContext.nightHours : []
    if (selectedShift === 'morning') return Array.isArray(dayContext.morningHours) ? dayContext.morningHours : []
    if (selectedShift === 'night') return Array.isArray(dayContext.nightHours) ? dayContext.nightHours : []
    return []
  }, [dayContext, selectedShift])

  const availableHours = useMemo(() => {
    if (!hourData || !partySize) return []
    const allowed = new Set(activeShiftHours)
    // Backward-compatible default: when the flag is absent, keep the per-hour cap.
    const splitEnabled = hourData.hourSplitEnabled !== false
    const out: { hour: string; status: 'available' | 'limited' }[] = []
    const hours = Array.isArray(hourData.activeHours) ? hourData.activeHours : []
    for (const h of hours) {
      if (allowed.size > 0 && !allowed.has(h)) continue
      const slot = hourData.hourData?.[h]
      if (!slot) continue
      if (slot.isClosed || slot.status === 'closed') continue
      // Only enforce the per-hour capacity cap when by-hour split is enabled.
      if (splitEnabled && typeof slot.capacity === 'number' && slot.capacity < partySize) continue
      out.push({ hour: h, status: slot.status === 'limited' ? 'limited' : 'available' })
    }
    return out
  }, [activeShiftHours, hourData, partySize])


  // Initial fetch: closed/open days + arroz types.
  useEffect(() => {
    let cancelled = false
    const closedFromISO = isoFromLocalDate(addDaysLocal(today, 1))
    apiGetJson<ClosedDaysResponse>(
      `/api/reservations/closed-days?from=${encodeURIComponent(closedFromISO)}&to=${encodeURIComponent(maxISO)}`
    )
      .then((d) => {
        if (cancelled) return
        setClosedDays(normalizeDateSet(d.closed_days))
        setOpenedDays(normalizeDateSet(d.opened_days))
      })
      .catch(() => {
        if (cancelled) return
        setClosedDays(new Set())
        setOpenedDays(new Set())
      })

    // Coordination id: special_booking_v1
    // Fetch public special-dates summary for the same window so we can
    // bypass the 40-day limit and the Mon/Tue closure on active prereserva
    // special dates. The request is independent from closed-days.
    apiGetJson<SpecialDatesResponse>(
      `/api/reservations/special-dates?from=${encodeURIComponent(closedFromISO)}&to=${encodeURIComponent(specialLookupToISO)}`
    )
      .then((d) => {
        if (cancelled) return
        const list = Array.isArray(d.special_dates) ? d.special_dates : []
        const map: Record<string, SpecialDateSummary> = {}
        for (const s of list) {
          if (!s || !s.date) continue
          map[s.date] = s
        }
        setSpecialDatesMap(map)
      })
      .catch(() => {
        if (cancelled) return
        setSpecialDatesMap({})
      })

    apiGetJson<RiceTypesResponse>('/api/reservations/rice-types')
      .then((d) => {
        if (cancelled) return
        setRiceTypes((d.riceTypes || []).map((s) => String(s).trim()).filter(Boolean))
        setRiceTypesEnglish(Array.isArray(d.riceTypesEnglish) ? d.riceTypesEnglish : [])
      })
      .catch(() => {
        if (cancelled) return
        setRiceTypes([])
        setRiceTypesEnglish([])
      })

    return () => {
      cancelled = true
    }
  }, [maxISO, specialLookupToISO, today])

  // Month availability fetch (cached per month/year).
  const monthCacheRef = useRef<Map<string, Record<string, { freeBookingSeats: number }>>>(new Map())
  useEffect(() => {
    const key = `${viewYear}-${viewMonth0 + 1}`
    const cached = monthCacheRef.current.get(key)
    if (cached) {
      setMonthAvailability(cached)
      return
    }

    apiGetJson<MonthAvailabilityResponse>(
      `/api/reservations/month-availability?month=${encodeURIComponent(String(viewMonth0 + 1))}&year=${encodeURIComponent(
        String(viewYear)
      )}`
    )
      .then((d) => {
        const avail = d.availability || {}
        const compact: Record<string, { freeBookingSeats: number }> = {}
        for (const iso of Object.keys(avail)) {
          const free = typeof avail[iso]?.freeBookingSeats === 'number' ? avail[iso].freeBookingSeats : 0
          compact[iso] = { freeBookingSeats: free }
        }
        monthCacheRef.current.set(key, compact)
        setMonthAvailability(compact)
      })
      .catch(() => {
        setMonthAvailability({})
      })
  }, [viewMonth0, viewYear])

  useEffect(() => {
    if (!selectedDate) return
    const free = monthAvailability?.[selectedDate]?.freeBookingSeats
    if (typeof free !== 'number') return
    setFreeSeats(free)
  }, [monthAvailability, selectedDate])

  useEffect(() => {
    if (selectedDate) setDateDisplay(reservationDateDisplay(selectedDate, lang))
  }, [lang, selectedDate])

  const isClosedByDefault = (iso: string) => isClosedByDefaultISO(iso, openedDays, closedDays)

  // Coordination id: special_booking_v1
  // Active special dates with prereserva_enabled bypass ALL the gray-out rules:
  // Mon/Tue defaults, explicit closedDays, and the 40-day window. They only
  // appear disabled when they are in the past (same as every other date).
  const isPrereservaSpecial = (iso: string) => isPrereservaSpecialISO(iso, specialDatesMap)

  // Shared with the modify wizard so both grey out the exact same days.
  const calendarRules = useMemo<CalendarRuleContext>(
    () => ({
      todayISO,
      maxISO: bookingMaxISO,
      openedDays,
      closedDays,
      specialDates: specialDatesMap,
      monthAvailability,
    }),
    [todayISO, bookingMaxISO, openedDays, closedDays, specialDatesMap, monthAvailability],
  )

  // Coordination id: special_booking_v1
  // Lookup the active special-date summary for the currently selected date.

  const loadDateContext = async (iso: string, opts?: { skipStepReset?: boolean }) => {
    setSelectedDate(iso)
    setDateDisplay(reservationDateDisplay(iso, lang))
    setPartySize(null)
    setAdults(null)
    setHighChairs(0)
    setBabyStrollers(0)
    // Coordination id: mobility_issues_v1 — clear the answer on date change.
    // The next date may not even ask the question, and the count is relative
    // to a party size that has just been reset, so a stale value would show
    // an answer the guest never gave for this date.
    setHasMobilityIssues(null)
    setMobilityPeople(1)
    setReservationTime(null)
    setFreeSeats(null)
    setTwoTopAvailable(true)
    setHourData(null)
    setDayContext(null)
    setActiveFloors([])
    setSelectedFloorNumber(null)
    setSelectedSalonId(null)
    setSelectedShift(null)
    // Coordination id: special_booking_v1
    // Reset special-menu selection state on date change so a previous date's
    // selections never leak into the next booking.
    setActiveSpecialDate(null)
    setSpecialMenuSelections({})
    setSpecialPaymentMethod(null)
    if (!opts?.skipStepReset) setStep('date')

    const loadTwoTopAvailability = async () => {
      try {
        return await apiGetJson<MesasDeDosResponse>(
          `/api/reservations/two-top-availability?date=${encodeURIComponent(iso)}`
        )
      } catch {
        return null
      }
    }

    const loadHours = async () => {
      try {
        return await apiGetJson<HourDataResponse>(`/api/reservations/hour-data?date=${encodeURIComponent(iso)}`)
      } catch {
        return null
      }
    }

    const loadDayContext = async () => {
      try {
        return await apiGetJson<ReservationDayContextResponse>(`/api/reservations/day-context?date=${encodeURIComponent(iso)}`)
      } catch {
        return null
      }
    }

    try {
      const [mesas, hours, context] = await Promise.all([loadTwoTopAvailability(), loadHours(), loadDayContext()])

      const freeFromMonth = monthAvailability?.[iso]?.freeBookingSeats
      setFreeSeats(typeof freeFromMonth === 'number' ? freeFromMonth : null)

      if (mesas && typeof mesas.disponibilidadDeDos === 'boolean') {
        setTwoTopAvailable(mesas.disponibilidadDeDos)
      } else {
        setTwoTopAvailable(true)
      }

      setHourData(hours)
      setDayContext(context)
      const nextActiveFloors = context
        ? Array.isArray(context.activeFloors)
          ? context.activeFloors
          : (context.floors || []).filter((floor) => floor.active)
        : []
      setActiveFloors(nextActiveFloors)

      const allowFloorReservation = context?.locationBooking?.allowFloorReservation === true
      const allowSalonReservation = context?.locationBooking?.allowSalonReservation === true

      if (allowFloorReservation && nextActiveFloors.length === 1) {
        setSelectedFloorNumber(nextActiveFloors[0].floorNumber)
      } else if (!allowFloorReservation) {
        setSelectedFloorNumber(null)
      }
      const salonsForSingleFloor = context?.locationBooking?.floors.find(
        (f) => f.floorNumber === nextActiveFloors[0]?.floorNumber
      )?.salons
      if (allowSalonReservation && salonsForSingleFloor?.length === 1) {
        setSelectedSalonId(salonsForSingleFloor[0].id)
      } else if (!allowSalonReservation) {
        setSelectedSalonId(null)
      }
      if (context?.openingMode === 'morning') {
        setSelectedShift('morning')
      } else if (context?.openingMode === 'night') {
        setSelectedShift('night')
      }
      return context
    } catch (e) {
      pushToast('error', text('Error', 'Error'), lang === 'en' ? 'Availability could not be loaded.' : e instanceof Error ? e.message : 'No se pudo cargar la disponibilidad.')
      return null
    }
  }

  // Re-fetch the day context with aforo gating whenever the party size or the
  // selected date changes, so only floors/salons with room for the group are
  // offered. The base load is ungated (party size is not known yet).
  useEffect(() => {
    if (!selectedDate || !partySize) return
    let cancelled = false
    ;(async () => {
      try {
        const context = await apiGetJson<ReservationDayContextResponse>(
          `/api/reservations/day-context?date=${encodeURIComponent(selectedDate)}&party_size=${encodeURIComponent(String(partySize))}`
        )
        if (cancelled || !context) return
        setDayContext(context)
        const nextActiveFloors = context.activeFloors
          ? context.activeFloors
          : (context.floors || []).filter((floor) => floor.active)
        setActiveFloors(nextActiveFloors)
        const allowFloorReservation = context.locationBooking?.allowFloorReservation === true
        const allowSalonReservation = context.locationBooking?.allowSalonReservation === true

        if (!allowFloorReservation) {
          setSelectedFloorNumber(null)
        } else if (selectedFloorNumber != null && !nextActiveFloors.some((f) => f.floorNumber === selectedFloorNumber)) {
          setSelectedFloorNumber(nextActiveFloors.length === 1 ? nextActiveFloors[0].floorNumber : null)
          setSelectedSalonId(null)
        }
        const salons =
          context.locationBooking?.floors.find((f) => f.floorNumber === selectedFloorNumber)?.salons ?? []
        if (!allowSalonReservation) {
          setSelectedSalonId(null)
        } else if (selectedSalonId != null && !salons.some((sl) => sl.id === selectedSalonId)) {
          setSelectedSalonId(salons.length === 1 ? salons[0].id : null)
        }
      } catch {
        // Non-fatal: keep the ungated context already shown.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedDate, partySize, lang])

  // Restore from ?step=&date=&party= after a hard refresh.
  //
  // Setting `step` alone is not enough: every step past `date` renders behind
  // a guard on data that only `goNextFromDate` fetches (`activeSpecialDate`,
  // `mandatoryMenuData`, `groupMenus`). On a refresh those are null, the
  // guard fails, the render falls through every branch and lands on the
  // summary — which is what made a refresh mid-flow show the summary.
  //
  // So rehydrate the same data the forward navigation would have loaded,
  // then clamp the requested step to one that is actually reachable for this
  // date. The URL is treated as a hint, never as truth.
  //
  // Coordination id: special_booking_v1
  useEffect(() => {
    const init = initialUrlStateRef.current
    if (!init) return

    restoringRef.current = true
    const restore = async () => {
      if (!init.date) return
      // Coordination id: special_menu_cta_v1 - a deep link with only ?date=
      // (special menu "RESERVAR" button) opens the calendar on that month
      // with the day already selected.
      if (!init.party) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(init.date) || init.date < todayISO) return
        const [linkYear, linkMonth] = init.date.split('-').map(Number)
        setViewYear(linkYear)
        setViewMonth0(linkMonth - 1)
        await loadDateContext(init.date)
        console.log('[checkpoint] reservas_date_deeplink_selected', init.date)
        return
      }

      const dayCtx = await loadDateContext(init.date, { skipStepReset: !!init.step })
      setPartySize(init.party)

      if (!init.step || init.step === 'date') return

      // Which flow does this date use? Ask the single-date endpoint rather
      // than reading `specialDatesMap`: that map is filled by a separate
      // async fetch and this effect runs once on mount, so its closure can
      // still see an empty map and wrongly rebuild the legacy flow for a
      // special date. The detail endpoint is authoritative and returns
      // is_active, prereserva_enabled, mobility_enabled and menus together.
      let sd: SpecialDatePublic | null = null
      try {
        const res = await apiGetJson<SpecialDateResponse>(
          `/api/reservations/special-date?date=${encodeURIComponent(init.date)}`
        )
        sd = res?.special_date ?? (res?.date ? (res as SpecialDatePublic) : null)
      } catch {
        sd = null
      }
      // The endpoint 404s for inactive dates, so a payload that parsed at all
      // is already active; `is_active` is only checked when present.
      const isSpecialPrereserva = Boolean(sd && sd.is_active !== false && sd.prereserva_enabled)

      // Steps that are reachable for this date, in order.
      let reachable: StepId[] = ['date']
      let specialCountsIncomplete = false

      if (isSpecialPrereserva) {
        const expanded = sd ? expandSpecialDateMenus(sd) : sd
        setActiveSpecialDate(expanded)
        if (sd && (sd.menus || []).length > 0) reachable.push('specialMenu')
        // Coordination id: special_menu_url_state_v1 - rehydrate counts,
        // payment method and (once groups load) the main-course rows.
        const validIds = new Set((expanded?.menus || []).map((m) => m.id))
        const counts = Object.fromEntries(Object.entries(decodeSpecialCounts(init.sm)).filter(([id]) => validIds.has(Number(id))))
        setSpecialMenuSelections(counts)
        const pmKey = init.pm as PaymentMethodKey | null
        setSpecialPaymentMethod(pmKey && (expanded?.adelanto_payment_methods || []).includes(pmKey) ? pmKey : null)
        pendingSpecialRowsRef.current = init.sp
        const countedTotal = Object.values(counts).reduce((acc, c) => acc + c.count, 0)
        // Steps past the menu counts are only reachable with a complete count.
        specialCountsIncomplete = countedTotal !== init.party
        reachable.push('specialPrincipales')
        console.log('[checkpoint] special_menu_url_counts_restored', Object.keys(counts).length, countedTotal)
      } else {
        setActiveSpecialDate(null)
        // Legacy flow: mandatory menu -> group menu -> rice.
        let hasMandatory = false
        try {
          const mandatoryRes = await apiGetJson<MandatoryMenuResponse>(
            `/api/reservations/mandatory-menus?date=${encodeURIComponent(init.date)}`
          )
          hasMandatory = mandatoryRes.status === true && Array.isArray(mandatoryRes.menus) && mandatoryRes.menus.length > 0
          setMandatoryMenuData(hasMandatory ? mandatoryRes : null)
        } catch {
          setMandatoryMenuData(null)
        }
        if (hasMandatory) reachable.push('mandatoryMenu')

        let hasGroup = false
        if (!hasMandatory) {
          try {
            const data = await apiGetJson<ValidGroupMenusForPartySizeResponse>(
              `/api/reservations/group-menus?party_size=${encodeURIComponent(String(init.party))}`
            )
            hasGroup = Boolean(data.hasValidMenus) && Array.isArray(data.menus) && data.menus.length > 0
            setGroupMenus(hasGroup ? data.menus : null)
          } catch {
            setGroupMenus(null)
          }
        }
        if (hasGroup) reachable.push('groupMenu')
        if (!hasMandatory) reachable.push('rice')
      }

      // Coordination id: mobility_day_override_v1 — asked on every day whose
      // resolved setting enables it, special or not. Resolved from the fresh
      // payloads here because this mount-time closure predates the derived
      // render value (mobilityEnabledForSelectedDate).
      if (resolveMobilityEnabled(dayCtx, sd)) reachable.push('mobility')

      reachable.push('personal', 'adults', 'summary')

      // Never restore past a step the guest has not actually completed, and
      // never onto a step this date does not have. Falling back to the last
      // reachable step before the requested one keeps them inside the flow
      // instead of dumping them on the summary.
      if (specialCountsIncomplete) reachable = reachable.filter((id) => id === 'date' || id === 'specialMenu')
      const wanted = reachable.indexOf(init.step)
      setStep(wanted >= 0 ? init.step : isSpecialPrereserva && reachable.includes('specialMenu') ? 'specialMenu' : 'date')
    }

    void restore().finally(() => {
      restoringRef.current = false
    })
  }, [])

  const onPickDate = (iso: string, inMonth: boolean) => {
    if (iso === todayISO) {
      setSameDayOpen(true)
      return
    }
    if (!inMonth) return

    const free = monthAvailability?.[iso]?.freeBookingSeats
    if (typeof free === 'number' && free <= 0) {
      pushToast('error', text('Fecha completa', 'Date fully booked'), text('Lo sentimos, no hay disponibilidad para esta fecha.', 'Sorry, there is no availability for this date.'))
      return
    }

    if (iso < todayISO) {
      pushToast('warning', text('Fecha no válida', 'Invalid date'), text('No se pueden seleccionar fechas pasadas.', 'Past dates cannot be selected.'))
      return
    }
    // Coordination id: special_booking_v1
    // Active special dates with prereserva_enabled skip the 40-day and
    // closed-default checks. Past dates are still blocked above.
    if (!isPrereservaSpecial(iso)) {
      if (iso > bookingMaxISO) {
        pushToast('warning', text('Demasiada antelación', 'Date too far ahead'), text('Solo se pueden realizar reservas con hasta 40 días de antelación.', 'Reservations can only be made up to 40 days in advance.'))
        return
      }
      if (isClosedByDefault(iso)) {
        pushToast('warning', text('Restaurante cerrado', 'Restaurant closed'), text('El restaurante se encuentra cerrado en la fecha seleccionada.', 'The restaurant is closed on the selected date.'))
        return
      }
    }

    void loadDateContext(iso)
  }

  const goNextFromDate = async () => {
    if (!selectedDate) {
      pushToast('warning', text('Fecha requerida', 'Date required'), text('Por favor, selecciona una fecha.', 'Please select a date.'))
      return
    }
    if (!partySize) {
      pushToast('warning', text('Personas requeridas', 'Guests required'), text('Por favor, selecciona el número de personas.', 'Please select the number of guests.'))
      return
    }
    if (activeFloors.length === 0) {
      pushToast('warning', text('Salones cerrados', 'Dining rooms closed'), text('No hay salones activos para esta fecha. Contacta con el restaurante.', 'No dining rooms are open on this date. Contact the restaurant.'))
      return
    }
    if (floorRequired && selectedFloorNumber == null) {
      pushToast('warning', text('Planta requerida', 'Floor required'), text('Selecciona una planta para continuar.', 'Select a floor to continue.'))
      return
    }
    if (salonRequired && selectedSalonId == null) {
      pushToast('warning', text('Salón requerido', 'Dining room required'), text('Selecciona un salón para continuar.', 'Select a dining room to continue.'))
      return
    }
    if (dayContext?.openingMode === 'both' && !selectedShift) {
      pushToast('warning', text('Turno requerido', 'Service required'), text('Selecciona si tu reserva es para comida o cena.', 'Select lunch or dinner.'))
      return
    }
    if (!reservationTime) {
      pushToast('warning', text('Hora requerida', 'Time required'), text('Por favor, selecciona una hora.', 'Please select a time.'))
      return
    }

    try {
      // Coordination id: special_booking_v1
      // Active special dates with prereserva_enabled bypass the mandatory-menu
      // and group-menu flows and go straight to the new "specialMenu" step.
      if (isSpecialActiveForSelected && activeSpecialSummary?.prereserva_enabled) {
        let sdLoaded: SpecialDatePublic | null = null
        try {
          const specialRes = await apiGetJson<SpecialDateResponse>(
            `/api/reservations/special-date?date=${encodeURIComponent(selectedDate)}`
          )
          // The endpoint returns the row flat at the top level; older shapes
          // wrapped it under `special_date`. Accept either, and treat a
          // payload with no `date` as "not found" rather than storing a
          // bogus object.
          const sd = specialRes?.special_date ?? (specialRes?.date ? (specialRes as SpecialDatePublic) : null)
          if (!sd) throw new Error('special-date payload missing')
          sdLoaded = sd
          setActiveSpecialDate(expandSpecialDateMenus(sd))
          setSpecialMenuSelections({})
          setSpecialPaymentMethod(null)
        } catch {
          // The specialMenu step only renders when `activeSpecialDate` is
          // set, so continuing here would skip it and land the guest on the
          // summary. Keep them on the date step and surface the failure.
          setActiveSpecialDate(null)
          setSpecialMenuSelections({})
          setSpecialPaymentMethod(null)
          pushToast(
            'warning',
            text('No se pudo cargar el menú de fecha festiva', 'Could not load the festive date menu'),
            text('Vuelve a intentarlo en unos segundos.', 'Please try again in a few seconds.'),
          )
          return
        }
        // Wipe state used by legacy menu steps so they don't leak in the summary.
        setMandatoryMenuData(null)
        setMandatoryMenuId(null)
        setMandatoryPrincipalesEnabled(null)
        setMandatoryPrincipalesRows([])
        setGroupMenus(null)
        setWantsGroupMenu(null)
        setGroupMenuId(null)
        setPrincipalesEnabled(null)
        setPrincipalesRows([])
        setWantsRice(false)
        setRiceType('')
        setRiceServings(null)
        // No menus assigned to this special date -> there is nothing to pick,
        // so skip the menu step and go to whatever comes next in the queue
        // (mobility when enabled, otherwise the personal details step).
        if ((sdLoaded.menus || []).length === 0) {
          setSpecialMenuSelections({})
          setSpecialPaymentMethod(null)
          setStep(mobilityEnabledForSelectedDate ? 'mobility' : 'personal')
          return
        }
        setStep('specialMenu')
        return
      }
      // First, check for mandatory menus
      const mandatoryRes = await apiGetJson<MandatoryMenuResponse>(
        `/api/reservations/mandatory-menus?date=${encodeURIComponent(selectedDate)}`
      )
      if (mandatoryRes.status === true && mandatoryRes.menus && mandatoryRes.menus.length > 0) {
        setMandatoryMenuData(mandatoryRes)
        setMandatoryMenuId(null)
        setMandatoryPrincipalesEnabled(null)
        setMandatoryPrincipalesRows([])
        setStep('mandatoryMenu')
        return
      }
      // No mandatory menus, proceed with normal flow
      setMandatoryMenuData(null)
      setMandatoryMenuId(null)
      setMandatoryPrincipalesEnabled(null)
      setMandatoryPrincipalesRows([])
    } catch {
      // No mandatory menus config
      setMandatoryMenuData(null)
    }

    try {
      const data = await apiGetJson<ValidGroupMenusForPartySizeResponse>(
        `/api/reservations/group-menus?party_size=${encodeURIComponent(String(partySize))}`
      )
      if (data.hasValidMenus && Array.isArray(data.menus) && data.menus.length > 0) {
        setGroupMenus(data.menus)
        setWantsGroupMenu(null)
        setGroupMenuId(null)
        setPrincipalesEnabled(null)
        setPrincipalesRows([])
        setStep('groupMenu')
        return
      }
    } catch {
      // Ignore: fall through to rice.
    }

    setGroupMenus(null)
    setWantsGroupMenu(null)
    setGroupMenuId(null)
    setPrincipalesEnabled(null)
    setPrincipalesRows([])
    setStep('rice')
  }

  const validateGroupMenuStep = () => {
    if (!groupMenus || groupMenus.length === 0) return true
    if (wantsGroupMenu == null) {
      pushToast('warning', text('Selección requerida', 'Selection required'), text('Por favor, indique si desea un menú de grupos o no.', 'Please choose whether you want a group menu.'))
      return false
    }
    if (wantsGroupMenu === false) return true
    if (!groupMenuId) {
      pushToast('warning', text('Menú requerido', 'Menu required'), text('Seleccione un menú de grupo.', 'Select a group menu.'))
      return false
    }
    if (principalesEnabled === true) {
      const cleaned = principalesRows
        .map((r) => ({ name: r.name.trim(), servings: Number(r.servings) || 0 }))
        .filter((r) => r.name && r.servings > 0)
      const unique = new Set<string>()
      for (const r of cleaned) {
        if (unique.has(r.name)) {
          pushToast('warning', text('Principales', 'Main courses'), text('No repitas el mismo principal.', 'Do not select the same main course twice.'))
          return false
        }
        unique.add(r.name)
        if (!principalesItems.includes(r.name)) {
          pushToast('warning', text('Principales', 'Main courses'), text('Selecciona solo principales del menú.', 'Select only main courses from the menu.'))
          return false
        }
      }
      const sum = cleaned.reduce((acc, r) => acc + r.servings, 0)
      if (cleaned.length === 0 || sum <= 0) {
        pushToast('warning', text('Principales', 'Main courses'), text('Añade al menos un principal.', 'Add at least one main course.'))
        return false
      }
      if (partySize && sum > partySize) {
        pushToast('warning', text('Principales', 'Main courses'), text('Las raciones superan el número de comensales.', 'Servings exceed the number of guests.'))
        return false
      }
    }
    return true
  }

  const goNextFromGroupMenu = () => {
    if (!validateGroupMenuStep()) return
    if (wantsGroupMenu === true) {
      // Skip rice.
      setWantsRice(false)
      setRiceType('')
      setRiceServings(null)
      setStep(mobilityEnabledForSelectedDate ? 'mobility' : 'personal')
      return
    }
    setStep('rice')
  }

  // Coordination id: special_booking_v1
  // Validation for the specialMenu step. Differs from validateGroupMenuStep:
  // the sum of menu counters must EXACTLY equal party size, and each chosen
  // non-custom menu's principals must EXACTLY match its own counter (no
  // <= partySize tolerance — that legacy rule belongs to groupMenu only).
  const validateSpecialMenuStep = () => {
    if (!activeSpecialDate) return true
    const menus = Array.isArray(activeSpecialDate.menus) ? activeSpecialDate.menus : []
    if (menus.length === 0) {
      pushToast('warning', text('Sin menús', 'No menus'), text('Esta fecha festiva no tiene menús disponibles.', 'This festive date has no available menus.'))
      return false
    }
    const selections = Object.values(specialMenuSelections).filter((s) => s && s.count > 0)
    const sumCount = selections.reduce((acc, s) => acc + (s.count || 0), 0)
    if (!partySize) {
      pushToast('warning', text('Personas requeridas', 'Guests required'), text('Selecciona el número de personas.', 'Select the number of guests.'))
      return false
    }
    if (selections.length === 0) {
      pushToast('warning', text('Selección requerida', 'Selection required'), text('Elige al menos un menú y su número de comensales.', 'Choose at least one menu and the number of guests.'))
      return false
    }
    if (sumCount !== partySize) {
      pushToast('warning', text('Comensales', 'Guests'), text(`El total de comensales por menú debe sumar ${partySize}.`, `The total of menu guests must equal ${partySize}.`))
      return false
    }
    if (activeSpecialDate.requires_adelanto && !stripeOnlyAdelanto && !specialPaymentMethod) {
      pushToast('warning', text('Método de pago', 'Payment method'), text('Selecciona el método de pago del adelanto.', 'Select the deposit payment method.'))
      return false
    }
    return true
  }

  // Coordination id: special_menu_principales_step_v1 - step 3: each chosen
  // menu's principales must add up exactly to its count (the UI already caps
  // them, this is the guard before advancing / submitting).
  const validateSpecialPrincipalesStep = () => {
    if (!activeSpecialDate) return true
    const menus = Array.isArray(activeSpecialDate.menus) ? activeSpecialDate.menus : []
    const selections = Object.values(specialMenuSelections).filter((s) => s && s.count > 0)
    // Coordination id: special_menu_principales_v1
    // Every principales group of a chosen menu must add up to its guests. A
    // menu with no groups (no principales, or toggle on but none added) has
    // nothing to choose, so it never blocks.
    for (const selection of selections) {
      const menu = menus.find((m) => m.id === selection.special_date_menu_id)
      if (!menu || menu.is_custom) continue
      for (const group of specialMenuPrincipales[menu.id] || []) {
        const cleaned = (selection.rows[group.key] || []).filter((r) => r.name.trim() && Number(r.servings) > 0)
        if (sumSpecialServings(cleaned) !== selection.count) {
          const where = group.title ? ` (${group.title})` : ''
          pushToast('warning', text('Principales', 'Main courses'), text(`Los principales${where} deben sumar exactamente ${selection.count}.`, `Main courses${where} must sum to exactly ${selection.count}.`))
          return false
        }
      }
    }
    return true
  }

  const goNextFromSpecialMenu = () => {
    if (!validateSpecialMenuStep()) return
    setStep(specialNeedsPrincipales ? 'specialPrincipales' : mobilityEnabledForSelectedDate ? 'mobility' : 'personal')
  }

  const goNextFromSpecialPrincipales = () => {
    if (!validateSpecialPrincipalesStep()) return
    setStep(mobilityEnabledForSelectedDate ? 'mobility' : 'personal')
  }

  const validateRiceStep = () => {
    if (wantsRice == null) {
      pushToast('warning', text('Arroz', 'Rice'), text('Por favor, selecciona si deseas arroz o no.', 'Please choose whether you want rice.'))
      return false
    }
    if (wantsRice === false) return true
    if (!riceType) {
      pushToast('warning', text('Arroz', 'Rice'), text('Por favor, selecciona el tipo de arroz.', 'Please select a rice dish.'))
      return false
    }
    if (!riceServings || riceServings < 2) {
      pushToast('warning', text('Arroz', 'Rice'), text('Por favor, selecciona el número de raciones.', 'Please select the number of servings.'))
      return false
    }
    if (partySize && riceServings > partySize) {
      pushToast('warning', text('Arroz', 'Rice'), text('Las raciones de arroz no pueden superar el número de comensales.', 'Rice servings cannot exceed the number of guests.'))
      return false
    }
    return true
  }

  const goNextFromRice = () => {
    if (!validateRiceStep()) return
    setStep(mobilityEnabledForSelectedDate ? 'mobility' : 'personal')
  }

  const validatePersonal = () => {
    if (!fullName.trim()) {
      pushToast('warning', text('Nombre requerido', 'Name required'), text('Por favor, introduce tu nombre y apellidos.', 'Please enter your full name.'))
      return false
    }
    const em = email.trim()
    if (!em) {
      pushToast('warning', text('Email requerido', 'Email required'), text('Por favor, introduce tu email.', 'Please enter your email address.'))
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      pushToast('warning', text('Email no válido', 'Invalid email'), text('Revisa el formato del email.', 'Check the email format.'))
      return false
    }
    const cc = onlyDigits(countryCode)
    const phone = onlyDigits(phoneNational)
    if (!cc || cc.length < 1 || cc.length > 4) {
      pushToast('warning', text('Teléfono', 'Phone'), text('Selecciona un prefijo válido.', 'Select a valid country code.'))
      return false
    }
    if (!phone || phone.length < 6 || phone.length > 15) {
      pushToast('warning', text('Teléfono', 'Phone'), text('Introduce un teléfono válido.', 'Enter a valid phone number.'))
      return false
    }
    if ((cc + phone).length > 15) {
      pushToast('warning', text('Teléfono', 'Phone'), text('El teléfono es demasiado largo.', 'The phone number is too long.'))
      return false
    }
    return true
  }

  const goNextFromPersonal = async () => {
    if (!validatePersonal()) return
    // Coordination id: reservation_self_modification_v1
    // Same contact details for the same day -> offer to modify the existing
    // booking instead of creating the duplicate the phone team kept deleting.
    if (selectedDate) {
      setCheckingContact(true)
      try {
        const dup = await lookupDuplicateReservation({
          reservationDate: selectedDate,
          contactEmail: email.trim(),
          countryCode: onlyDigits(countryCode),
          contactPhone: onlyDigits(phoneNational),
        })
        if (dup.success && dup.duplicate) {
          // Ownership proof for the modify route: the wizard already knows the
          // contact, so it carries it client-side (never in the URL).
          if (dup.booking?.id) {
            storeSelfServiceProof({
              id: dup.booking.id,
              email: email.trim(),
              countryCode: onlyDigits(countryCode),
              phone: onlyDigits(phoneNational),
            })
          }
          setDuplicateCheck(dup)
          setDuplicateModalOpen(true)
          return
        }
      } catch {
        // A failed lookup must never block a legitimate booking, but the guest
        // should know the duplicate check did not run.
        pushToast(
          'warning',
          text('No pudimos comprobar duplicados', 'We could not check for duplicates'),
          text('Puedes continuar; revisaremos tu reserva.', 'You can continue; we will review your booking.'),
        )
      } finally {
        setCheckingContact(false)
      }
    }
    if (partySize && (adults == null || adults < 1 || adults > partySize)) {
      setAdults(partySize)
    }
    setStep('adults')
  }

  const goNextFromAdults = () => {
    if (!partySize) return
    setAdults(adults == null ? partySize : clamp(adults, 1, partySize))
    setStep('summary')
  }

  // Coordination id: mobility_issues_v1 — the mobility step sits between
  // the menu and the personal-details steps, so advance generically rather
  // than hardcoding a destination.
  const goNextFromMobility = () => {
    if (hasMobilityIssues == null) return
    const idx = steps.findIndex((x) => x.id === 'mobility')
    if (idx >= 0 && idx + 1 < steps.length) setStep(steps[idx + 1].id)
  }

  const goPrev = () => {
    const idx = steps.findIndex((s) => s.id === step)
    if (idx <= 0) return
    setStep(steps[idx - 1].id)
  }

  const submitBooking = async () => {
    if (!selectedDate || !partySize || !reservationTime) return
    if (!validatePersonal()) return
    if (activeFloors.length === 0) {
      pushToast('warning', text('Salones cerrados', 'Dining rooms closed'), text('No hay salones activos para esta fecha. Contacta con el restaurante.', 'No dining rooms are open on this date. Contact the restaurant.'))
      return
    }
    if (floorRequired && selectedFloorNumber == null) {
      pushToast('warning', text('Planta requerida', 'Floor required'), text('Selecciona una planta para completar la reserva.', 'Select a floor to complete the reservation.'))
      return
    }
    if (salonRequired && selectedSalonId == null) {
      pushToast('warning', text('Salón requerido', 'Dining room required'), text('Selecciona un salón para completar la reserva.', 'Select a dining room to complete the reservation.'))
      return
    }
    if (dayContext?.openingMode === 'both' && !selectedShift) {
      pushToast('warning', text('Turno requerido', 'Service required'), text('Selecciona si tu reserva es para comida o cena.', 'Select lunch or dinner.'))
      return
    }
    if (!termsAccepted || !privacyAccepted) {
      pushToast('warning', text('Términos', 'Terms'), text('Debe aceptar los términos y la protección de datos.', 'You must accept the terms and data protection policy.'))
      return
    }
    // Coordination id: special_booking_v1
    // Special-dates politics acceptance: required in addition to the legacy
    // terms + privacy boxes when the booking targets an active special date.
    if (specialTermsRequired && !specialTermsAccepted) {
      pushToast('warning', text('Términos', 'Terms'), text('Debe aceptar la política de reservas de fechas festivas.', 'You must accept the festive-dates booking policy.'))
      return
    }

    if (groupMenus && groupMenus.length > 0) {
      if (!validateGroupMenuStep()) return
    }
    // Coordination id: special_booking_v1
    // Validate the specialMenu step before submission so an incomplete selection
    // never reaches the server.
    if (isSpecialActiveForSelected && activeSpecialDate) {
      if (!validateSpecialMenuStep() || !validateSpecialPrincipalesStep()) return
    }
    if (!validateRiceStep()) return

    const fd = new FormData()
    fd.set('website_url', '')
    fd.set('form_load_time', String(formLoadTimeRef.current))
    fd.set('reservation_date', selectedDate)
    fd.set('party_size', String(partySize))
    fd.set('reservation_time', reservationTime)
    if (allowFloorBooking && selectedFloorNumber != null) {
      fd.set('preferred_floor_number', String(selectedFloorNumber))
    }
    if (allowSalonBooking && selectedSalonId != null) {
      fd.set('preferred_salon_id', String(selectedSalonId))
    }
    fd.set('customer_name', fullName.trim())
    fd.set('contact_email', email.trim())
    fd.set('country_code', '+' + onlyDigits(countryCode))
    fd.set('contact_phone', onlyDigits(phoneNational))
    const a = adults == null ? partySize : clamp(adults, 1, partySize)
    const kids = clamp(partySize - a, 0, partySize)
    fd.set('adults', String(a))
    fd.set('children', String(kids))

    // Coordination id: mobility_issues_v1 — only sent when the selected day's
    // resolved setting (mobility_day_override_v1) asks the question.
    if (mobilityEnabledForSelectedDate) {
      const hasMob = hasMobilityIssues === true
      fd.set('has_mobility_issues', hasMob ? '1' : '0')
      fd.set('mobility_people', hasMob ? String(clamp(mobilityPeople || 1, 1, partySize)) : '0')
    }

    // Coordination id: special_booking_v1
    // When the booking lands on an active special date with prereserva_enabled,
    // we send the snapshot payload as `special_json`. The server validates it
    // (counts == party_size, menus offered, items only for non-custom menus) and
    // stores it verbatim into bookings.special_json.
    if (isSpecialActiveForSelected && activeSpecialDate) {
      const selections = Object.values(specialMenuSelections).filter((s) => s && s.count > 0)
      const menusPayload = selections.map((s) => {
        const menu = activeSpecialDate.menus.find((mm) => mm.id === s.special_date_menu_id)
        const isCustom = Boolean(menu?.is_custom)
        // Non-custom menus: each row's `name` is a dish title chosen by the
        // user; look up its real dish_id in the section-derived map. When the
        // map is missing (menu fetch race) we degrade gracefully and send no
        // items — the backend accepts an empty array for non-custom menus.
        const groups = menu ? specialMenuPrincipales[menu.id] || [] : []
        // Coordination id: special_menu_principales_v1 - one item per serving
        // so the snapshot keeps how many guests take each dish.
        const items = isCustom
          ? []
          : groups.flatMap((group) =>
              (s.rows[group.key] || []).flatMap((r) => {
                const id = group.dishIds[r.name.trim()]
                const servings = Number(r.servings) || 0
                return typeof id === 'number' && servings > 0 ? Array.from({ length: servings }, () => ({ dish_id: id })) : []
              })
            )
        return {
          menu,
          special_date_menu_id: s.special_date_menu_id,
          count: s.count,
          items,
        }
      })
      // Coordination id: special_date_section_menus_v1 - section entries of a
      // special-type menu are sent under their real special_date_menu_id.
      type SpecialPayloadMenu = {
        special_date_menu_id: number
        count: number
        items: { dish_id: number }[]
        sections?: { section_id: number; count: number; items: { dish_id: number }[] }[]
      }
      const bySpecialMenu = new Map<number, SpecialPayloadMenu>()
      const regularMenus: SpecialPayloadMenu[] = []
      for (const line of menusPayload) {
        const sec = line.menu?.section
        if (!sec) {
          regularMenus.push({ special_date_menu_id: line.special_date_menu_id, count: line.count, items: line.items })
          continue
        }
        const cur = bySpecialMenu.get(sec.special_date_menu_id) ?? { special_date_menu_id: sec.special_date_menu_id, count: 0, items: [], sections: [] }
        cur.count += line.count
        cur.sections!.push({ section_id: sec.section_id, count: line.count, items: line.items })
        bySpecialMenu.set(sec.special_date_menu_id, cur)
      }
      const payload: { menus: SpecialPayloadMenu[]; payment_method?: PaymentMethodKey } = { menus: [...regularMenus, ...bySpecialMenu.values()] }
      if (activeSpecialDate.requires_adelanto && specialPaymentMethod) {
        payload.payment_method = specialPaymentMethod
      }
      // The server rejects a snapshot with an empty `menus` array ("Debe
      // seleccionar al menos un menú especial"). When the date has no menus
      // assigned the menu step is skipped, so there is nothing to snapshot —
      // omit `special_json` entirely and let it save as a normal booking on
      // a special date rather than failing validation.
      if (menusPayload.length > 0) {
        fd.set('special_json', JSON.stringify(payload))
      }
      fd.set('toggleArroz', 'false')
      fd.set('menu_de_grupo_selected', '0')
      fd.set('menu_de_grupo_id', '')
      fd.set('principales_enabled', '0')
      fd.set('principales_json', '[]')
    } else {
      const selectedMenuId = mandatoryMenuId ?? (wantsGroupMenu === true ? groupMenuId : null)
      const wantsMenu = selectedMenuId != null
      const selectedPrincipalesEnabled = mandatoryMenuId != null ? mandatoryPrincipalesEnabled : principalesEnabled
      const selectedPrincipalesRows = mandatoryMenuId != null ? mandatoryPrincipalesRows : principalesRows
      fd.set('menu_de_grupo_selected', wantsMenu ? '1' : '0')
      fd.set('menu_de_grupo_id', wantsMenu ? String(selectedMenuId) : '')
      fd.set('principales_enabled', wantsMenu && selectedPrincipalesEnabled === true ? '1' : '0')
      fd.set('principales_json', wantsMenu ? JSON.stringify(selectedPrincipalesRows || []) : '[]')

      if (wantsMenu) {
        fd.set('toggleArroz', 'false')
      } else {
        fd.set('toggleArroz', wantsRice === true ? 'true' : 'false')
        if (wantsRice === true) {
          fd.set('arroz_type', riceType)
          if (riceServings != null) fd.set('arroz_servings', String(riceServings))
        }
      }
    }

    fd.set('high_chairs', String(highChairs))
    fd.set('baby_strollers', String(babyStrollers))

    // Coordination id: stripe_prereserva_adelanto_v1 - stripe-only prereserva:
    // open the payment; the booking is only inserted after it is paid.
    if (stripeOnlyAdelanto) {
      setSubmitting(true)
      try {
        const res = await apiFetch('/api/bookings/front/checkout', { method: 'POST', body: fd })
        const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string; checkout_url?: string; checkout_id?: string } | null
        if (!res.ok || !data || data.success !== true || !data.checkout_url) {
          throw new Error((data && data.message) || `HTTP ${res.status}`)
        }
        console.log('[checkpoint] prereserva_checkout_redirect', data.checkout_id)
        window.location.assign(data.checkout_url)
        return
      } catch (e) {
        pushToast('error', text('Pago no disponible', 'Payment unavailable'), e instanceof Error ? e.message : text('No se pudo abrir el pago.', 'The payment could not be opened.'))
        setSubmitting(false)
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await apiFetch('/api/bookings/front', { method: 'POST', body: fd })
      const responseText = await res.text()
      let data: InsertBookingResponse | null = null
      try {
        data = JSON.parse(responseText) as InsertBookingResponse
      } catch {
        data = null
      }
      if (!res.ok) throw new Error((data && data.message) || `HTTP ${res.status}`)
      if (!data || data.success !== true || typeof data.booking_id !== 'number') {
        throw new Error((data && data.message) || 'Error al realizar la reserva.')
      }
      if (data.whatsapp_warning) {
        pushToast('warning', text('Reserva realizada', 'Reservation completed'), lang === 'en' ? 'Reservation completed, but the WhatsApp notification could not be sent.' : data.whatsapp_warning)
      }
      // Coordination id: special_booking_v1
      // Snapshot the just-submitted special-date data so the confirmation
      // modal can surface the date title + total-adelanto line. Cleared on
      // non-special bookings so legacy users keep the original modal copy.
      if (isSpecialActiveForSelected && activeSpecialDate) {
        setConfirmationSpecial({
          title: activeSpecialDate.title || text('Fecha festiva', 'Festive date'),
          totalAdelanto: specialTotalAdelanto,
          paymentMethod: specialPaymentMethod,
        })
      } else {
        setConfirmationSpecial(null)
      }
      setConfirmationOpen(true)
    } catch (e) {
      pushToast('error', text('Error', 'Error'), lang === 'en' ? 'The reservation could not be completed.' : e instanceof Error ? e.message : 'Error al realizar la reserva.')
    } finally {
      setSubmitting(false)
    }
  }

  const stepContent = (() => {
    if (step === 'date') {
      return (
        <div class="resvStep" data-testid="reservas-step-date">
          <div class="resvGrid2" data-testid="reservas-date-grid">
            <ReservationCalendar
              testId="reservas-calendar"
              title={text('Selecciona una fecha', 'Select a date')}
              selectedDate={selectedDate}
              todayISO={todayISO}
              viewMonth0={viewMonth0}
              viewYear={viewYear}
              onViewChange={(month0, year) => {
                setViewMonth0(month0)
                setViewYear(year)
              }}
              monthAvailability={monthAvailability}
              rules={calendarRules}
              onPickDate={onPickDate}
              text={text}
              lang={lang}
            />

            {selectedDate ? (
              <motion.div
                class="resvCard"
                data-testid="reservas-booking-card"
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              >
                <div class="resvCardHead" data-testid="reservas-booking-card-head">
                  <div class="resvCardTitle" data-testid="reservas-booking-card-title">{specialTermsRequired ? text('Tu prereserva', 'Your pre-booking') : text('Tu reserva', 'Your reservation')}</div>
                  <div class="resvCardSub" data-testid="reservas-booking-card-subtitle">{selectedDate ? dateDisplay : text('Elige fecha, personas y hora.', 'Choose date, guests and time.')}</div>
                </div>

                {showUpperFloorWarning ? (
                  <div class="resvNotice warn" data-testid="reservas-booking-upper-floor-warning">{specialTermsRequired
                      ? text('La planta baja está cerrada. La prereserva se asignará a primera planta sin ascensor.', 'The ground floor is closed. Your table will be on the first floor, with no lift access.')
                      : text('La planta baja está cerrada. La reserva se asignará a primera planta sin ascensor.', 'The ground floor is closed. Your table will be on the first floor, with no lift access.')}</div>
                ) : null}

                <div class="resvField" data-testid="reservas-party-size-field">
                  <div class="resvLabel resvLabel--step1" data-testid="reservas-party-size-label">{t('reservations.people.label')}</div>
                  <PopoverSelect
                    testId="reservas-party-size-select"
                    ariaLabel={text('Número de personas', 'Number of guests')}
                    value={partySize ? String(partySize) : null}
                    placeholder={freeSeats == null ? text('Selecciona una fecha', 'Select a date') : text('Selecciona', 'Select')}
                    options={peopleOptions}
                    disabled={!selectedDate || freeSeats == null || freeSeats <= 0}
                    onChange={(v) => {
                      if (v === 'more_than_10') {
                        setMoreThan10Open(true)
                        setPartySize(null)
                        setAdults(null)
                        setHighChairs(0)
                        setBabyStrollers(0)
                        setReservationTime(null)
                        return
                      }
                      const n = Number(v)
                      if (!Number.isFinite(n) || n < 2) return
                      setPartySize(n)
                      setAdults(null)
                      setHighChairs(0)
                      setBabyStrollers(0)
                      setReservationTime(null)
                    }}
                  />
                </div>

                {showShiftField ? (
                  <motion.div
                    class="resvField"
                    data-testid="reservas-shift-field"
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
                  >
                    <div class="resvLabel resvLabel--step1" data-testid="reservas-shift-label">{text('Turno', 'Service')}</div>
                    <PopoverSelect
                      testId="reservas-shift-select"
                      ariaLabel={text('Turno', 'Service')}
                      value={selectedShift}
                      placeholder={text('Selecciona comida o cena', 'Select lunch or dinner')}
                      options={shiftOptions}
                      readOnly={hasSingleShift}
                      onChange={(v) => {
                        if (v !== 'morning' && v !== 'night') return
                        setSelectedShift(v)
                        setReservationTime(null)
                      }}
                    />
                  </motion.div>
                ) : null}

                {showFloorField ? (
                  <div class="resvField" data-testid="reservas-floor-field">
                    <div class="resvLabel resvLabel--step1" data-testid="reservas-floor-label">{text('Planta', 'Floor')}</div>
                    <PopoverSelect
                      testId="reservas-floor-select"
                      ariaLabel={text('Planta', 'Floor')}
                      value={selectedFloorNumber != null ? String(selectedFloorNumber) : null}
                      placeholder={text('Selecciona una planta', 'Select a floor')}
                      options={floorOptions}
                      onChange={(v) => {
                        const n = Number(v)
                        setSelectedFloorNumber(Number.isFinite(n) ? n : null)
                        setSelectedSalonId(null)
                        setReservationTime(null)
                      }}
                    />
                  </div>
                ) : null}

                {showSalonField ? (
                  <div class="resvField" data-testid="reservas-salon-field">
                    <div class="resvLabel resvLabel--step1" data-testid="reservas-salon-label">{text('Salón', 'Dining room')}</div>
                    <PopoverSelect
                      testId="reservas-salon-select"
                      ariaLabel={text('Salón', 'Dining room')}
                      value={selectedSalonId != null ? String(selectedSalonId) : null}
                      placeholder={text('Selecciona un salón', 'Select a dining room')}
                      options={salonOptions.map((salon) => ({
                        value: String(salon.id),
                        label: salon.name,
                        keywords: salon.name.toLowerCase(),
                      }))}
                      onChange={(v) => {
                        const n = Number(v)
                        setSelectedSalonId(Number.isFinite(n) ? n : null)
                        setReservationTime(null)
                      }}
                    />
                  </div>
                ) : null}

                {allowSalonBooking && !showSalonField && allowFloorBooking && selectedFloorNumber != null && salonOptions.length === 0 ? (
                  <div class="resvNotice warn" data-testid="reservas-salon-empty-warning" style="margin-inline: 1rem; margin-top: 0.5rem;">
                    {text('La planta seleccionada no tiene salones activos; tu mesa se asignará en la planta elegida.', 'The selected floor has no active dining rooms; your table will be assigned on the chosen floor.')}
                  </div>
                ) : null}

                {showHoursField ? (
                  <motion.div
                    data-testid="reservas-hours-motion"
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
                  >
                    <ReservationHourPicker
                      testId="reservas"
                      label={text('Horas disponibles', 'Available times')}
                      hours={availableHours}
                      value={reservationTime}
                      onChange={setReservationTime}
                      emptyLabel={`${text('No hay horas disponibles para', 'No times available for')} ${partySize} ${t('reservations.people.suffix')} ${text('en esta fecha.', 'on this date.')}`}
                      text={text}
                    />
                  </motion.div>
                ) : null}

                {dateStepReady ? (
                  <motion.div
                    class="resvActions"
                    data-testid="reservas-date-actions"
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeInOut' }}
                  >
                    <button
                      type="button"
                      class="btn primary"
                      data-testid="reservas-date-next"
                      onClick={() => void goNextFromDate()}
                    >
                      {text('Siguiente', 'Next')}
                    </button>
                  </motion.div>
                ) : null}
              </motion.div>
            ) : null}
          </div>
        </div>
      )
    }

    if (step === 'mandatoryMenu') {
      const mandatoryMenus = mandatoryMenuData?.menus || []
      const isMandatory = mandatoryMenuData?.mandatory === true
      const selectedMandatoryMenu = mandatoryMenus.find(m => m.menuId === mandatoryMenuId)
      const mandatoryMenuStepReady = !isMandatory || mandatoryMenuId !== null
      const mandatoryEntrantes = selectedMandatoryMenu
        ? localizedArray(selectedMandatoryMenu.entrantes, selectedMandatoryMenu.entrantesEnglish, lang)
        : []

      const mandatoryMenuOptions = useMemo<PopoverSelectOption[]>(() => {
        return mandatoryMenus.map((m) => ({
          value: String(m.menuId),
          label: localized(m.menuTitle, m.menuTitleEnglish, lang),
          right: `${m.price}€/${text('persona', 'person')}`,
          keywords: `${m.menuTitle} ${m.menuTitleEnglish || ''} ${m.price}`.toLowerCase(),
        }))
      }, [mandatoryMenus, lang])

      const mandatoryPrincipalesOptions = useMemo<PopoverSelectOption[]>(() => {
        if (!selectedMandatoryMenu) return []
        const items = readStringArray(selectedMandatoryMenu.principales?.items || [])
        const english = selectedMandatoryMenu.principalesEnglish?.items
        return items.map((it, index) => ({
          value: it,
          label: localized(it, english?.[index], lang),
          keywords: `${it} ${english?.[index] || ''}`.toLowerCase(),
        }))
      }, [selectedMandatoryMenu, lang])

      return (
        <div class="resvStep" data-testid="reservas-step-mandatory-menu">
          <div class="resvCard" data-testid="reservas-mandatory-menu-card">
            <div class="resvCardHead" data-testid="reservas-mandatory-menu-card-head">
              <div class="resvCardTitle" data-testid="reservas-mandatory-menu-card-title">{text('Menú recomendado del día', 'Recommended menu of the day')}</div>
              <div class="resvCardSub" data-testid="reservas-mandatory-menu-card-subtitle">
                {isMandatory
                  ? text('Seleccione un menú recomendado del día para su reserva. Para la fecha seleccionada solo se admitirán reservas con uno de los menús disponibles.', 'Select a recommended menu for your reservation. On this date, reservations are only accepted with one of the available menus.')
                  : text('¿Desea reservar un menú recomendado del día?', 'Would you like to book a recommended menu?')}
              </div>
            </div>

            <div class="resvField" data-testid="reservas-mandatory-menu-field">
              <div class="resvLabel" data-testid="reservas-mandatory-menu-label">{text('Seleccione un menú', 'Select a menu')}</div>
              <PopoverSelect
                testId="reservas-mandatory-menu-select"
                ariaLabel={text('Seleccione un menú', 'Select a menu')}
                value={mandatoryMenuId ? String(mandatoryMenuId) : null}
                placeholder={text('Selecciona un menú', 'Select a menu')}
                options={mandatoryMenuOptions}
                searchable={mandatoryMenuOptions.length > 6}
                searchPlaceholder={text('Buscar menú', 'Search menus')}
                onChange={(v) => {
                  const id = Number(v)
                  setMandatoryMenuId(Number.isFinite(id) && id > 0 ? id : null)
                  setMandatoryPrincipalesEnabled(null)
                  setMandatoryPrincipalesRows([])
                }}
              />
            </div>

            {selectedMandatoryMenu ? (
              <div class="resvMenuDetails" data-testid="reservas-mandatory-menu-details">
                {selectedMandatoryMenu.menuType !== 'special' && (
                  <>
                    <div class="resvMenuBlock" data-testid="reservas-mandatory-starters-block">
                      <div class="resvMenuTitle" data-testid="reservas-mandatory-starters-title">{text('Entrantes incluidos', 'Starters included')}</div>
                      <ul class="resvMenuList" data-testid="reservas-mandatory-starters-list">
                        {mandatoryEntrantes.map((t, starterIndex) => (
                          <li key={t} data-testid={`reservas-mandatory-starter-${starterIndex}`}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    {selectedMandatoryMenu.menuChooseMain ? (
                      <div class="resvMenuBlock" data-testid="reservas-mandatory-mains-block">
                        <div class="resvMenuTitle" data-testid="reservas-mandatory-mains-title">{text('Principales', 'Main courses')}</div>
                        <div class="resvHint" data-testid="reservas-mandatory-mains-hint">{text('¿Queréis elegir ahora los principales?', 'Would you like to choose the main courses now?')}</div>
                        <div class="resvYesNo" data-testid="reservas-mandatory-mains-choice">
                          <button
                            type="button"
                            data-testid="reservas-mandatory-mains-yes"
                            class={mandatoryPrincipalesEnabled === true ? 'resvChoice selected' : 'resvChoice'}
                            onClick={() => {
                              setMandatoryPrincipalesEnabled(true)
                              if (mandatoryPrincipalesRows.length === 0) {
                                setMandatoryPrincipalesRows([{ name: '', servings: 0 }])
                              }
                            }}
                          >
                            {text('Sí', 'Yes')}
                          </button>
                          <button
                            type="button"
                            data-testid="reservas-mandatory-mains-no"
                            class={mandatoryPrincipalesEnabled === false ? 'resvChoice selected' : 'resvChoice'}
                            onClick={() => {
                              setMandatoryPrincipalesEnabled(false)
                              setMandatoryPrincipalesRows([])
                            }}
                          >
                            {text('No', 'No')}
                          </button>
                        </div>

                        {mandatoryPrincipalesEnabled === true ? (
                          <div class="resvPrincipales" data-testid="reservas-mandatory-mains-rows">
                            {mandatoryPrincipalesRows.map((row, idx) => (
                              <div class="resvPrincipalRow" key={idx} data-ui="principal-row" data-testid={`reservas-mandatory-main-row-${idx}`}>
                                <PopoverSelect
                                  testId={`reservas-mandatory-main-select-${idx}`}
                                  ariaLabel={`${text('Principal', 'Main course')} ${idx + 1}`}
                                  value={row.name ? row.name : null}
                                  placeholder={text('Selecciona un principal', 'Select a main course')}
                                  options={mandatoryPrincipalesOptions}
                                  searchable={mandatoryPrincipalesOptions.length > 10}
                                  searchPlaceholder={text('Buscar principal', 'Search main courses')}
                                  onChange={(name) =>
                                    setMandatoryPrincipalesRows((prev) => prev.map((p, i) => (i === idx ? { ...p, name } : p)))
                                  }
                                />
                                <InlineCounter
                                  testId={`reservas-mandatory-main-servings-${idx}`}
                                  ariaLabel={`${text('Raciones principal', 'Main course servings')} ${idx + 1}`}
                                  value={row.servings || 0}
                                  min={0}
                                  max={partySize || 99}
                                  onChange={(v) =>
                                    setMandatoryPrincipalesRows((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, servings: v } : p))
                                    )
                                  }
                                />
                                <button
                                  type="button"
                                  class="resvIconBtn"
                                  data-testid={`reservas-mandatory-main-remove-${idx}`}
                                  aria-label={text('Eliminar', 'Remove')}
                                  onClick={() => setMandatoryPrincipalesRows((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 size={18} strokeWidth={1.9} aria-hidden="true" data-testid={`reservas-mandatory-main-remove-icon-${idx}`} />
                                </button>
                              </div>
                            ))}

                            <div class="resvPrincipalesActions" data-testid="reservas-mandatory-mains-actions">
                              <button
                                type="button"
                                class="btn"
                                data-testid="reservas-mandatory-main-add"
                                onClick={() => {
                                  const max = selectedMandatoryMenu.mainDishesLimit
                                    ? Math.max(1, selectedMandatoryMenu.mainDishesLimitNumber || 1)
                                    : Math.max(1, Math.min(10, partySize || 10))
                                  if (mandatoryPrincipalesRows.length >= max) return
                                  setMandatoryPrincipalesRows((prev) => [...prev, { name: '', servings: 0 }])
                                }}
                              >
                                {text('Añadir principal', 'Add main course')}
                              </button>
                              <div class="resvHint" data-testid="reservas-mandatory-mains-max-hint">
                                {text('Máximo:', 'Maximum:')}{' '}
                                {selectedMandatoryMenu.mainDishesLimit
                                  ? selectedMandatoryMenu.mainDishesLimitNumber
                                  : Math.min(10, partySize || 10)}{' '}
                                {text('tipos', 'types')}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div class="resvMenuBlock" data-testid="reservas-mandatory-mains-static-block">
                        <div class="resvMenuTitle" data-testid="reservas-mandatory-mains-static-title">{text('Principales', 'Main courses')}</div>
                        <ul class="resvMenuList" data-testid="reservas-mandatory-mains-static-list">
                          {localizedArray(readStringArray(selectedMandatoryMenu.principales?.items || []), selectedMandatoryMenu.principalesEnglish?.items, lang).map((t, mainIndex) => (
                            <li key={t} data-testid={`reservas-mandatory-main-item-${mainIndex}`}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}

            {!isMandatory && mandatoryMenuId && (
              <button
                type="button"
                class="btn !mt-4"
                data-testid="reservas-mandatory-menu-skip"
                style={{ marginTop: "20px", marginLeft: "auto", marginRight: "auto", display: "flex" }}
                onClick={() => {
                  setMandatoryMenuId(null)
                  setMandatoryPrincipalesEnabled(null)
                  setMandatoryPrincipalesRows([])
                }}
              >
                {text('Continuar sin reservar menú recomendado', 'Continue without a recommended menu')}
              </button>
            )}

            <div class="resvActions" data-testid="reservas-mandatory-menu-actions">
              <button type="button" class="btn" data-testid="reservas-mandatory-menu-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {mandatoryMenuStepReady ? (
                <button
                  type="button"
                  class="btn primary"
                  data-testid="reservas-mandatory-menu-next"
                  onClick={() => {
                    // If mandatory menu selected, skip rice and group menu steps
                    if (mandatoryMenuId !== null) {
                      setWantsRice(false)
                      setRiceType('')
                      setRiceServings(null)
                      setWantsGroupMenu(false)
                      setGroupMenuId(null)
                    }
                    setStep(mobilityEnabledForSelectedDate ? 'mobility' : 'personal')
                  }}
                >
                  {text('Siguiente', 'Next')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    if (step === 'groupMenu') {
      return (
        <div class="resvStep" data-testid="reservas-step-group-menu">
          <div class="resvCard" data-testid="reservas-group-menu-card">
            <div class="resvCardHead" data-testid="reservas-group-menu-card-head">
              <div class="resvCardTitle" data-testid="reservas-group-menu-card-title">{text('Menú de grupos', 'Group menu')}</div>
              <div class="resvCardSub" data-testid="reservas-group-menu-card-subtitle">{text('Menús especiales para grupos.', 'Special menus for groups.')}</div>
            </div>

            <div class="resvYesNo" data-testid="reservas-group-menu-choice">
              <button
                type="button"
                data-testid="reservas-group-menu-yes"
                class={wantsGroupMenu === true ? 'resvChoice selected' : 'resvChoice'}
                onClick={() => {
                  setWantsGroupMenu(true)
                  setWantsRice(false)
                  setRiceType('')
                  setRiceServings(null)
                }}
              >
                {text('Sí', 'Yes')}
              </button>
              <button
                type="button"
                data-testid="reservas-group-menu-no"
                class={wantsGroupMenu === false ? 'resvChoice selected' : 'resvChoice'}
                onClick={() => {
                  setWantsGroupMenu(false)
                  setGroupMenuId(null)
                  setPrincipalesEnabled(null)
                  setPrincipalesRows([])
                }}
              >
                {text('No', 'No')}
              </button>
            </div>

            {wantsGroupMenu === true ? (
              <>
                <div class="resvField" data-testid="reservas-group-menu-field">
                  <div class="resvLabel" data-testid="reservas-group-menu-label">{text('Seleccione un menú', 'Select a menu')}</div>
                  <PopoverSelect
                    testId="reservas-group-menu-select"
                    ariaLabel={text('Seleccione un menú', 'Select a menu')}
                    value={groupMenuId ? String(groupMenuId) : null}
                    placeholder={text('Selecciona un menú', 'Select a menu')}
                    options={groupMenuOptions}
                    searchable={groupMenuOptions.length > 6}
                    searchPlaceholder={text('Buscar menú', 'Search menus')}
                    onChange={(v) => {
                      const id = Number(v)
                      setGroupMenuId(Number.isFinite(id) && id > 0 ? id : null)
                      setPrincipalesEnabled(null)
                      setPrincipalesRows([])
                    }}
                  />
                </div>

                {selectedMenu ? (
                  <div class="resvMenuDetails" data-testid="reservas-group-menu-details">
                    <div class="resvMenuBlock" data-testid="reservas-group-starters-block">
                      <div class="resvMenuTitle" data-testid="reservas-group-starters-title">{text('Entrantes incluidos', 'Starters included')}</div>
                      <ul class="resvMenuList" data-testid="reservas-group-starters-list">
                        {localizedArray(readStringArray(selectedMenu.entrantes), selectedMenu.entrantes_english, lang).map((t, starterIndex) => (
                          <li key={t} data-testid={`reservas-group-starter-${starterIndex}`}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    <div class="resvMenuBlock" data-testid="reservas-group-mains-block">
                      <div class="resvMenuTitle" data-testid="reservas-group-mains-title">{getPrincipalesTitle(selectedMenu, lang)}</div>
                      <div class="resvHint" data-testid="reservas-group-mains-hint">{text('¿Queréis elegir ahora los principales?', 'Would you like to choose the main courses now?')}</div>
                      <div class="resvYesNo" data-testid="reservas-group-mains-choice">
                        <button
                          type="button"
                          data-testid="reservas-group-mains-yes"
                          class={principalesEnabled === true ? 'resvChoice selected' : 'resvChoice'}
                          onClick={() => {
                            setPrincipalesEnabled(true)
                            if (principalesRows.length === 0) {
                              setPrincipalesRows([{ name: '', servings: 0 }])
                            }
                          }}
                        >
                          {text('Sí', 'Yes')}
                        </button>
                        <button
                          type="button"
                          data-testid="reservas-group-mains-no"
                          class={principalesEnabled === false ? 'resvChoice selected' : 'resvChoice'}
                          onClick={() => {
                            setPrincipalesEnabled(false)
                            setPrincipalesRows([])
                          }}
                        >
                          {text('No', 'No')}
                        </button>
                      </div>

                      {principalesEnabled === true ? (
                        <div class="resvPrincipales" data-testid="reservas-group-mains-rows">
                          {principalesRows.map((row, idx) => (
                            <div class="resvPrincipalRow" key={idx} data-ui="principal-row" data-testid={`reservas-group-main-row-${idx}`}>
                              <PopoverSelect
                                testId={`reservas-group-main-select-${idx}`}
                                ariaLabel={`${text('Principal', 'Main course')} ${idx + 1}`}
                                value={row.name ? row.name : null}
                                placeholder={text('Selecciona un principal', 'Select a main course')}
                                options={principalesOptions}
                                searchable={principalesOptions.length > 10}
                                searchPlaceholder={text('Buscar principal', 'Search main courses')}
                                onChange={(name) =>
                                  setPrincipalesRows((prev) => prev.map((p, i) => (i === idx ? { ...p, name } : p)))
                                }
                              />
                              <InlineCounter
                                testId={`reservas-group-main-servings-${idx}`}
                                ariaLabel={`${text('Raciones principal', 'Main course servings')} ${idx + 1}`}
                                value={row.servings || 0}
                                min={0}
                                max={partySize || 99}
                                onChange={(v) =>
                                  setPrincipalesRows((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, servings: v } : p))
                                  )
                                }
                              />
                              <button
                                type="button"
                                class="resvIconBtn"
                                data-testid={`reservas-group-main-remove-${idx}`}
                                aria-label={text('Eliminar', 'Remove')}
                                onClick={() => setPrincipalesRows((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash2 size={18} strokeWidth={1.9} aria-hidden="true" data-testid={`reservas-group-main-remove-icon-${idx}`} />
                              </button>
                            </div>
                          ))}

                          <div class="resvPrincipalesActions" data-testid="reservas-group-mains-actions">
                            <button
                              type="button"
                              class="btn"
                              data-testid="reservas-group-main-add"
                              onClick={() => {
                                const max = selectedMenu.main_dishes_limit
                                  ? Math.max(1, selectedMenu.main_dishes_limit_number || 1)
                                  : Math.max(1, Math.min(10, partySize || 10))
                                if (principalesRows.length >= max) return
                                setPrincipalesRows((prev) => [...prev, { name: '', servings: 0 }])
                              }}
                            >
                              {text('Añadir principal', 'Add main course')}
                            </button>
                            <div class="resvHint" data-testid="reservas-group-mains-max-hint">
                              {text('Máximo:', 'Maximum:')}{' '}
                              {selectedMenu.main_dishes_limit
                                ? selectedMenu.main_dishes_limit_number
                                : Math.min(10, partySize || 10)}{' '}
                              {text('tipos', 'types')}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            <div class="resvActions" data-testid="reservas-group-menu-actions">
              <button type="button" class="btn" data-testid="reservas-group-menu-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {groupMenuStepReady ? (
                <button type="button" class="btn primary" data-testid="reservas-group-menu-next" onClick={goNextFromGroupMenu}>
                  {text('Siguiente', 'Next')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    if (step === 'specialMenu' && activeSpecialDate) {
      const spMenus = activeSpecialDate.menus || []
      const selections = Object.values(specialMenuSelections)
      const sumCount = selections.reduce((acc, s) => acc + (s.count || 0), 0)
      const requiresAdelanto = activeSpecialDate.requires_adelanto
      const pmOptions = paymentMethodOptions(activeSpecialDate.adelanto_payment_methods || [])
      const haveRequiredPayment = !requiresAdelanto || stripeOnlyAdelanto || Boolean(specialPaymentMethod)
      const specialStepReady =
        spMenus.length > 0 &&
        selections.length > 0 &&
        sumCount === (partySize || 0) &&
        haveRequiredPayment

      const updateSelection = (menuId: number, patch: Partial<SpecialMenuSelection>) => {
        setSpecialMenuSelections((prev) => {
          const cur = prev[menuId]
          const next: SpecialMenuSelection = cur
            ? { ...cur, ...patch }
            : { special_date_menu_id: menuId, count: 0, rows: {}, ...patch }
          return { ...prev, [menuId]: next }
        })
      }

      const toggleMenu = (menuId: number, selected: boolean) => {
        if (selected) {
          updateSelection(menuId, { count: 0, rows: {} })
        } else {
          setSpecialMenuSelections((prev) => {
            const cp = { ...prev }
            delete cp[menuId]
            return cp
          })
        }
      }

      const updateMenuCount = (menuId: number, count: number) => {
        const c = Math.max(0, Math.min(count, partySize || count))
        setSpecialMenuSelections((prev) => {
          const cur = prev[menuId]
          if (!cur) return prev
          return { ...prev, [menuId]: { ...cur, count: c, rows: capSpecialRows(cur.rows, c) } }
        })
      }

      const totalAdelanto = selections.reduce((acc, s) => {
        const m = spMenus.find((mm) => mm.id === s.special_date_menu_id)
        if (!m || !m.adelanto_amount) return acc
        return acc + Number(m.adelanto_amount) * (s.count || 0)
      }, 0)

      return (
        <div class="resvStep" data-testid="reservas-step-special-menu">
          <div class="resvCard" data-testid="reservas-special-menu-card">
            <div class="resvCardHead" data-testid="reservas-special-menu-card-head">
              <div class="resvCardTitle" data-testid="reservas-special-menu-card-title">{text('Menús de fecha festiva', 'Festive date menus')}</div>
              <div class="resvFestiveHead" role="note" data-testid="reservas-special-date-warn-block">
                <div class="resvFestiveHeadTop">
                  <div class="resvFestiveHeadTitle" data-testid="reservas-special-date-warn-block-title">
                    {activeSpecialDate.title || text('Fecha festiva', 'Festive date')}
                  </div>
                  {activeSpecialDate.prereserva_enabled ? (
                    <span class="resvFestiveBadge" data-testid="reservas-special-date-prereserva-badge">{text('Prereserva', 'Pre-booking')}</span>
                  ) : null}
                </div>
                <div class="resvFestiveHeadDate" data-testid="reservas-special-date-warn-block-date">
                  {new Date(`${activeSpecialDate.date}T12:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div class="resvFestiveHeadHint" data-testid="reservas-special-date-warn-block-hint">
                  {text('Indica cuántos comensales tomarán cada menú. Los principales se eligen en el siguiente paso.', 'Tell us how many guests will have each menu. Main courses come in the next step.')}
                </div>
              </div>
            </div>

            {/* Coordination id: festive_menu_counter_v1 - live progress of the
                guests assigned to menus, so the rule "must add up to the
                party size" is visible before it blocks the Next button. */}
            <div class={sumCount === (partySize || 0) ? 'resvFestiveProgress is-complete' : 'resvFestiveProgress'} data-testid="reservas-special-menu-counter-sum">
              <div class="resvFestiveProgressHead" data-testid="reservas-special-menu-counter-sum-hint">
                <span>{text('Comensales asignados', 'Assigned guests')}</span>
                <strong>{sumCount} / {partySize || 0}</strong>
              </div>
              <div class="resvFestiveProgressBar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, partySize ? (sumCount / partySize) * 100 : 0)}%` }} />
              </div>
              {partySize && sumCount !== partySize ? (
                <div class="resvFestiveProgressNote" data-testid="reservas-special-menu-counter-sum-error">
                  {sumCount < partySize
                    ? text(`Faltan ${partySize - sumCount} comensales por asignar a un menú.`, `${partySize - sumCount} guests still need a menu.`)
                    : text(`El total debe sumar exactamente ${partySize} comensales.`, `The total must equal ${partySize} guests.`)}
                </div>
              ) : null}
            </div>

            <div class="resvMenuList" data-testid="reservas-special-menu-list">
              {spMenus.map((menu) => {
                const sel = specialMenuSelections[menu.id]
                const isChosen = Boolean(sel && sel.count > 0)
                const restantes = (partySize || 0) - (sumCount - (sel?.count || 0))
                const ek = specialEntryKey(menu)

                return (
                  <div class={isChosen ? 'resvMenuBlock resvFestiveMenu is-chosen' : 'resvMenuBlock resvFestiveMenu'} key={menu.id} data-testid={`reservas-special-menu-item-${ek}`}>
                    {/* Coordination id: festive_menu_counter_v1 - same reusable
                        Counter as the tronas step: the count itself selects
                        the menu, no checkbox + hidden counter any more. */}
                    <Counter
                      testId={`reservas-special-menu-count-${ek}`}
                      ariaLabel={menu.label || (menu.is_custom ? menu.custom_title || text('Menú', 'Menu') : text('Menú', 'Menu'))}
                      subtitle={[
                        typeof menu.price === 'number' && menu.price > 0 ? `${menu.price}€/${text('persona', 'person')}` : '',
                        requiresAdelanto && menu.adelanto_amount ? `${text('Adelanto', 'Deposit')} ${Number(menu.adelanto_amount).toFixed(2)}€` : '',
                        menu.is_custom ? text('Principales a decidir más tarde', 'Main courses decided later') : '',
                      ].filter(Boolean).join(' · ')}
                      value={sel?.count || 0}
                      min={0}
                      max={Math.max(restantes, 0)}
                      onChange={(v) => {
                        if (v <= 0) toggleMenu(menu.id, false)
                        else if (!sel) updateSelection(menu.id, { count: v, rows: {} })
                        else updateMenuCount(menu.id, v)
                      }}
                      className="resvCounter--plain"
                    />

                  </div>
                )
              })}
            </div>

            {requiresAdelanto && !stripeOnlyAdelanto ? (
              <div class="resvField mt-3" data-testid="reservas-special-menu-payment-field">
                <div class="resvLabel mb-3" data-testid="reservas-special-menu-payment-label">{text('Método de pago del adelanto', 'Deposit payment method')}</div>
                <div class="resvPayGrid" role="radiogroup" aria-label={text('Método de pago del adelanto', 'Deposit payment method')} data-testid="reservas-special-menu-payment-chips">
                  {pmOptions.map((opt) => {
                    const Icon = PAYMENT_METHOD_ICONS[opt.value]
                    const selected = specialPaymentMethod === opt.value
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        key={opt.value}
                        class={selected ? 'resvPayOption selected' : 'resvPayOption'}
                        data-testid={`reservas-special-menu-payment-chip-${opt.value}`}
                        onClick={() => setSpecialPaymentMethod(opt.value)}
                      >
                        {Icon ? <Icon size={20} strokeWidth={1.8} aria-hidden="true" data-testid={`reservas-special-menu-payment-icon-${opt.value}`} /> : null}
                        <span>{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {requiresAdelanto && totalAdelanto > 0 ? (
              <div class="resvAdelantoSummary" data-testid="reservas-special-menu-adelanto-summary">
                {selections.filter((sel) => sel.count > 0).map((sel) => {
                  const m = spMenus.find((mm) => mm.id === sel.special_date_menu_id)
                  if (!m || !m.adelanto_amount) return null
                  return (
                    <div class="resvAdelantoRow" key={sel.special_date_menu_id} data-testid={`reservas-special-menu-adelanto-summary-row-${specialEntryKey(m)}`}>
                      <span class="resvHint" data-testid={`reservas-special-menu-adelanto-summary-label-${specialEntryKey(m)}`}>{m.label || m.custom_title || text('Menú', 'Menu')} · {Number(m.adelanto_amount).toFixed(2)}€ × {sel.count}</span>
                      <span class="resvAdelantoVal" data-testid={`reservas-special-menu-adelanto-summary-value-${specialEntryKey(m)}`}>{(Number(m.adelanto_amount) * sel.count).toFixed(2)}€</span>
                    </div>
                  )
                })}
                <div class="resvAdelantoRow" data-testid="reservas-special-menu-adelanto-summary-row-all">
                  <span class="resvHint">{text('Método elegido', 'Selected method')}</span>
                  <span class="resvAdelantoVal">{stripeOnlyAdelanto ? PAYMENT_METHOD_LABELS.stripe : pmOptions.find((o) => o.value === specialPaymentMethod)?.label || '—'}</span>
                </div>
                <div class="resvAdelantoRow resvAdelantoRow--total" data-testid="reservas-special-menu-adelanto-total">
                  <span>{text('Adelanto a pagar', 'Deposit to pay')}</span>
                  <span class="resvAdelantoTotal">{totalAdelanto.toFixed(2)}€</span>
                </div>
              </div>
            ) : null}

            <div class="resvActions" data-testid="reservas-special-menu-actions">
              <button type="button" class="btn" data-testid="reservas-special-menu-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {specialStepReady ? (
                <button type="button" class="btn primary" data-testid="reservas-special-menu-next" onClick={goNextFromSpecialMenu}>
                  {text('Siguiente', 'Next')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    // Coordination id: special_menu_principales_step_v1
    // Step 3: main courses of every menu counted in step 2. Per group the
    // servings can never exceed the menu count, every new row starts at 1,
    // and a dish already picked in a row is hidden from the other rows.
    if (step === 'specialPrincipales' && activeSpecialDate) {
      const spMenus = activeSpecialDate.menus || []
      const chosen = Object.values(specialMenuSelections)
        .filter((sel) => sel && sel.count > 0)
        .map((sel) => ({ sel, menu: spMenus.find((m) => m.id === sel.special_date_menu_id) }))
        .filter((x): x is { sel: SpecialMenuSelection; menu: SpecialDatePublic['menus'][number] } => Boolean(x.menu && !x.menu.is_custom && (specialMenuPrincipales[x.menu.id] || []).length > 0))

      const setGroupRows = (menuId: number, groupKey: string, next: (rows: SpecialPrincipalesRow[]) => SpecialPrincipalesRow[]) =>
        setSpecialMenuSelections((prev) => {
          const cur = prev[menuId]
          if (!cur) return prev
          return { ...prev, [menuId]: { ...cur, rows: { ...cur.rows, [groupKey]: next(cur.rows[groupKey] || []) } } }
        })

      const principalesReady = chosen.every(({ sel, menu }) =>
        (specialMenuPrincipales[menu.id] || []).every((g) => sumSpecialServings(sel.rows[g.key]) === sel.count && (sel.rows[g.key] || []).every((r) => r.name))
      )

      return (
        <div class="resvStep" data-testid="reservas-step-special-principales">
          <div class="resvCard" data-testid="reservas-special-principales-card">
            <div class="resvCardHead" data-testid="reservas-special-principales-card-head">
              <div class="resvCardTitle" data-testid="reservas-special-principales-card-title">{text('Elige los principales', 'Choose the main courses')}</div>
              <div class="resvCardSub" data-testid="reservas-special-principales-card-subtitle">
                {text('Reparte las raciones de cada menú entre sus principales.', 'Split each menu’s servings across its main courses.')}
              </div>
            </div>

            <div class="resvMenuList" data-testid="reservas-special-principales-list">
              {chosen.map(({ sel, menu }) => {
                const ek = specialEntryKey(menu)
                return (
                  <div class="resvMenuBlock resvFestiveMenu is-chosen" key={menu.id} data-testid={`reservas-special-principales-item-${ek}`}>
                    <div class="resvPrincipalesMenuHead" data-testid={`reservas-special-principales-item-head-${ek}`}>
                      <span class="resvPrincipalesMenuName" data-testid={`reservas-special-principales-item-name-${ek}`}>{menu.label || text('Menú', 'Menu')}</span>
                      <span class="resvFestiveBadge" data-testid={`reservas-special-principales-item-count-${ek}`}>
                        {sel.count} {sel.count === 1 ? text('comensal', 'guest') : text('comensales', 'guests')}
                      </span>
                    </div>
                    <div class="resvMenuDetails" data-testid={`reservas-special-menu-details-${ek}`}>
                      {(specialMenuPrincipales[menu.id] || []).map((group) => {
                        const rows = sel.rows[group.key] || []
                        const gid = menu.section ? ek : `${ek}-${group.key}`
                        const used = sumSpecialServings(rows)
                        const left = sel.count - used
                        const canAdd = left > 0 && rows.length < group.options.length
                        return (
                          <div class="resvPrincipales" key={group.key} data-testid={`reservas-special-menu-rows-${gid}`}>
                            {group.title ? <div class="resvPrincipalesTitle" data-testid={`reservas-special-menu-rows-title-${gid}`}>{group.title}</div> : null}
                            {rows.map((row, idx) => {
                              const taken = new Set(rows.filter((_, i) => i !== idx).map((r) => r.name))
                              const options: PopoverSelectOption[] = group.options
                                .filter((opt) => !taken.has(opt))
                                .map((it) => ({ value: it, label: it, keywords: it.toLowerCase() }))
                              return (
                                <div class="resvPrincipalRow resvPrincipalRow--grouped" key={idx} data-ui="principal-row" data-testid={`reservas-special-menu-row-${gid}-${idx}`}>
                                  <PopoverSelect
                                    testId={`reservas-special-menu-select-${gid}-${idx}`}
                                    ariaLabel={`${text('Principal', 'Main course')} ${idx + 1}`}
                                    value={row.name ? row.name : null}
                                    placeholder={text('Selecciona un principal', 'Select a main course')}
                                    options={options}
                                    searchable={options.length > 10}
                                    searchPlaceholder={text('Buscar principal', 'Search main courses')}
                                    onChange={(name) => setGroupRows(menu.id, group.key, (rs) => rs.map((r, i) => (i === idx ? { ...r, name } : r)))}
                                  />
                                  <div class="resvPrincipalRowControls" data-testid={`reservas-special-menu-row-controls-${gid}-${idx}`}>
                                    <InlineCounter
                                      testId={`reservas-special-menu-servings-${gid}-${idx}`}
                                      ariaLabel={`${text('Raciones', 'Servings')} ${idx + 1}`}
                                      value={row.servings}
                                      min={1}
                                      max={row.servings + left}
                                      onChange={(v) => setGroupRows(menu.id, group.key, (rs) => rs.map((r, i) => (i === idx ? { ...r, servings: Math.max(1, v) } : r)))}
                                    />
                                    <button
                                      type="button"
                                      class="resvIconBtn"
                                      data-testid={`reservas-special-menu-remove-${gid}-${idx}`}
                                      aria-label={text('Eliminar', 'Remove')}
                                      onClick={() => setGroupRows(menu.id, group.key, (rs) => rs.filter((_, i) => i !== idx))}
                                    >
                                      <Trash2 size={18} strokeWidth={1.9} aria-hidden="true" data-testid={`reservas-special-menu-remove-icon-${gid}-${idx}`} />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                            <div class="resvPrincipalesActions" data-testid={`reservas-special-menu-rows-actions-${gid}`}>
                              <button
                                type="button"
                                class="btn resvAddPrincipalBtn"
                                data-testid={`reservas-special-menu-add-${gid}`}
                                disabled={!canAdd}
                                onClick={() =>
                                  setGroupRows(menu.id, group.key, (rs) => {
                                    const free = group.options.find((opt) => !rs.some((r) => r.name === opt))
                                    return free && sumSpecialServings(rs) < sel.count ? [...rs, { name: free, servings: 1 }] : rs
                                  })
                                }
                              >
                                <Plus size={18} strokeWidth={2} aria-hidden="true" data-testid={`reservas-special-menu-add-icon-${gid}`} />
                                {text('Añadir principal', 'Add main course')}
                              </button>
                              <div class={left === 0 ? 'resvHint is-complete' : 'resvHint'} data-testid={`reservas-special-menu-rows-hint-${gid}`}>
                                {text('Raciones', 'Servings')}: {used} / {sel.count}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div class="resvActions" data-testid="reservas-special-principales-actions">
              <button type="button" class="btn" data-testid="reservas-special-principales-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {principalesReady ? (
                <button type="button" class="btn primary" data-testid="reservas-special-principales-next" onClick={goNextFromSpecialPrincipales}>
                  {text('Siguiente', 'Next')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    if (step === 'rice') {
      return (
        <div class="resvStep" data-testid="reservas-step-rice">
          <div class="resvCard" data-testid="reservas-rice-card">
            <div class="resvCardHead" data-testid="reservas-rice-card-head">
              <div class="resvCardTitle" data-testid="reservas-rice-card-title">{text('Selección de arroz', 'Rice selection')}</div>
              <div class="resvCardSub" data-testid="reservas-rice-card-subtitle">{text('Los arroces solo podrán servirse con reserva previa.', 'Rice dishes are only available when ordered in advance.')}</div>
            </div>

            <ReservationChoice
              testId="reservas-rice"
              value={wantsRice}
              onChange={(next) => {
                setWantsRice(next)
                if (!next) {
                  setRiceType('')
                  setRiceServings(null)
                }
              }}
              yesLabel={text('Sí', 'Yes')}
              noLabel={text('No', 'No')}
            />

            {wantsRice === true ? (
              <div class="resvRiceGrid" data-testid="reservas-rice-grid">
                <div class="resvField" data-testid="reservas-rice-type-field">
                  <div class="resvLabel" data-testid="reservas-rice-type-label">{text('Tipo de arroz', 'Rice dish')}</div>
                  <PopoverSelect
                    testId="reservas-rice-type-select"
                    ariaLabel={text('Tipo de arroz', 'Rice dish')}
                    value={riceType ? riceType : null}
                    placeholder={text('Selecciona el tipo de arroz', 'Select a rice dish')}
                    options={riceTypeOptions}
                    searchable={riceTypeOptions.length > 8}
                    searchPlaceholder={text('Buscar arroz', 'Search rice dishes')}
                    onChange={(v) => setRiceType(v)}
                  />
                </div>
                <div class="resvField" data-testid="reservas-rice-servings-field">
                  <div class="resvLabel" data-testid="reservas-rice-servings-label">{text('Raciones', 'Servings')}</div>
                  <PopoverSelect
                    testId="reservas-rice-servings-select"
                    ariaLabel={text('Raciones', 'Servings')}
                    value={riceServings != null ? String(riceServings) : null}
                    placeholder={text('Selecciona raciones', 'Select servings')}
                    options={riceServingsOptions}
                    onChange={(v) => {
                      const n = Number(v)
                      setRiceServings(Number.isFinite(n) ? n : null)
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div class="resvActions" data-testid="reservas-rice-actions">
              <button type="button" class="btn" data-testid="reservas-rice-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {riceStepReady ? (
                <button type="button" class="btn primary" data-testid="reservas-rice-next" onClick={goNextFromRice}>
                  {text('Siguiente', 'Next')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    if (step === 'personal') {
      return (
        <div class="resvStep" data-testid="reservas-step-personal">
          <div class="resvCard" data-testid="reservas-personal-card">
            <div class="resvCardHead" data-testid="reservas-personal-card-head">
              <div class="resvCardTitle" data-testid="reservas-personal-card-title">{text('Datos personales', 'Personal details')}</div>
              <div class="resvCardSub" data-testid="reservas-personal-card-subtitle">{text('Estos datos son obligatorios para confirmar la reserva.', 'These details are required to confirm the reservation.')}</div>
            </div>

            <div class="resvForm" data-testid="reservas-personal-form">
              <div class="resvField" data-testid="reservas-personal-name-field">
                <div class="resvLabel resvLabel--compact" data-testid="reservas-personal-name-label">{text('Nombre y apellidos', 'Full name')}</div>
                <input
                  class="resvInput"
                  data-testid="reservas-personal-name-input"
                  type="text"
                  value={fullName}
                  onInput={(e) => setFullName((e.target as HTMLInputElement).value)}
                  autoComplete="name"
                />
              </div>
              <div class="resvField" data-testid="reservas-personal-email-field">
                <div class="resvLabel resvLabel--compact" data-testid="reservas-personal-email-label">Email</div>
                <input
                  class="resvInput"
                  data-testid="reservas-personal-email-input"
                  type="email"
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  autoComplete="email"
                />
              </div>

              <div class="resvField" data-testid="reservas-personal-phone-field">
                <div class="resvLabel" data-testid="reservas-personal-phone-label">{text('Teléfono', 'Phone')}</div>
                <div class="resvPhoneRow" data-testid="reservas-personal-phone-row">
                  <PopoverSelect
                    testId="reservas-personal-country-code-select"
                    ariaLabel={text('Prefijo', 'Country code')}
                    value={countryCode}
                    placeholder="+34"
                    options={countryOptions}
                    searchable
                    autoFocusSearch={false}
                    searchPlaceholder={text('Buscar país', 'Search countries')}
                    onChange={(v) => setCountryCode(v)}
                  />
                  <input
                    class="resvInput"
                    data-testid="reservas-personal-phone-input"
                    type="tel"
                    inputMode="numeric"
                    placeholder={text('Número', 'Number')}
                    value={phoneNational}
                    onInput={(e) => setPhoneNational(onlyDigits((e.target as HTMLInputElement).value))}
                    autoComplete="tel-national"
                  />
                </div>
                <div class="resvHint" data-testid="reservas-personal-phone-hint">
                  {text('Se guardará como', 'It will be saved as')} +{onlyDigits(countryCode)} {onlyDigits(phoneNational)}
                </div>
              </div>
            </div>

            <div class="resvActions" data-testid="reservas-personal-actions">
              <button type="button" class="btn" data-testid="reservas-personal-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {personalStepReady ? (
                <button
                  type="button"
                  class="btn primary"
                  data-testid="reservas-personal-next"
                  onClick={() => void goNextFromPersonal()}
                  disabled={checkingContact}
                >
                  {checkingContact ? text('Comprobando…', 'Checking…') : text('Siguiente', 'Next')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    if (step === 'mobility') {
      const ps = partySize || 1
      const chosen = hasMobilityIssues === true
      return (
        <div class="resvStep" data-testid="reservas-step-mobility">
          <div class="resvCard" data-testid="reservas-mobility-card">
            <div class="resvCardHead" data-testid="reservas-mobility-card-head">
              <div class="resvCardTitle" data-testid="reservas-mobility-card-title">
                {text('¿Hay personas con problemas de movilidad?', 'Is anyone in your party mobility impaired?')}
              </div>
              <div class="resvCardSub" data-testid="reservas-mobility-card-subtitle">
                {text(
                  'Nos ayuda a ubicar mejor la reserva si el restaurante tiene una primera planta sin ascensor.',
                  'This helps us seat you better if the restaurant has a first floor with no lift.',
                )}
              </div>
            </div>

            <ReservationChoice
              testId="reservas-mobility"
              value={hasMobilityIssues}
              onChange={(next) => {
                setHasMobilityIssues(next)
                if (next) {
                  setMobilityPeople((n) => clamp(n || 1, 1, ps))
                } else {
                  setMobilityPeople(0)
                }
              }}
              yesLabel={text('Sí', 'Yes')}
              noLabel={text('No', 'No')}
            />

            {chosen ? (
              <CounterGroup
                testId="reservas-mobility-counters"
                fields={[{
                  key: 'mobility-people',
                  testId: 'reservas-mobility-counter',
                  label: text('¿Cuántas personas?', 'How many people?'),
                  value: clamp(mobilityPeople || 1, 1, ps),
                  min: 1,
                  max: ps,
                  onChange: (n: number) => setMobilityPeople(n),
                  subtitle: text(`De un total de ${ps}`, `Out of ${ps} total`),
                }]}
              />
            ) : null}

            <div class="resvActions" data-testid="reservas-mobility-actions">
              <button type="button" class="btn" data-testid="reservas-mobility-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              <button
                type="button"
                class="btn primary"
                data-testid="reservas-mobility-next"
                disabled={hasMobilityIssues == null}
                onClick={goNextFromMobility}
              >
                {text('Siguiente', 'Next')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (step === 'adults') {
      const ps = partySize || 2
      const a = adults == null ? ps : clamp(adults, 1, ps)
      const fields: CounterField[] = [
        { key: 'adults', testId: 'reservas-adults-counter', label: text('Adultos', 'Adults'), value: a, min: 1, max: ps, onChange: (n) => setAdults(n) },
        { key: 'high-chairs', testId: 'reservas-high-chairs-counter', label: text('Tronas', 'High chairs'), value: highChairs, min: 0, max: 3, onChange: (n) => setHighChairs(n), subtitle: text('Suplemento de 2€ por trona', '€2 surcharge per high chair') },
        { key: 'baby-strollers', testId: 'reservas-baby-strollers-counter', label: text('Carros de bebé', 'Baby strollers'), value: babyStrollers, min: 0, max: 5, onChange: (n) => setBabyStrollers(n), subtitle: text('Indique cuántos traerá', 'How many will you bring?') },
      ]
      return (
        <div class="resvStep" data-testid="reservas-step-adults">
          <div class="resvCard" data-testid="reservas-adults-card">
            <div class="resvCardHead" data-testid="reservas-adults-card-head">
              <div class="resvCardTitle" data-testid="reservas-adults-card-title">{text('¿Cuántos adultos sois?', 'How many adults are there?')}</div>
              <div class="resvCardSub" data-testid="reservas-adults-card-subtitle">{text('Indique también si necesitáis tronas o vais a traer carrito.', 'Also tell us if you need high chairs or will bring a stroller.')}</div>
            </div>

            <CounterGroup testId="reservas-adults-counters" fields={fields} />

            <div class="resvActions" data-testid="reservas-adults-actions">
              <button type="button" class="btn" data-testid="reservas-adults-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              <button type="button" class="btn primary" data-testid="reservas-adults-next" onClick={goNextFromAdults}>
                {text('Siguiente', 'Next')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    // summary
    const ps = partySize || 0
    const wantsMenu = wantsGroupMenu === true && selectedMenu
    const hasAccessories = highChairs > 0 || babyStrollers > 0
    const showSpecialBlock = Boolean(activeSpecialDate) && specialSummaryRows.length > 0
    return (
      <div class="resvStep" data-testid="reservas-step-summary">
        <div class="resvCard" data-testid="reservas-summary-card">
          <div class="resvCardHead" data-testid="reservas-summary-card-head">
            <div class="resvCardTitle" data-testid="reservas-summary-card-title">{text('Resumen de tu reserva', 'Reservation summary')}</div>
            <div class="resvCardSub" data-testid="reservas-summary-card-subtitle">{text('Revisa los datos antes de completar la reserva.', 'Check the details before completing your reservation.')}</div>
          </div>

          <div class="resvSummary" data-testid="reservas-summary">
            <div class="resvSummaryRow" data-testid="reservas-summary-row-date">
              <span data-testid="reservas-summary-label-date">{text('Fecha', 'Date')}</span>
              <span class="resvSummaryValue" data-testid="reservas-summary-value-date">{selectedDate || '-'}</span>
            </div>
            <div class="resvSummaryRow" data-testid="reservas-summary-row-time">
              <span data-testid="reservas-summary-label-time">{text('Hora', 'Time')}</span>
              <span class="resvSummaryValue" data-testid="reservas-summary-value-time">{reservationTime || '-'}</span>
            </div>
            <div class="resvSummaryRow" data-testid="reservas-summary-row-shift">
              <span data-testid="reservas-summary-label-shift">{text('Turno', 'Service')}</span>
              <span class="resvSummaryValue" data-testid="reservas-summary-value-shift">{shiftLabel || '-'}</span>
            </div>
            <div class="resvSummaryRow" data-testid="reservas-summary-row-guests">
              <span data-testid="reservas-summary-label-guests">{text('Personas', 'Guests')}</span>
              <span class="resvSummaryValue" data-testid="reservas-summary-value-guests">{ps || '-'}</span>
            </div>
            {/* Coordination id: mobility_issues_v1 — only shown when the guest
                answered yes, so ordinary summaries are unchanged. Sits under
                "Personas" because it qualifies the party. */}
            {hasMobilityIssues === true ? (
              <div class="resvSummaryRow" data-testid="reservas-summary-row-mobility">
                <span data-testid="reservas-summary-label-mobility">{text('Problemas de movilidad', 'Mobility issues')}</span>
                <span class="resvSummaryValue" data-testid="reservas-summary-value-mobility">
                  {clamp(mobilityPeople || 1, 1, ps || 1)} {text('de', 'of')} {ps || 0}
                </span>
              </div>
            ) : null}
            <div class="resvSummaryRow" data-testid="reservas-summary-row-floor">
              <span data-testid="reservas-summary-label-floor">{text('Planta', 'Floor')}</span>
              <span class="resvSummaryValue" data-testid="reservas-summary-value-floor">{selectedFloor ? (lang === 'en' ? (selectedFloor.isGround ? 'Ground floor' : `Floor ${selectedFloor.floorNumber}`) : selectedFloor.name) : '-'}</span>
            </div>
            {selectedSalon ? (
              <div class="resvSummaryRow" data-testid="reservas-summary-row-salon">
                <span data-testid="reservas-summary-label-salon">{text('Salón', 'Dining room')}</span>
                <span class="resvSummaryValue" data-testid="reservas-summary-value-salon">{selectedSalon.name}</span>
              </div>
            ) : null}
            <div class="resvSummaryRow" data-testid="reservas-summary-row-name">
              <span data-testid="reservas-summary-label-name">{text('Nombre', 'Name')}</span>
              <span class="resvSummaryValue" data-testid="reservas-summary-value-name">{fullName.trim() || '-'}</span>
            </div>
            <div class="resvSummaryRow" data-testid="reservas-summary-row-email">
              <span data-testid="reservas-summary-label-email">Email</span>
              <span class="resvSummaryValue" data-testid="reservas-summary-value-email">{email.trim() || '-'}</span>
            </div>
            <div class="resvSummaryRow" data-testid="reservas-summary-row-phone">
              <span data-testid="reservas-summary-label-phone">{text('Teléfono', 'Phone')}</span>
              <span class="resvSummaryValue" data-testid="reservas-summary-value-phone">
                +{onlyDigits(countryCode)} {onlyDigits(phoneNational)}
              </span>
            </div>

            {wantsMenu ? (
              <div class="resvSummaryBlock" data-testid="reservas-summary-group-menu-block">
                <div class="resvSummaryBlockTitle" data-testid="reservas-summary-group-menu-title">{text('Menú de grupo', 'Group menu')}</div>
                <div class="resvSummaryRow" data-testid="reservas-summary-row-group-menu">
                  <span data-testid="reservas-summary-label-group-menu">{text('Menú', 'Menu')}</span>
                  <span class="resvSummaryValue" data-testid="reservas-summary-value-group-menu">
                    {localized(selectedMenu.menu_title, selectedMenu.menu_title_english, lang)} ({selectedMenu.price}€/{text('persona', 'person')})
                  </span>
                </div>
                <div class="resvSummaryListTitle" data-testid="reservas-summary-group-starters-title">{text('Entrantes', 'Starters')}</div>
                <ul class="resvSummaryList" data-testid="reservas-summary-group-starters-list">
                  {localizedArray(readStringArray(selectedMenu.entrantes), selectedMenu.entrantes_english, lang).map((t, starterIndex) => (
                    <li key={t} data-testid={`reservas-summary-group-starter-${starterIndex}`}>{t}</li>
                  ))}
                </ul>
                {principalesEnabled === true && principalesRows.length > 0 ? (
                  <>
                    <div class="resvSummaryListTitle" data-testid="reservas-summary-group-mains-title">{text('Principales', 'Main courses')}</div>
                    <ul class="resvSummaryList" data-testid="reservas-summary-group-mains-list">
                      {principalesRows
                        .filter((r) => r.name && r.servings > 0)
                        .map((r, mainIndex) => (
                          <li key={r.name} data-testid={`reservas-summary-group-main-${mainIndex}`}>
                            {localized(r.name, selectedMenu.principales_english?.items?.[principalesItems.indexOf(r.name)], lang)} x {r.servings}
                          </li>
                        ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : showSpecialBlock ? null : (
              // Special-date menus replace the rice question, so the rice
              // block would always read "No arroz" there.
              <div class="resvSummaryBlock" data-testid="reservas-summary-rice-block">
              <div class="resvSummaryBlockTitle" data-testid="reservas-summary-rice-title">{text('Arroz', 'Rice')}</div>
              <div class="resvSummaryRow" data-testid="reservas-summary-row-rice">
                <span data-testid="reservas-summary-label-rice">{text('Selección', 'Selection')}</span>
                <span class="resvSummaryValue" data-testid="reservas-summary-value-rice">
                  {wantsRice === true && riceType
                    ? `${localized(riceType, riceTypesEnglish[riceTypes.indexOf(riceType)], lang)} (${riceServings || 0} ${text('raciones', 'servings')})`
                    : text('No arroz', 'No rice')}
                </span>
              </div>
            </div>
          )}

            {showSpecialBlock ? (
              // Coordination id: special_booking_v1
              // Menú especial breakdown for active special dates: per-menu
              // label + count, a tree of principales inside each menu (or
              // "Principales por decidir" for custom menus), plus the per-menu
              // adelanto row and the total adelanto a pagar.
              <div class="resvSummaryBlock" data-testid="reservas-summary-special-menu-block">
                <div class="resvSummaryBlockTitle" data-testid="reservas-summary-special-menu-title">
                  {text('Menús de fecha festiva', 'Festive date menus')}
                </div>
                {activeSpecialDate?.title ? (
                  <div class="resvSummaryRow" data-testid="reservas-summary-row-special-menu-title">
                    <span data-testid="reservas-summary-label-special-menu-title">{text('Fecha festiva', 'Festive date')}</span>
                    <span class="resvSummaryValue" data-testid="reservas-summary-value-special-menu-title">{activeSpecialDate.title}</span>
                  </div>
                ) : null}
                {specialSummaryRows.map((row) => {
                  const label = row.menu.label || (row.menu.is_custom ? row.menu.custom_title : '') || text('Menú', 'Menu')
                  const price = typeof row.menu.price === 'number' ? row.menu.price : null
                  const cleanedRows = row.menu.is_custom
                    ? []
                    : row.rows
                        .map((r) => ({ name: r.name.trim(), servings: Number(r.servings) || 0 }))
                        .filter((r) => r.name && r.servings > 0)
                  return (
                    <div class="resvSpecialMenuSub" key={row.menu.id} data-testid={`reservas-summary-special-menu-item-${specialEntryKey(row.menu)}`}>
                      <div class="resvSummaryRow" data-testid={`reservas-summary-row-special-menu-${specialEntryKey(row.menu)}`}>
                        <span data-testid={`reservas-summary-label-special-menu-${specialEntryKey(row.menu)}`}>{label}</span>
                        <span class="resvSummaryValue" data-testid={`reservas-summary-value-special-menu-${specialEntryKey(row.menu)}`}>
                          {row.count}{' '}
                          {row.count === 1 ? text('persona', 'person') : text('personas', 'persons')}
                          {price != null ? ` · ${price}€/${text('persona', 'person')}` : ''}
                        </span>
                      </div>
                      {row.menu.is_custom ? (
                        <div class="resvSummaryListTitle" data-testid={`reservas-summary-special-menu-mains-title-${specialEntryKey(row.menu)}`}>
                          {text('Principales por decidir', 'Mains to be decided')}
                        </div>
                      ) : cleanedRows.length > 0 ? (
                        <>
                          <div class="resvSummaryListTitle" data-testid={`reservas-summary-special-menu-mains-title-${specialEntryKey(row.menu)}`}>
                            {text('Principales', 'Main courses')}
                          </div>
                          <ul class="resvSummaryList" data-testid={`reservas-summary-special-menu-mains-list-${specialEntryKey(row.menu)}`}>
                            {cleanedRows.map((r, mainIndex) => (
                              <li key={`${r.name}-${mainIndex}`} data-testid={`reservas-summary-special-menu-main-${specialEntryKey(row.menu)}-${mainIndex}`}>
                                {r.name} x {r.servings}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <div class="resvSummaryListTitle" data-testid={`reservas-summary-special-menu-mains-title-${specialEntryKey(row.menu)}`}>
                          {text('Principales por decidir', 'Mains to be decided')}
                        </div>
                      )}
                      {row.subtotal > 0 ? (
                        <div class="resvSummaryRow" data-testid={`reservas-summary-row-special-menu-adelanto-${specialEntryKey(row.menu)}`}>
                          <span data-testid={`reservas-summary-label-special-menu-adelanto-${specialEntryKey(row.menu)}`}>
                            {text('Adelanto', 'Deposit')}
                          </span>
                          <span class="resvSummaryValue" data-testid={`reservas-summary-value-special-menu-adelanto-${specialEntryKey(row.menu)}`}>
                            {Number(row.menu.adelanto_amount).toFixed(2)}€ x {row.count} = {row.subtotal.toFixed(2)}€
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
                {specialTotalAdelanto > 0 ? (
                  <div class="resvSummaryRow resvSummaryRow--total" data-testid="reservas-summary-row-special-menu-total-adelanto">
                    <span data-testid="reservas-summary-label-special-menu-total-adelanto">
                      {text('Total adelanto a pagar', 'Total deposit to pay')}
                    </span>
                    <span class="resvSummaryValue" data-testid="reservas-summary-value-special-menu-total-adelanto">
                      {specialTotalAdelanto.toFixed(2)}€
                      {specialPaymentMethod ? ` · ${PAYMENT_METHOD_LABELS[specialPaymentMethod]}` : ''}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasAccessories ? (
              <div class="resvSummaryBlock" data-testid="reservas-summary-accessories-block">
                <div class="resvSummaryBlockTitle" data-testid="reservas-summary-accessories-title">{text('Accesorios', 'Accessories')}</div>
                <div class="resvSummaryRow" data-testid="reservas-summary-row-baby-strollers">
                  <span data-testid="reservas-summary-label-baby-strollers">{text('Carros de bebé', 'Baby strollers')}</span>
                  <span class="resvSummaryValue" data-testid="reservas-summary-value-baby-strollers">{babyStrollers}</span>
                </div>
                <div class="resvSummaryRow" data-testid="reservas-summary-row-high-chairs">
                  <span data-testid="reservas-summary-label-high-chairs">{text('Tronas', 'High chairs')}</span>
                  <span class="resvSummaryValue" data-testid="reservas-summary-value-high-chairs">
                    {highChairs} ({highChairs * 2}€)
                  </span>
                </div>
              </div>
            ) : null}

            {showUpperFloorWarning ? (
              <div class="resvNotice warn" data-testid="reservas-summary-upper-floor-warning">{text('Ubicación: primera planta sin ascensor.', 'Location: first floor, no lift access.')}</div>
            ) : null}
          </div>

          <div class="resvTerms" data-testid="reservas-terms">
            <label class="resvCheck" data-testid="reservas-terms-legal-label">
              <Checkbox testId="reservas-terms-legal-checkbox" checked={termsAccepted} onCheckedChange={setTermsAccepted} variant="accent" size="sm" />
              <span data-testid="reservas-terms-legal-text">
                {text('He leído y acepto las', 'I have read and accept the')}{' '}
                <a href="/avisolegal" target="_blank" rel="noreferrer" data-testid="reservas-terms-legal-notice-link">
                  {text('condiciones de uso y aviso legal', 'terms of use and legal notice')}
                </a>{' '}
                {text('y las', 'and the')}{' '}
                <a href="/booking-policies" target="_blank" rel="noreferrer" data-testid="reservas-terms-booking-policies-link">
                  {text('políticas de reserva del restaurante', 'restaurant booking policies')}
                </a>
                .
              </span>
            </label>
            <label class="resvCheck" data-testid="reservas-terms-privacy-label">
              <Checkbox testId="reservas-terms-privacy-checkbox" checked={privacyAccepted} onCheckedChange={setPrivacyAccepted} variant="accent" size="sm" />
              <span data-testid="reservas-terms-privacy-text">
                {text('He leído, acepto y consiento el', 'I have read, accept and consent to the')}{' '}
                <a href="/protecciondatos" target="_blank" rel="noreferrer" data-testid="reservas-terms-data-protection-link">
                  {text('tratamiento de datos personales', 'processing of personal data')}
                </a>
                .
              </span>
            </label>
            {specialTermsRequired ? (
              // Coordination id: special_booking_v1
              // Special-terms acceptance: only rendered for active special dates
              // with prereserva_enabled. Submit is gated on it alongside the
              // legacy terms + privacy boxes.
              <label class="resvCheck" data-testid="reservas-terms-special-label">
                <Checkbox testId="reservas-terms-special-checkbox" checked={specialTermsAccepted} onCheckedChange={setSpecialTermsAccepted} variant="accent" size="sm" />
                <span data-testid="reservas-terms-special-text">
                  {text('Acepto la', 'I accept the')}{' '}
                  <a href="/reservas-especiales-politica" target="_blank" rel="noreferrer" data-testid="reservas-terms-special-politics-link">
                    {text('política de reservas de fechas festivas', 'festive-dates booking policy')}
                  </a>
                  .
                </span>
              </label>
            ) : null}
          </div>

          <div class="resvActions" data-testid="reservas-summary-actions">
            <button type="button" class="btn" data-testid="reservas-summary-back" onClick={goPrev} disabled={submitting}>
              {text('Anterior', 'Back')}
            </button>
            {termsAccepted && privacyAccepted && (!specialTermsRequired || specialTermsAccepted) ? (
              <button type="button" class="btn primary" data-testid="reservas-summary-submit" onClick={() => void submitBooking()} disabled={submitting}>
                {submitting
                  ? text('Enviando...', 'Sending...')
                  : stripeOnlyAdelanto
                    ? text('Continuar al pago', 'Continue to payment')
                    : text('Completar reserva', 'Complete reservation')}
              </button>
            ) : (
              <span class="resvActionFallback" data-testid="reservas-summary-terms-fallback">
                {text('Acepta las condiciones para completar la reserva', 'Accept the conditions to complete the booking')}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  })()

  return (
    <div class="page resvPage" data-testid="reservas-page">
      <section class="page-hero resvHero" data-testid="reservas-hero">
        <div class="container" data-testid="reservas-hero-container">
          {/* Coordination id: festive_prereserva_title_v1 - a festive date
              with prereserva turns the whole flow into a prereserva. */}
          <h1 class="page-title" data-testid="reservas-hero-title">
            {selectedDate && isPrereservaSpecialISO(selectedDate, specialDatesMap) ? text('Prereserva', 'Pre-booking') : text('Reservas', 'Reservations')}
          </h1>
          <p class="page-subtitle" data-testid="reservas-hero-subtitle">{text('Selecciona fecha, personas y completa tu reserva.', 'Select a date and number of guests, then complete your reservation.')}</p>
        </div>
      </section>

      <section class="resvMain" data-testid="reservas-main">
        <div class="container" data-testid="reservas-main-container">
          <div class="resvSteps" aria-label={text('Pasos', 'Steps')} ref={stepsScrollerRef} data-testid="reservas-stepper">
            {steps.map((s, idx) => {
              const isActive = s.id === step
              const isDone = idx < currentStepIndex
              const barDone = idx < currentStepIndex
              return (
                <div class="resvStepSeg" key={s.id} data-testid={`reservas-stepper-segment-${s.id}`}>
                  <div class="resvStepDot" data-step-id={s.id} data-testid={`reservas-stepper-dot-${s.id}`}>
                    <div class={isActive ? 'resvDot active' : isDone ? 'resvDot done' : 'resvDot'} data-testid={`reservas-stepper-number-${s.id}`}>{idx + 1}</div>
                    <div class={isActive ? 'resvDotLabel active' : 'resvDotLabel'} data-testid={`reservas-stepper-label-${s.id}`}>{s.label}</div>
                  </div>
                  {idx < steps.length - 1 ? (
                    <div class={barDone ? 'resvStepBar done' : 'resvStepBar'} aria-hidden="true" data-testid={`reservas-stepper-bar-${s.id}`} />
                  ) : null}
                </div>
              )
            })}
          </div>

          <motion.div
            key={step}
            data-testid="reservas-step-content"
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
          >
            {stepContent}
          </motion.div>
        </div>
      </section>

      <Modal
        testId="reservas-same-day-modal"
        open={sameDayOpen}
        title={text('Reserva para el mismo día', 'Same-day reservation')}
        onClose={() => setSameDayOpen(false)}
        primaryHref="tel:638857294"
        primaryLabel={text('Llamar', 'Call')}
      >
        {text('No se admiten reservas por la web para el mismo día. Para completar su reserva, llame al 638 85 72 94.', 'Same-day reservations cannot be made online. To complete your reservation, call 638 85 72 94.')}
      </Modal>

      <Modal
        testId="reservas-more-than-10-modal"
        open={moreThan10Open}
        title={text('Reservas de más de 10 personas', 'Reservations for more than 10 guests')}
        onClose={() => setMoreThan10Open(false)}
        primaryHref="tel:638857294"
        primaryLabel={text('Llamar', 'Call')}
      >
        {text('Para mesas superiores a 10 comensales se ofrecerá el menú de grupo. Para finalizar la reserva por favor llame o contacte por WhatsApp.', 'A group menu is offered for parties of more than 10 guests. To complete your reservation, call or contact us via WhatsApp.')}
      </Modal>

      <Modal
        testId="reservas-confirmation-modal"
        open={confirmationOpen}
        title={t('reservations.confirm.title')}
        onClose={() => {
          setConfirmationOpen(false)
          window.location.href = '/'
        }}
        secondaryLabel={t('common.ok')}
      >
        <div class="resvConfirm" data-testid="reservas-confirmation-content">
          <div class="resvConfirm__lead" data-testid="reservas-confirmation-lead">{t('reservations.confirm.lead')}</div>
          {confirmationSpecial ? (
            // Coordination id: special_booking_v1
            // Special-booking confirmation: surface the special-date title and
            // the total-adelanto line so the user can re-check the deposit
            // before closing the modal.
            <>
              <div class="resvConfirm__special-title" data-testid="reservas-confirmation-special-title">
                {text('Reserva para:', 'Reservation for:')} <strong>{confirmationSpecial.title}</strong>
              </div>
              <div class="resvConfirm__special-adelanto" data-testid="reservas-confirmation-special-adelanto">
                {text('Adelanto a pagar:', 'Deposit to pay:')}{' '}
                <strong>
                  {confirmationSpecial.totalAdelanto.toFixed(2)}€
                  {confirmationSpecial.paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[confirmationSpecial.paymentMethod]}` : ''}
                </strong>
              </div>
            </>
          ) : null}
          <div class="resvConfirm__fine" data-testid="reservas-confirmation-fine">{t('reservations.confirm.fine')}</div>
          <div class="resvConfirm__elegant" data-testid="reservas-confirmation-elegant">{t('reservations.confirm.elegant')}</div>
        </div>
      </Modal>

      <DuplicateBookingModal
        open={duplicateModalOpen}
        response={duplicateCheck}
        onClose={() => setDuplicateModalOpen(false)}
      />

      {submitting && (
        <div class="resvOverlay" role="alert" aria-label={text('Enviando reserva', 'Sending reservation')} data-testid="reservas-submitting-overlay">
          <div class="resvOverlay__spinner" data-testid="reservas-submitting-spinner" />
          <div class="resvOverlay__text" data-testid="reservas-submitting-text">{text('Enviando reserva…', 'Sending reservation…')}</div>
        </div>
      )}

      <div class="resvToastStack" aria-live="polite" aria-relevant="additions removals" data-testid="reservas-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} class={`resvToast ${t.type}`} data-testid={`reservas-toast-${t.id}`}>
            <div class="resvToast__icon" aria-hidden="true" data-testid={`reservas-toast-${t.id}-icon`}>
              <ToastIcon type={t.type} testId={`reservas-toast-${t.id}-icon-svg`} />
            </div>
            <div class="resvToast__content" data-testid={`reservas-toast-${t.id}-content`}>
              <div class="resvToast__title" data-testid={`reservas-toast-${t.id}-title`}>{t.title}</div>
              <div class="resvToast__msg" data-testid={`reservas-toast-${t.id}-message`}>{t.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

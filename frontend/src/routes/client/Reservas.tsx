import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { Trash2 } from 'lucide-react'
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
  ReservationDayContextFloor,
  ReservationDayContextResponse,
  RiceTypesResponse,
  ValidGroupMenusForPartySizeResponse,
  GroupMenuDisplay,
} from '../../lib/types'
import { PopoverSelect, type PopoverSelectOption } from '../../components/reservas/PopoverSelect'
import { Counter } from '../../components/reservas/Counter'
import { Checkbox } from '../../components/reservas/Checkbox'
import { InlineCounter } from '../../components/reservas/InlineCounter'

type ToastType = 'error' | 'warning' | 'success' | 'info'
type Toast = { id: number; type: ToastType; title: string; message: string }

type StepId = 'date' | 'mandatoryMenu' | 'groupMenu' | 'rice' | 'personal' | 'adults' | 'accessories' | 'summary'

type PrincipalesRow = { name: string; servings: number }

type Country = { name: string; code: string; flag: string; dial: string; keywords: string }

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function isoFromLocalDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseISODateLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const da = Number(m[3])
  const d = new Date(y, mo, da)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function startOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDaysLocal(d: Date, days: number) {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

function textFor(lang: Lang, es: string, en: string) {
  return lang === 'en' ? en : es
}

function monthName(monthIndex0: number, lang: Lang) {
  return new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(2024, monthIndex0, 1))
}

function reservationDateDisplay(iso: string, lang: Lang) {
  const d = parseISODateLocal(iso)
  if (!d) return ''
  const date = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  return `${textFor(lang, 'Reserva para', 'Reservation for')} ${date}`
}

function onlyDigits(s: string) {
  return s.replace(/[^0-9]/g, '')
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

function normalizeDateOnly(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const match = /^(\d{4}-\d{2}-\d{2})[T\s]/.exec(trimmed)
  if (match) return match[1]
  return trimmed
}

function normalizeDateSet(values: unknown): Set<string> {
  return new Set(readStringArray(values).map(normalizeDateOnly).filter(Boolean))
}

function getPrincipalesItems(menu: GroupMenuDisplay | null): string[] {
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

function buildCalendarCells(year: number, month0: number) {
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

function ToastIcon(props: { type: ToastType }) {
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
      <svg {...common}>
        <path
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
      <svg {...common}>
        <path
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
      <svg {...common}>
        <path
          d="M12 17v-6"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M12 7h.01"
          stroke="currentColor"
          stroke-width="3.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
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
    <svg {...common}>
      <path
        d="M12 9v5"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M12 17h.01"
        stroke="currentColor"
        stroke-width="3.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
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

function Modal(props: {
  open: boolean
  title: string
  children: any
  onClose: () => void
  primaryHref?: string
  primaryLabel?: string
  secondaryLabel?: string
}) {
  const { lang } = useI18n()
  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.open, props.onClose])

  if (!props.open) return null
  return (
    <div class="resvModal" role="dialog" aria-modal="true" aria-label={props.title}>
      <div class="resvModal__backdrop" onClick={props.onClose} />
      <div class="resvModal__card" onClick={(e) => e.stopPropagation()}>
        <div class="resvModal__title">{props.title}</div>
        <div class="resvModal__body">{props.children}</div>
        <div class="resvModal__actions">
          <button type="button" class="btn" onClick={props.onClose}>
            {props.secondaryLabel || textFor(lang, 'Cerrar', 'Close')}
          </button>
          {props.primaryHref ? (
            <a class="btn primary" href={props.primaryHref}>
              {props.primaryLabel || textFor(lang, 'Continuar', 'Continue')}
            </a>
          ) : null}
        </div>
      </div>
    </div>
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
  const maxDate = useMemo(() => addDaysLocal(today, 40), [today])
  const todayISO = useMemo(() => isoFromLocalDate(today), [today])
  const maxISO = useMemo(() => isoFromLocalDate(maxDate), [maxDate])

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
  const [selectedShift, setSelectedShift] = useState<'morning' | 'night' | null>(null)

  const [partySize, setPartySize] = useState<number | null>(null)
  const [reservationTime, setReservationTime] = useState<string | null>(null)

  const [step, setStep] = useState<StepId>('date')
  const stepsScrollerRef = useRef<HTMLDivElement | null>(null)
  const stepsScrollRafRef = useRef<number | null>(null)
  const pageScrollRafRef = useRef<number | null>(null)
  const prevStepRef = useRef<StepId | null>(null)

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

  const [sameDayOpen, setSameDayOpen] = useState(false)
  const [moreThan10Open, setMoreThan10Open] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)

  const childrenCount = useMemo(() => {
    if (!partySize || adults == null) return null
    return clamp(partySize - adults, 0, partySize)
  }, [partySize, adults])

  const dateStepReady = Boolean(
    selectedDate &&
    partySize &&
    reservationTime &&
    activeFloors.length > 0 &&
    (activeFloors.length === 1 || selectedFloorNumber != null) &&
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

  const steps = useMemo(() => {
    const out: { id: StepId; label: string }[] = [{ id: 'date', label: text('Fecha y personas', 'Date and guests') }]

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

    out.push({ id: 'personal', label: text('Datos', 'Details') })
    out.push({ id: 'adults', label: text('Adultos', 'Adults') })

    const includeAccessories = childrenCount === null ? true : childrenCount > 0
    if (includeAccessories) out.push({ id: 'accessories', label: text('Accesorios', 'Accessories') })

    out.push({ id: 'summary', label: text('Resumen', 'Summary') })
    return out
  }, [groupMenus, wantsGroupMenu, childrenCount, mandatoryMenuData, mandatoryMenuId, lang])

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

  const countries = useMemo<Country[]>(
    () => [
      { name: text('España', 'Spain'), code: 'ES', flag: '🇪🇸', dial: '34', keywords: 'spain espana esp' },
      { name: text('Francia', 'France'), code: 'FR', flag: '🇫🇷', dial: '33', keywords: 'france' },
      { name: 'Portugal', code: 'PT', flag: '🇵🇹', dial: '351', keywords: 'portugal' },
      { name: text('Reino Unido', 'United Kingdom'), code: 'GB', flag: '🇬🇧', dial: '44', keywords: 'uk united kingdom britain' },
      { name: text('Alemania', 'Germany'), code: 'DE', flag: '🇩🇪', dial: '49', keywords: 'germany deutschland' },
      { name: text('Italia', 'Italy'), code: 'IT', flag: '🇮🇹', dial: '39', keywords: 'italy italia' },
      { name: text('Estados Unidos', 'United States'), code: 'US', flag: '🇺🇸', dial: '1', keywords: 'usa united states' },
      { name: text('México', 'Mexico'), code: 'MX', flag: '🇲🇽', dial: '52', keywords: 'mexico' },
      { name: 'Argentina', code: 'AR', flag: '🇦🇷', dial: '54', keywords: 'argentina' },
      { name: 'Colombia', code: 'CO', flag: '🇨🇴', dial: '57', keywords: 'colombia' },
      { name: text('Países Bajos', 'Netherlands'), code: 'NL', flag: '🇳🇱', dial: '31', keywords: 'netherlands holland' },
      { name: text('Bélgica', 'Belgium'), code: 'BE', flag: '🇧🇪', dial: '32', keywords: 'belgium' },
      { name: text('Suiza', 'Switzerland'), code: 'CH', flag: '🇨🇭', dial: '41', keywords: 'switzerland suisse' },
      { name: text('Irlanda', 'Ireland'), code: 'IE', flag: '🇮🇪', dial: '353', keywords: 'ireland' },
      { name: text('Suecia', 'Sweden'), code: 'SE', flag: '🇸🇪', dial: '46', keywords: 'sweden' },
      { name: text('Noruega', 'Norway'), code: 'NO', flag: '🇳🇴', dial: '47', keywords: 'norway' },
      { name: text('Dinamarca', 'Denmark'), code: 'DK', flag: '🇩🇰', dial: '45', keywords: 'denmark' },
    ],
    [lang]
  )

  const countryOptions = useMemo<PopoverSelectOption[]>(
    () =>
      countries.map((c) => ({
        value: c.dial,
        label: `${c.name}`,
        left: c.flag,
        right: `+${c.dial}`,
        keywords: `${c.keywords} +${c.dial} ${c.dial}`,
      })),
    [countries]
  )

  const peopleOptions = useMemo<PopoverSelectOption[]>(() => {
    const max = freeSeats == null ? 0 : Math.min(10, freeSeats)
    const out: PopoverSelectOption[] = []
    const suffix = t('reservations.people.suffix')
    for (let i = 2; i <= max; i++) {
      if (i === 2 && !twoTopAvailable) continue
      out.push({ value: String(i), label: suffix, left: String(i) })
    }
    if (freeSeats != null && freeSeats > 10) {
      out.push({ value: 'more_than_10', label: suffix, left: '10+' })
    }
    return out
  }, [freeSeats, twoTopAvailable, t])

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

  const showUpperFloorWarning = useMemo(() => {
    if (activeFloors.length === 0) return false
    const hasGroundOpen = activeFloors.some((floor) => floor.isGround)
    if (hasGroundOpen) return false
    return activeFloors.some((floor) => !floor.isGround)
  }, [activeFloors])

  const shiftOptions = useMemo<PopoverSelectOption[]>(
    () => [
      { value: 'morning', label: text('Comida', 'Lunch'), keywords: 'comida lunch mañana mediodia' },
      { value: 'night', label: text('Cena', 'Dinner'), keywords: 'cena dinner noche' },
    ],
    [lang]
  )

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
    const out: { hour: string; status: 'available' | 'limited' }[] = []
    const hours = Array.isArray(hourData.activeHours) ? hourData.activeHours : []
    for (const h of hours) {
      if (allowed.size > 0 && !allowed.has(h)) continue
      const slot = hourData.hourData?.[h]
      if (!slot) continue
      if (slot.isClosed || slot.status === 'closed') continue
      if (typeof slot.capacity === 'number' && slot.capacity < partySize) continue
      out.push({ hour: h, status: slot.status === 'limited' ? 'limited' : 'available' })
    }
    return out
  }, [activeShiftHours, hourData, partySize])

  const selectedHour = useMemo(() => {
    if (!reservationTime) return null
    return availableHours.find((h) => h.hour === reservationTime) || null
  }, [availableHours, reservationTime])

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
  }, [maxISO, today])

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

  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth0), [viewYear, viewMonth0])

  const isClosedByDefault = (iso: string) => {
    const d = parseISODateLocal(iso)
    if (!d) return true
    const dow = d.getDay()
    const defaultClosed = dow === 1 || dow === 2 || dow === 3
    if (openedDays.has(iso)) return false
    if (closedDays.has(iso)) return true
    return defaultClosed
  }

  const isDisabledDate = (iso: string, inMonth: boolean) => {
    if (!inMonth) return true
    if (iso < todayISO) return true
    if (iso > maxISO) return true
    if (isClosedByDefault(iso)) return true
    const free = monthAvailability?.[iso]?.freeBookingSeats
    if (typeof free === 'number' && free <= 0) return true
    return false
  }

  const loadDateContext = async (iso: string) => {
    setSelectedDate(iso)
    setDateDisplay(reservationDateDisplay(iso, lang))
    setPartySize(null)
    setAdults(null)
    setHighChairs(0)
    setBabyStrollers(0)
    setReservationTime(null)
    setFreeSeats(null)
    setTwoTopAvailable(true)
    setHourData(null)
    setDayContext(null)
    setActiveFloors([])
    setSelectedFloorNumber(null)
    setSelectedShift(null)
    setStep('date')

    const loadTwoTopAvailability = async () => {
      try {
        return await apiGetJson<MesasDeDosResponse>(
          `/api/reservations/two-top-availability?date=${encodeURIComponent(iso)}`
        )
      } catch {
        try {
          const body = new URLSearchParams({ date: iso })
          const res = await apiFetch('/api/fetch_mesas_de_dos.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              Accept: 'application/json',
            },
            body: body.toString(),
          })
          const data = (await res.json().catch(() => null)) as MesasDeDosResponse | null
          const apiError = data as { success?: boolean } | null
          if (!res.ok || !data || apiError?.success === false) {
            throw new Error('No se pudo cargar disponibilidad de mesas de 2')
          }
          return data
        } catch {
          return null
        }
      }
    }

    const loadHours = async () => {
      try {
        return await apiGetJson<HourDataResponse>(`/api/reservations/hour-data?date=${encodeURIComponent(iso)}`)
      } catch {
        return apiGetJson<HourDataResponse>(`/api/gethourdata.php?date=${encodeURIComponent(iso)}`)
      }
    }

    const loadDayContext = async () => {
      try {
        return await apiGetJson<ReservationDayContextResponse>(`/api/reservations/day-context?date=${encodeURIComponent(iso)}`)
      } catch {
        return apiGetJson<ReservationDayContextResponse>(
          `/api/get_reservation_day_context.php?date=${encodeURIComponent(iso)}`
        )
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
      const nextActiveFloors = Array.isArray(context.activeFloors)
        ? context.activeFloors
        : (context.floors || []).filter((floor) => floor.active)
      setActiveFloors(nextActiveFloors)

      if (nextActiveFloors.length === 1) {
        setSelectedFloorNumber(nextActiveFloors[0].floorNumber)
      }
      if (context.openingMode === 'morning') {
        setSelectedShift('morning')
      } else if (context.openingMode === 'night') {
        setSelectedShift('night')
      }
    } catch (e) {
      pushToast('error', text('Error', 'Error'), lang === 'en' ? 'Availability could not be loaded.' : e instanceof Error ? e.message : 'No se pudo cargar la disponibilidad.')
    }
  }

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
    if (iso > maxISO) {
      pushToast('warning', text('Demasiada antelación', 'Date too far ahead'), text('Solo se pueden realizar reservas con hasta 40 días de antelación.', 'Reservations can only be made up to 40 days in advance.'))
      return
    }
    if (isClosedByDefault(iso)) {
      pushToast('warning', text('Restaurante cerrado', 'Restaurant closed'), text('El restaurante se encuentra cerrado en la fecha seleccionada.', 'The restaurant is closed on the selected date.'))
      return
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
    if (activeFloors.length > 1 && selectedFloorNumber == null) {
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
      setStep('personal')
      return
    }
    setStep('rice')
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
    setStep('personal')
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

  const goNextFromPersonal = () => {
    if (!validatePersonal()) return
    if (partySize && (adults == null || adults < 1 || adults > partySize)) {
      setAdults(partySize)
    }
    setStep('adults')
  }

  const goNextFromAdults = () => {
    if (!partySize) return
    const a = adults == null ? partySize : clamp(adults, 1, partySize)
    setAdults(a)
    const kids = partySize - a
    if (kids <= 0) {
      setHighChairs(0)
      setBabyStrollers(0)
      setStep('summary')
    } else {
      setStep('accessories')
    }
  }

  const goNextFromAccessories = () => {
    setStep('summary')
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
    if (activeFloors.length > 1 && selectedFloorNumber == null) {
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

    if (groupMenus && groupMenus.length > 0) {
      if (!validateGroupMenuStep()) return
    }
    if (!validateRiceStep()) return

    const fd = new FormData()
    fd.set('website_url', '')
    fd.set('form_load_time', String(formLoadTimeRef.current))
    fd.set('reservation_date', selectedDate)
    fd.set('party_size', String(partySize))
    fd.set('reservation_time', reservationTime)
    if (selectedFloorNumber != null) {
      fd.set('preferred_floor_number', String(selectedFloorNumber))
    }
    fd.set('customer_name', fullName.trim())
    fd.set('contact_email', email.trim())
    fd.set('country_code', '+' + onlyDigits(countryCode))
    fd.set('contact_phone', onlyDigits(phoneNational))
    const a = adults == null ? partySize : clamp(adults, 1, partySize)
    const kids = clamp(partySize - a, 0, partySize)
    fd.set('adults', String(a))
    fd.set('children', String(kids))

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

    fd.set('high_chairs', String(highChairs))
    fd.set('baby_strollers', String(babyStrollers))

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
        <div class="resvStep">
          <div class="resvGrid2">
            <div class="resvCard">
              <div class="resvCardHead">
                <div class="resvCardTitle">{text('Selecciona una fecha', 'Select a date')}</div>
              </div>

              <div class="resvCalendar">
                <div class="resvCalendarHead">
                  <button
                    type="button"
                    class="resvCalNav"
                    aria-label={text('Mes anterior', 'Previous month')}
                    onClick={() => {
                      const m = viewMonth0 - 1
                      if (m < 0) {
                        setViewMonth0(11)
                        setViewYear((y) => y - 1)
                      } else {
                        setViewMonth0(m)
                      }
                    }}
                  >
                    ‹
                  </button>
                  <div class="resvCalTitle">
                    {monthName(viewMonth0, lang)} {viewYear}
                  </div>
                  <button
                    type="button"
                    class="resvCalNav"
                    aria-label={text('Mes siguiente', 'Next month')}
                    onClick={() => {
                      const m = viewMonth0 + 1
                      if (m > 11) {
                        setViewMonth0(0)
                        setViewYear((y) => y + 1)
                      } else {
                        setViewMonth0(m)
                      }
                    }}
                  >
                    ›
                  </button>
                </div>

                <div class="resvCalWeekdays" aria-hidden="true">
                  {(lang === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'X', 'J', 'V', 'S', 'D']).map((day, index) => <div key={index}>{day}</div>)}
                </div>

                <div class="resvCalDays">
                  {cells.map((c) => {
                    const free = monthAvailability?.[c.iso]?.freeBookingSeats
                    const fullyBooked = typeof free === 'number' && free <= 0
                    const disabled = isDisabledDate(c.iso, c.inMonth)
                    const isSelected = selectedDate === c.iso
                    const isToday = c.iso === todayISO

                    let cls = 'resvDay'
                    if (!c.inMonth) cls += ' other'
                    if (disabled) cls += ' disabled'
                    if (fullyBooked) cls += ' full'
                    if (isSelected && !disabled) cls += ' selected'
                    if (isToday && !disabled) cls += ' today'

                    return (
                      <button
                        type="button"
                        class={cls}
                        key={c.iso}
                        disabled={disabled}
                        onClick={() => onPickDate(c.iso, c.inMonth)}
                      >
                        {c.date.getDate()}
                      </button>
                    )
                  })}
                </div>

                <div class="resvLegend" aria-hidden="true">
                  <div class="resvLegendItem">
                    <i class="swatch available" /> {text('Disponible', 'Available')}
                  </div>
                  <div class="resvLegendItem">
                    <i class="swatch selected" /> {text('Seleccionado', 'Selected')}
                  </div>
                  <div class="resvLegendItem">
                    <i class="swatch disabled" /> {text('No disponible', 'Unavailable')}
                  </div>
                  <div class="resvLegendItem">
                    <i class="swatch full" /> {text('Completo', 'Full')}
                  </div>
                </div>
              </div>
            </div>

            {selectedDate ? (
              <motion.div
                class="resvCard"
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              >
                <div class="resvCardHead">
                  <div class="resvCardTitle">{text('Tu reserva', 'Your reservation')}</div>
                  <div class="resvCardSub">{selectedDate ? dateDisplay : text('Elige fecha, personas y hora.', 'Choose date, guests and time.')}</div>
                </div>

                {showUpperFloorWarning ? (
                  <div class="resvNotice warn">{text('La planta baja está cerrada. La reserva se asignará a primera planta sin ascensor.', 'The ground floor is closed. Your table will be on the first floor, with no lift access.')}</div>
                ) : null}

                <div class="resvField resvField--inline">
                  <div class="resvLabel">{t('reservations.people.label')}</div>
                  <PopoverSelect
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

                {activeFloors.length > 1 ? (
                  <div class="resvField">
                    <div class="resvLabel">{text('Salón', 'Dining room')}</div>
                    <PopoverSelect
                      ariaLabel={text('Salón', 'Dining room')}
                      value={selectedFloorNumber != null ? String(selectedFloorNumber) : null}
                      placeholder={text('Selecciona un salón', 'Select a dining room')}
                      options={floorOptions}
                      onChange={(v) => {
                        const n = Number(v)
                        setSelectedFloorNumber(Number.isFinite(n) ? n : null)
                      }}
                    />
                  </div>
                ) : null}

                {dayContext?.openingMode === 'both' ? (
                  <div class="resvField">
                    <div class="resvLabel">{text('Turno', 'Service')}</div>
                    <PopoverSelect
                      ariaLabel={text('Turno', 'Service')}
                      value={selectedShift}
                      placeholder={text('Selecciona comida o cena', 'Select lunch or dinner')}
                      options={shiftOptions}
                      onChange={(v) => {
                        if (v !== 'morning' && v !== 'night') return
                        setSelectedShift(v)
                        setReservationTime(null)
                      }}
                    />
                  </div>
                ) : null}

                <div class="resvField">
                  <div class="resvLabel">{text('Horas disponibles', 'Available times')}</div>
                  {partySize ? (
                    dayContext?.openingMode === 'both' && !selectedShift ? (
                      <div class="resvHint">{text('Selecciona primero el turno para ver las horas disponibles.', 'Select lunch or dinner first to see available times.')}</div>
                    ) : availableHours.length > 0 ? (
                      <>
                        <div class="resvHours">
                          {availableHours.map((h) => (
                            <button
                              type="button"
                              key={h.hour}
                              class={
                                reservationTime === h.hour
                                  ? h.status === 'limited'
                                    ? 'resvHourBtn selected limited'
                                    : 'resvHourBtn selected'
                                  : h.status === 'limited'
                                    ? 'resvHourBtn limited'
                                    : 'resvHourBtn'
                              }
                              onClick={() => setReservationTime(h.hour)}
                            >
                              {h.hour}
                            </button>
                          ))}
                        </div>
                        {selectedHour ? (
                          <div
                            class={selectedHour.status === 'limited' ? 'resvSelectedTime limited' : 'resvSelectedTime'}
                          >
                            {text('Hora seleccionada:', 'Selected time:')} {selectedHour.hour}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div class="resvEmpty">
                        {text('No hay horas disponibles para', 'No times available for')} {partySize} {t('reservations.people.suffix')} {text('en esta fecha.', 'on this date.')}
                      </div>
                    )
                  ) : (
                    <div class="resvHint">{text('Selecciona primero el número de personas.', 'Select the number of guests first.')}</div>
                  )}
                </div>

                {dateStepReady ? (
                  <motion.div
                    class="resvActions"
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeInOut' }}
                  >
                    <button
                      type="button"
                      class="btn primary"
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
        <div class="resvStep">
          <div class="resvCard">
            <div class="resvCardHead">
              <div class="resvCardTitle">{text('Menú recomendado del día', 'Recommended menu of the day')}</div>
              <div class="resvCardSub">
                {isMandatory
                  ? text('Seleccione un menú recomendado del día para su reserva. Para la fecha seleccionada solo se admitirán reservas con uno de los menús disponibles.', 'Select a recommended menu for your reservation. On this date, reservations are only accepted with one of the available menus.')
                  : text('¿Desea reservar un menú recomendado del día?', 'Would you like to book a recommended menu?')}
              </div>
            </div>

            <div class="resvField">
              <div class="resvLabel">{text('Seleccione un menú', 'Select a menu')}</div>
              <PopoverSelect
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
              <div class="resvMenuDetails">
                {selectedMandatoryMenu.menuType !== 'special' && (
                  <>
                    <div class="resvMenuBlock">
                      <div class="resvMenuTitle">{text('Entrantes incluidos', 'Starters included')}</div>
                      <ul class="resvMenuList">
                        {mandatoryEntrantes.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    {selectedMandatoryMenu.menuChooseMain ? (
                      <div class="resvMenuBlock">
                        <div class="resvMenuTitle">{text('Principales', 'Main courses')}</div>
                        <div class="resvHint">{text('¿Queréis elegir ahora los principales?', 'Would you like to choose the main courses now?')}</div>
                        <div class="resvYesNo">
                          <button
                            type="button"
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
                          <div class="resvPrincipales">
                            {mandatoryPrincipalesRows.map((row, idx) => (
                              <div class="resvPrincipalRow" key={idx} data-ui="principal-row">
                                <PopoverSelect
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
                                  aria-label={text('Eliminar', 'Remove')}
                                  onClick={() => setMandatoryPrincipalesRows((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 size={18} strokeWidth={1.9} aria-hidden="true" />
                                </button>
                              </div>
                            ))}

                            <div class="resvPrincipalesActions">
                              <button
                                type="button"
                                class="btn"
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
                              <div class="resvHint">
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
                      <div class="resvMenuBlock">
                        <div class="resvMenuTitle">{text('Principales', 'Main courses')}</div>
                        <ul class="resvMenuList">
                          {localizedArray(readStringArray(selectedMandatoryMenu.principales?.items || []), selectedMandatoryMenu.principalesEnglish?.items, lang).map((t) => (
                            <li key={t}>{t}</li>
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

            <div class="resvActions">
              <button type="button" class="btn" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {mandatoryMenuStepReady ? (
                <button
                  type="button"
                  class="btn primary"
                  onClick={() => {
                    // If mandatory menu selected, skip rice and group menu steps
                    if (mandatoryMenuId !== null) {
                      setWantsRice(false)
                      setRiceType('')
                      setRiceServings(null)
                      setWantsGroupMenu(false)
                      setGroupMenuId(null)
                    }
                    setStep('personal')
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
        <div class="resvStep">
          <div class="resvCard">
            <div class="resvCardHead">
              <div class="resvCardTitle">{text('Menú de grupos', 'Group menu')}</div>
              <div class="resvCardSub">{text('Menús especiales para grupos.', 'Special menus for groups.')}</div>
            </div>

            <div class="resvYesNo">
              <button
                type="button"
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
                <div class="resvField">
                  <div class="resvLabel">{text('Seleccione un menú', 'Select a menu')}</div>
                  <PopoverSelect
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
                  <div class="resvMenuDetails">
                    <div class="resvMenuBlock">
                      <div class="resvMenuTitle">{text('Entrantes incluidos', 'Starters included')}</div>
                      <ul class="resvMenuList">
                        {localizedArray(readStringArray(selectedMenu.entrantes), selectedMenu.entrantes_english, lang).map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    <div class="resvMenuBlock">
                      <div class="resvMenuTitle">{getPrincipalesTitle(selectedMenu, lang)}</div>
                      <div class="resvHint">{text('¿Queréis elegir ahora los principales?', 'Would you like to choose the main courses now?')}</div>
                      <div class="resvYesNo">
                        <button
                          type="button"
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
                        <div class="resvPrincipales">
                          {principalesRows.map((row, idx) => (
                            <div class="resvPrincipalRow" key={idx} data-ui="principal-row">
                              <PopoverSelect
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
                                aria-label={text('Eliminar', 'Remove')}
                                onClick={() => setPrincipalesRows((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash2 size={18} strokeWidth={1.9} aria-hidden="true" />
                              </button>
                            </div>
                          ))}

                          <div class="resvPrincipalesActions">
                            <button
                              type="button"
                              class="btn"
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
                            <div class="resvHint">
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

            <div class="resvActions">
              <button type="button" class="btn" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {groupMenuStepReady ? (
                <button type="button" class="btn primary" onClick={goNextFromGroupMenu}>
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
        <div class="resvStep">
          <div class="resvCard">
            <div class="resvCardHead">
              <div class="resvCardTitle">{text('Selección de arroz', 'Rice selection')}</div>
              <div class="resvCardSub">{text('Los arroces solo podrán servirse con reserva previa.', 'Rice dishes are only available when ordered in advance.')}</div>
            </div>

            <div class="resvYesNo">
              <button
                type="button"
                class={wantsRice === true ? 'resvChoice selected' : 'resvChoice'}
                onClick={() => setWantsRice(true)}
              >
                {text('Sí', 'Yes')}
              </button>
              <button
                type="button"
                class={wantsRice === false ? 'resvChoice selected' : 'resvChoice'}
                onClick={() => {
                  setWantsRice(false)
                  setRiceType('')
                  setRiceServings(null)
                }}
              >
                {text('No', 'No')}
              </button>
            </div>

            {wantsRice === true ? (
              <div class="resvRiceGrid">
                <div class="resvField">
                  <div class="resvLabel">{text('Tipo de arroz', 'Rice dish')}</div>
                  <PopoverSelect
                    ariaLabel={text('Tipo de arroz', 'Rice dish')}
                    value={riceType ? riceType : null}
                    placeholder={text('Selecciona el tipo de arroz', 'Select a rice dish')}
                    options={riceTypeOptions}
                    searchable={riceTypeOptions.length > 8}
                    searchPlaceholder={text('Buscar arroz', 'Search rice dishes')}
                    onChange={(v) => setRiceType(v)}
                  />
                </div>
                <div class="resvField">
                  <div class="resvLabel">{text('Raciones', 'Servings')}</div>
                  <PopoverSelect
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

            <div class="resvActions">
              <button type="button" class="btn" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {riceStepReady ? (
                <button type="button" class="btn primary" onClick={goNextFromRice}>
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
        <div class="resvStep">
          <div class="resvCard">
            <div class="resvCardHead">
              <div class="resvCardTitle">{text('Datos personales', 'Personal details')}</div>
              <div class="resvCardSub">{text('Estos datos son obligatorios para confirmar la reserva.', 'These details are required to confirm the reservation.')}</div>
            </div>

            <div class="resvForm">
              <div class="resvField">
                <div class="resvLabel resvLabel--compact">{text('Nombre y apellidos', 'Full name')}</div>
                <input
                  class="resvInput"
                  type="text"
                  value={fullName}
                  onInput={(e) => setFullName((e.target as HTMLInputElement).value)}
                  autoComplete="name"
                />
              </div>
              <div class="resvField">
                <div class="resvLabel resvLabel--compact">Email</div>
                <input
                  class="resvInput"
                  type="email"
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  autoComplete="email"
                />
              </div>

              <div class="resvField">
                <div class="resvLabel">{text('Teléfono', 'Phone')}</div>
                <div class="resvPhoneRow">
                  <PopoverSelect
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
                    type="tel"
                    inputMode="numeric"
                    placeholder={text('Número', 'Number')}
                    value={phoneNational}
                    onInput={(e) => setPhoneNational(onlyDigits((e.target as HTMLInputElement).value))}
                    autoComplete="tel-national"
                  />
                </div>
                <div class="resvHint">
                  {text('Se guardará como', 'It will be saved as')} +{onlyDigits(countryCode)} {onlyDigits(phoneNational)}
                </div>
              </div>
            </div>

            <div class="resvActions">
              <button type="button" class="btn" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              {personalStepReady ? (
                <button type="button" class="btn primary" onClick={goNextFromPersonal}>
                  {text('Siguiente', 'Next')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    if (step === 'adults') {
      const ps = partySize || 2
      const a = adults == null ? ps : clamp(adults, 1, ps)
      return (
        <div class="resvStep">
          <div class="resvCard">
            <div class="resvCardHead">
              <div class="resvCardTitle">{text('¿Cuántos adultos sois?', 'How many adults are there?')}</div>
            </div>

            <div class="resvAdultsPanel">
              <Counter ariaLabel={text('Adultos', 'Adults')} value={a} min={1} max={ps} onChange={(n) => setAdults(n)} className="resvCounter--plain" />
            </div>

            <div class="resvActions">
              <button type="button" class="btn" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              <button type="button" class="btn primary" onClick={goNextFromAdults}>
                {text('Siguiente', 'Next')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (step === 'accessories') {
      return (
        <div class="resvStep">
          <div class="resvCard">
            <div class="resvCardHead">
              <div class="resvCardTitle">{text('Accesorios para bebés', 'Baby accessories')}</div>
              <div class="resvCardSub">{text('Indique si necesitáis tronas o vais a traer carrito.', 'Tell us if you need high chairs or will bring a stroller.')}</div>
            </div>

            <div class="resvAccGrid">
              <Counter
                ariaLabel={text('Tronas', 'High chairs')}
                value={highChairs}
                min={0}
                max={3}
                onChange={(n) => setHighChairs(n)}
                subtitle={text('Suplemento de 2€ por trona', '€2 surcharge per high chair')}
              />
              <Counter
                ariaLabel={text('Carros de bebé', 'Baby strollers')}
                value={babyStrollers}
                min={0}
                max={5}
                onChange={(n) => setBabyStrollers(n)}
                subtitle={text('Indique cuántos traerá', 'How many will you bring?')}
              />
            </div>

            <div class="resvActions">
              <button type="button" class="btn" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              <button type="button" class="btn primary" onClick={goNextFromAccessories}>
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
    return (
      <div class="resvStep">
        <div class="resvCard">
          <div class="resvCardHead">
            <div class="resvCardTitle">{text('Resumen de tu reserva', 'Reservation summary')}</div>
            <div class="resvCardSub">{text('Revisa los datos antes de completar la reserva.', 'Check the details before completing your reservation.')}</div>
          </div>

          <div class="resvSummary">
            <div class="resvSummaryRow">
              <span>{text('Fecha', 'Date')}</span>
              <span class="resvSummaryValue">{selectedDate || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>{text('Hora', 'Time')}</span>
              <span class="resvSummaryValue">{reservationTime || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>{text('Turno', 'Service')}</span>
              <span class="resvSummaryValue">{shiftLabel || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>{text('Personas', 'Guests')}</span>
              <span class="resvSummaryValue">{ps || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>{text('Salón', 'Dining room')}</span>
              <span class="resvSummaryValue">{selectedFloor ? (lang === 'en' ? (selectedFloor.isGround ? 'Ground floor' : `Floor ${selectedFloor.floorNumber}`) : selectedFloor.name) : '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>{text('Nombre', 'Name')}</span>
              <span class="resvSummaryValue">{fullName.trim() || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>Email</span>
              <span class="resvSummaryValue">{email.trim() || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>{text('Teléfono', 'Phone')}</span>
              <span class="resvSummaryValue">
                +{onlyDigits(countryCode)} {onlyDigits(phoneNational)}
              </span>
            </div>

            {wantsMenu ? (
              <div class="resvSummaryBlock">
                <div class="resvSummaryBlockTitle">{text('Menú de grupo', 'Group menu')}</div>
                <div class="resvSummaryRow">
                  <span>{text('Menú', 'Menu')}</span>
                  <span class="resvSummaryValue">
                    {localized(selectedMenu.menu_title, selectedMenu.menu_title_english, lang)} ({selectedMenu.price}€/{text('persona', 'person')})
                  </span>
                </div>
                <div class="resvSummaryListTitle">{text('Entrantes', 'Starters')}</div>
                <ul class="resvSummaryList">
                  {localizedArray(readStringArray(selectedMenu.entrantes), selectedMenu.entrantes_english, lang).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {principalesEnabled === true && principalesRows.length > 0 ? (
                  <>
                    <div class="resvSummaryListTitle">{text('Principales', 'Main courses')}</div>
                    <ul class="resvSummaryList">
                      {principalesRows
                        .filter((r) => r.name && r.servings > 0)
                        .map((r) => (
                          <li key={r.name}>
                            {localized(r.name, selectedMenu.principales_english?.items?.[principalesItems.indexOf(r.name)], lang)} x {r.servings}
                          </li>
                        ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : (
              <div class="resvSummaryBlock">
              <div class="resvSummaryBlockTitle">{text('Arroz', 'Rice')}</div>
              <div class="resvSummaryRow">
                <span>{text('Selección', 'Selection')}</span>
                <span class="resvSummaryValue">
                  {wantsRice === true && riceType
                    ? `${localized(riceType, riceTypesEnglish[riceTypes.indexOf(riceType)], lang)} (${riceServings || 0} ${text('raciones', 'servings')})`
                    : text('No arroz', 'No rice')}
                </span>
              </div>
            </div>
          )}

            {hasAccessories ? (
              <div class="resvSummaryBlock">
                <div class="resvSummaryBlockTitle">{text('Accesorios', 'Accessories')}</div>
                <div class="resvSummaryRow">
                  <span>{text('Carros de bebé', 'Baby strollers')}</span>
                  <span class="resvSummaryValue">{babyStrollers}</span>
                </div>
                <div class="resvSummaryRow">
                  <span>{text('Tronas', 'High chairs')}</span>
                  <span class="resvSummaryValue">
                    {highChairs} ({highChairs * 2}€)
                  </span>
                </div>
              </div>
            ) : null}

            {showUpperFloorWarning ? (
              <div class="resvNotice warn">{text('Ubicación: primera planta sin ascensor.', 'Location: first floor, no lift access.')}</div>
            ) : null}
          </div>

          <div class="resvTerms">
            <label class="resvCheck">
              <Checkbox checked={termsAccepted} onCheckedChange={setTermsAccepted} variant="accent" size="sm" />
              <span>
                {text('He leído y acepto las', 'I have read and accept the')}{' '}
                <a href="/avisolegal" target="_blank" rel="noreferrer">
                  {text('condiciones de uso y aviso legal', 'terms of use and legal notice')}
                </a>{' '}
                {text('y las', 'and the')}{' '}
                <a href="/booking-policies" target="_blank" rel="noreferrer">
                  {text('políticas de reserva del restaurante', 'restaurant booking policies')}
                </a>
                .
              </span>
            </label>
            <label class="resvCheck">
              <Checkbox checked={privacyAccepted} onCheckedChange={setPrivacyAccepted} variant="accent" size="sm" />
              <span>
                {text('He leído, acepto y consiento el', 'I have read, accept and consent to the')}{' '}
                <a href="/protecciondatos" target="_blank" rel="noreferrer">
                  {text('tratamiento de datos personales', 'processing of personal data')}
                </a>
                .
              </span>
            </label>
          </div>

          <div class="resvActions">
            <button type="button" class="btn" onClick={goPrev} disabled={submitting}>
              {text('Anterior', 'Back')}
            </button>
            {termsAccepted && privacyAccepted ? (
              <button type="button" class="btn primary" onClick={() => void submitBooking()} disabled={submitting}>
                {submitting ? text('Enviando...', 'Sending...') : text('Completar reserva', 'Complete reservation')}
              </button>
            ) : (
              <span class="resvActionFallback">
                {text('Acepta las condiciones para completar la reserva', 'Accept the conditions to complete the booking')}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  })()

  return (
    <div class="page resvPage">
      <section class="page-hero resvHero">
        <div class="container">
          <h1 class="page-title">{text('Reservas', 'Reservations')}</h1>
          <p class="page-subtitle">{text('Selecciona fecha, personas y completa tu reserva.', 'Select a date and number of guests, then complete your reservation.')}</p>
        </div>
      </section>

      <section class="resvMain">
        <div class="container">
          <div class="resvSteps" aria-label={text('Pasos', 'Steps')} ref={stepsScrollerRef}>
            {steps.map((s, idx) => {
              const isActive = s.id === step
              const isDone = idx < currentStepIndex
              const barDone = idx < currentStepIndex
              return (
                <div class="resvStepSeg" key={s.id}>
                  <div class="resvStepDot" data-step-id={s.id}>
                    <div class={isActive ? 'resvDot active' : isDone ? 'resvDot done' : 'resvDot'}>{idx + 1}</div>
                    <div class={isActive ? 'resvDotLabel active' : 'resvDotLabel'}>{s.label}</div>
                  </div>
                  {idx < steps.length - 1 ? (
                    <div class={barDone ? 'resvStepBar done' : 'resvStepBar'} aria-hidden="true" />
                  ) : null}
                </div>
              )
            })}
          </div>

          <motion.div
            key={step}
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
          >
            {stepContent}
          </motion.div>
        </div>
      </section>

      <Modal
        open={sameDayOpen}
        title={text('Reserva para el mismo día', 'Same-day reservation')}
        onClose={() => setSameDayOpen(false)}
        primaryHref="tel:638857294"
        primaryLabel={text('Llamar', 'Call')}
      >
        {text('No se admiten reservas por la web para el mismo día. Para completar su reserva, llame al 638 85 72 94.', 'Same-day reservations cannot be made online. To complete your reservation, call 638 85 72 94.')}
      </Modal>

      <Modal
        open={moreThan10Open}
        title={text('Reservas de más de 10 personas', 'Reservations for more than 10 guests')}
        onClose={() => setMoreThan10Open(false)}
        primaryHref="tel:638857294"
        primaryLabel={text('Llamar', 'Call')}
      >
        {text('Para mesas superiores a 10 comensales se ofrecerá el menú de grupo. Para finalizar la reserva por favor llame o contacte por WhatsApp.', 'A group menu is offered for parties of more than 10 guests. To complete your reservation, call or contact us via WhatsApp.')}
      </Modal>

      <Modal
        open={confirmationOpen}
        title={t('reservations.confirm.title')}
        onClose={() => {
          setConfirmationOpen(false)
          window.location.href = '/'
        }}
        secondaryLabel={t('common.ok')}
      >
        <div class="resvConfirm">
          <div class="resvConfirm__lead">{t('reservations.confirm.lead')}</div>
          <div class="resvConfirm__fine">{t('reservations.confirm.fine')}</div>
          <div class="resvConfirm__elegant">{t('reservations.confirm.elegant')}</div>
        </div>
      </Modal>

      {submitting && (
        <div class="resvOverlay" role="alert" aria-label={text('Enviando reserva', 'Sending reservation')}>
          <div class="resvOverlay__spinner" />
          <div class="resvOverlay__text">{text('Enviando reserva…', 'Sending reservation…')}</div>
        </div>
      )}

      <div class="resvToastStack" aria-live="polite" aria-relevant="additions removals">
        {toasts.map((t) => (
          <div key={t.id} class={`resvToast ${t.type}`}>
            <div class="resvToast__icon" aria-hidden="true">
              <ToastIcon type={t.type} />
            </div>
            <div class="resvToast__content">
              <div class="resvToast__title">{t.title}</div>
              <div class="resvToast__msg">{t.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

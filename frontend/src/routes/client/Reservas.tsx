import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { apiFetch, apiGetJson } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import type {
  ClosedDaysResponse,
  HourDataResponse,
  InsertBookingResponse,
  MesasDeDosResponse,
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

type ToastType = 'error' | 'warning' | 'success' | 'info'
type Toast = { id: number; type: ToastType; title: string; message: string }

type StepId = 'date' | 'groupMenu' | 'rice' | 'personal' | 'adults' | 'accessories' | 'summary'

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

function monthNameEs(monthIndex0: number) {
  const names = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]
  return names[monthIndex0] || ''
}

function weekdayAndMonthDisplayEs(iso: string) {
  const d = parseISODateLocal(iso)
  if (!d) return ''
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const monthNames = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  const dayOfWeek = dayNames[d.getDay()]
  const dayOfMonth = d.getDate()
  const month = monthNames[d.getMonth()]
  return `Reserva para ${dayOfWeek} ${dayOfMonth} ${month}`
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

function getPrincipalesItems(menu: GroupMenuDisplay | null): string[] {
  if (!menu || !menu.principales || typeof menu.principales !== 'object') return []
  const items = (menu.principales as any).items
  return readStringArray(items)
}

function getPrincipalesTitle(menu: GroupMenuDisplay | null): string {
  if (!menu || !menu.principales || typeof menu.principales !== 'object') return 'Principales'
  const t = (menu.principales as any).titulo_principales
  if (typeof t === 'string' && t.trim()) return t.trim()
  return 'Principales'
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
            {props.secondaryLabel || 'Cerrar'}
          </button>
          {props.primaryHref ? (
            <a class="btn primary" href={props.primaryHref}>
              {props.primaryLabel || 'Continuar'}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function Reservas() {
  const reduceMotion = useReducedMotion()
  const { t } = useI18n()
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

  // Rice.
  const [riceTypes, setRiceTypes] = useState<string[]>([])
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

  const steps = useMemo(() => {
    const out: { id: StepId; label: string }[] = [{ id: 'date', label: 'Fecha y personas' }]

    const hasMenu = !!groupMenus && groupMenus.length > 0
    if (hasMenu) out.push({ id: 'groupMenu', label: 'Menú' })

    // Legacy-like: before the user chooses (null), keep Arroz visible.
    const includeRice = !hasMenu || wantsGroupMenu !== true
    if (includeRice) out.push({ id: 'rice', label: 'Arroz' })

    out.push({ id: 'personal', label: 'Datos' })
    out.push({ id: 'adults', label: 'Adultos' })

    const includeAccessories = childrenCount === null ? true : childrenCount > 0
    if (includeAccessories) out.push({ id: 'accessories', label: 'Accesorios' })

    out.push({ id: 'summary', label: 'Resumen' })
    return out
  }, [groupMenus, wantsGroupMenu, childrenCount])

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
      { name: 'España', code: 'ES', flag: '🇪🇸', dial: '34', keywords: 'spain espana esp' },
      { name: 'Francia', code: 'FR', flag: '🇫🇷', dial: '33', keywords: 'france' },
      { name: 'Portugal', code: 'PT', flag: '🇵🇹', dial: '351', keywords: 'portugal' },
      { name: 'Reino Unido', code: 'GB', flag: '🇬🇧', dial: '44', keywords: 'uk united kingdom britain' },
      { name: 'Alemania', code: 'DE', flag: '🇩🇪', dial: '49', keywords: 'germany deutschland' },
      { name: 'Italia', code: 'IT', flag: '🇮🇹', dial: '39', keywords: 'italy italia' },
      { name: 'Estados Unidos', code: 'US', flag: '🇺🇸', dial: '1', keywords: 'usa united states' },
      { name: 'México', code: 'MX', flag: '🇲🇽', dial: '52', keywords: 'mexico' },
      { name: 'Argentina', code: 'AR', flag: '🇦🇷', dial: '54', keywords: 'argentina' },
      { name: 'Colombia', code: 'CO', flag: '🇨🇴', dial: '57', keywords: 'colombia' },
      { name: 'Países Bajos', code: 'NL', flag: '🇳🇱', dial: '31', keywords: 'netherlands holland' },
      { name: 'Bélgica', code: 'BE', flag: '🇧🇪', dial: '32', keywords: 'belgium' },
      { name: 'Suiza', code: 'CH', flag: '🇨🇭', dial: '41', keywords: 'switzerland suisse' },
      { name: 'Irlanda', code: 'IE', flag: '🇮🇪', dial: '353', keywords: 'ireland' },
      { name: 'Suecia', code: 'SE', flag: '🇸🇪', dial: '46', keywords: 'sweden' },
      { name: 'Noruega', code: 'NO', flag: '🇳🇴', dial: '47', keywords: 'norway' },
      { name: 'Dinamarca', code: 'DK', flag: '🇩🇰', dial: '45', keywords: 'denmark' },
    ],
    []
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
    return groupMenus.map((m) => ({
      value: String(m.id),
      label: m.menu_title,
      right: `${m.price}€/persona`,
      keywords: `${m.menu_title} ${m.price}`.toLowerCase(),
    }))
  }, [groupMenus])

  const principalesOptions = useMemo<PopoverSelectOption[]>(
    () => principalesItems.map((it) => ({ value: it, label: it, keywords: it.toLowerCase() })),
    [principalesItems]
  )

  const riceTypeOptions = useMemo<PopoverSelectOption[]>(
    () => riceTypes.map((it) => ({ value: it, label: it, keywords: it.toLowerCase() })),
    [riceTypes]
  )

  const riceServingsOptions = useMemo<PopoverSelectOption[]>(() => {
    const ps = Math.max(2, partySize || 2)
    const out: PopoverSelectOption[] = []
    for (let n = 2; n <= ps; n++) {
      out.push({ value: String(n), label: 'raciones', left: String(n) })
    }
    return out
  }, [partySize])

  const floorOptions = useMemo<PopoverSelectOption[]>(
    () =>
      activeFloors.map((floor) => ({
        value: String(floor.floorNumber),
        label: floor.name,
        keywords: `${floor.name} ${floor.floorNumber}`.toLowerCase(),
      })),
    [activeFloors]
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
      { value: 'morning', label: 'Comida', keywords: 'comida mañana mediodia' },
      { value: 'night', label: 'Cena', keywords: 'cena noche' },
    ],
    []
  )

  const shiftLabel = useMemo(() => {
    if (dayContext?.openingMode === 'morning') return 'Comida'
    if (dayContext?.openingMode === 'night') return 'Cena'
    if (selectedShift === 'morning') return 'Comida'
    if (selectedShift === 'night') return 'Cena'
    return null
  }, [dayContext?.openingMode, selectedShift])

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

  const postForm = async <T,>(path: string, params: Record<string, string>) => {
    const res = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(params),
    })
    const data = (await res.json().catch(() => null)) as any
    if (!res.ok) throw new Error((data && data.message) || `HTTP ${res.status}`)
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      throw new Error(data.message || 'Error')
    }
    return data as T
  }

  // Initial fetch: closed/open days + arroz types.
  useEffect(() => {
    let cancelled = false
    const closedToISO = isoFromLocalDate(addDaysLocal(today, 35))
    apiGetJson<ClosedDaysResponse>(
      `/api/reservations/closed-days?from=${encodeURIComponent(todayISO)}&to=${encodeURIComponent(closedToISO)}`
    )
      .then((d) => {
        if (cancelled) return
        setClosedDays(new Set(d.closed_days || []))
        setOpenedDays(new Set(d.opened_days || []))
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
      })
      .catch(() => {
        if (cancelled) return
        setRiceTypes([])
      })

    return () => {
      cancelled = true
    }
  }, [today, todayISO])

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
    setDateDisplay(weekdayAndMonthDisplayEs(iso))
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

    try {
      const [mesas, hours, context] = await Promise.all([
        postForm<MesasDeDosResponse>('/api/fetch_mesas_de_dos.php', { date: iso }).catch(() => null),
        apiGetJson<HourDataResponse>(`/api/gethourdata.php?date=${encodeURIComponent(iso)}`),
        apiGetJson<ReservationDayContextResponse>(`/api/get_reservation_day_context.php?date=${encodeURIComponent(iso)}`),
      ])

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
      pushToast('error', 'Error', e instanceof Error ? e.message : 'No se pudo cargar la disponibilidad.')
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
      pushToast('error', 'Fecha completa', 'Lo sentimos, no hay disponibilidad para esta fecha.')
      return
    }

    if (iso < todayISO) {
      pushToast('warning', 'Fecha no válida', 'No se pueden seleccionar fechas pasadas.')
      return
    }
    if (iso > maxISO) {
      pushToast('warning', 'Demasiada antelación', 'Solo se pueden realizar reservas con hasta 40 días de antelación.')
      return
    }
    if (isClosedByDefault(iso)) {
      pushToast('warning', 'Restaurante cerrado', 'El restaurante se encuentra cerrado en la fecha seleccionada.')
      return
    }

    void loadDateContext(iso)
  }

  const goNextFromDate = async () => {
    if (!selectedDate) {
      pushToast('warning', 'Fecha requerida', 'Por favor, selecciona una fecha.')
      return
    }
    if (!partySize) {
      pushToast('warning', 'Personas requeridas', 'Por favor, selecciona el número de personas.')
      return
    }
    if (activeFloors.length === 0) {
      pushToast('warning', 'Salones cerrados', 'No hay salones activos para esta fecha. Contacta con el restaurante.')
      return
    }
    if (activeFloors.length > 1 && selectedFloorNumber == null) {
      pushToast('warning', 'Salón requerido', 'Selecciona un salón para continuar.')
      return
    }
    if (dayContext?.openingMode === 'both' && !selectedShift) {
      pushToast('warning', 'Turno requerido', 'Selecciona si tu reserva es para comida o cena.')
      return
    }
    if (!reservationTime) {
      pushToast('warning', 'Hora requerida', 'Por favor, selecciona una hora.')
      return
    }

    try {
      const data = await apiGetJson<ValidGroupMenusForPartySizeResponse>(
        `/api/getValidMenusForPartySize.php?party_size=${encodeURIComponent(String(partySize))}`
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
      pushToast('warning', 'Selección requerida', 'Por favor, indique si desea un menú de grupos o no.')
      return false
    }
    if (wantsGroupMenu === false) return true
    if (!groupMenuId) {
      pushToast('warning', 'Menú requerido', 'Seleccione un menú de grupo.')
      return false
    }
    if (principalesEnabled === true) {
      const cleaned = principalesRows
        .map((r) => ({ name: r.name.trim(), servings: Number(r.servings) || 0 }))
        .filter((r) => r.name && r.servings > 0)
      const unique = new Set<string>()
      for (const r of cleaned) {
        if (unique.has(r.name)) {
          pushToast('warning', 'Principales', 'No repitas el mismo principal.')
          return false
        }
        unique.add(r.name)
        if (!principalesItems.includes(r.name)) {
          pushToast('warning', 'Principales', 'Selecciona solo principales del menú.')
          return false
        }
      }
      const sum = cleaned.reduce((acc, r) => acc + r.servings, 0)
      if (cleaned.length === 0 || sum <= 0) {
        pushToast('warning', 'Principales', 'Añade al menos un principal.')
        return false
      }
      if (partySize && sum > partySize) {
        pushToast('warning', 'Principales', 'Las raciones superan el número de comensales.')
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
      pushToast('warning', 'Arroz', 'Por favor, selecciona si deseas arroz o no.')
      return false
    }
    if (wantsRice === false) return true
    if (!riceType) {
      pushToast('warning', 'Arroz', 'Por favor, selecciona el tipo de arroz.')
      return false
    }
    if (!riceServings || riceServings < 2) {
      pushToast('warning', 'Arroz', 'Por favor, selecciona el número de raciones.')
      return false
    }
    if (partySize && riceServings > partySize) {
      pushToast('warning', 'Arroz', 'Las raciones de arroz no pueden superar el número de comensales.')
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
      pushToast('warning', 'Nombre requerido', 'Por favor, introduce tu nombre y apellidos.')
      return false
    }
    const em = email.trim()
    if (!em) {
      pushToast('warning', 'Email requerido', 'Por favor, introduce tu email.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      pushToast('warning', 'Email no válido', 'Revisa el formato del email.')
      return false
    }
    const cc = onlyDigits(countryCode)
    const phone = onlyDigits(phoneNational)
    if (!cc || cc.length < 1 || cc.length > 4) {
      pushToast('warning', 'Teléfono', 'Selecciona un prefijo válido.')
      return false
    }
    if (!phone || phone.length < 6 || phone.length > 15) {
      pushToast('warning', 'Teléfono', 'Introduce un teléfono válido.')
      return false
    }
    if ((cc + phone).length > 15) {
      pushToast('warning', 'Teléfono', 'El teléfono es demasiado largo.')
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
      pushToast('warning', 'Salones cerrados', 'No hay salones activos para esta fecha. Contacta con el restaurante.')
      return
    }
    if (activeFloors.length > 1 && selectedFloorNumber == null) {
      pushToast('warning', 'Salón requerido', 'Selecciona un salón para completar la reserva.')
      return
    }
    if (dayContext?.openingMode === 'both' && !selectedShift) {
      pushToast('warning', 'Turno requerido', 'Selecciona si tu reserva es para comida o cena.')
      return
    }
    if (!termsAccepted || !privacyAccepted) {
      pushToast('warning', 'Términos', 'Debe aceptar los términos y la protección de datos.')
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

    const wantsMenu = wantsGroupMenu === true && groupMenuId
    fd.set('menu_de_grupo_selected', wantsMenu ? '1' : '0')
    fd.set('menu_de_grupo_id', wantsMenu ? String(groupMenuId) : '')
    fd.set('principales_enabled', wantsMenu && principalesEnabled === true ? '1' : '0')
    fd.set('principales_json', wantsMenu ? JSON.stringify(principalesRows || []) : '[]')

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
      const res = await apiFetch('/api/insert_booking_front.php', { method: 'POST', body: fd })
      const text = await res.text()
      let data: InsertBookingResponse | null = null
      try {
        data = JSON.parse(text) as InsertBookingResponse
      } catch {
        data = null
      }
      if (!res.ok) throw new Error((data && data.message) || `HTTP ${res.status}`)
      if (!data || data.success !== true || typeof data.booking_id !== 'number') {
        throw new Error((data && data.message) || 'Error al realizar la reserva.')
      }
      setConfirmationOpen(true)
    } catch (e) {
      pushToast('error', 'Error', e instanceof Error ? e.message : 'Error al realizar la reserva.')
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
                <div class="resvCardTitle">Selecciona una fecha</div>
              </div>

              <div class="resvCalendar">
                <div class="resvCalendarHead">
                  <button
                    type="button"
                    class="resvCalNav"
                    aria-label="Mes anterior"
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
                    {monthNameEs(viewMonth0)} {viewYear}
                  </div>
                  <button
                    type="button"
                    class="resvCalNav"
                    aria-label="Mes siguiente"
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
                  <div>L</div>
                  <div>M</div>
                  <div>X</div>
                  <div>J</div>
                  <div>V</div>
                  <div>S</div>
                  <div>D</div>
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
                    if (isToday) cls += ' today'

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
                    <i class="swatch available" /> Disponible
                  </div>
                  <div class="resvLegendItem">
                    <i class="swatch selected" /> Seleccionado
                  </div>
                  <div class="resvLegendItem">
                    <i class="swatch disabled" /> No disponible
                  </div>
                  <div class="resvLegendItem">
                    <i class="swatch full" /> Completo
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
                  <div class="resvCardTitle">Tu reserva</div>
                  <div class="resvCardSub">{selectedDate ? dateDisplay : 'Elige fecha, personas y hora.'}</div>
                </div>

                {showUpperFloorWarning ? (
                  <div class="resvNotice warn">La planta baja está cerrada. La reserva se asignará a primera planta sin ascensor.</div>
                ) : null}

                <div class="resvField resvField--inline">
                  <div class="resvLabel">{t('reservations.people.label')}</div>
                  <PopoverSelect
                    ariaLabel="Número de personas"
                    value={partySize ? String(partySize) : null}
                    placeholder={freeSeats == null ? 'Selecciona una fecha' : 'Selecciona'}
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

                <div class="resvField">
                  <div class="resvLabel">Salón</div>
                  {activeFloors.length > 1 ? (
                    <PopoverSelect
                      ariaLabel="Salón"
                      value={selectedFloorNumber != null ? String(selectedFloorNumber) : null}
                      placeholder="Selecciona un salón"
                      options={floorOptions}
                      onChange={(v) => {
                        const n = Number(v)
                        setSelectedFloorNumber(Number.isFinite(n) ? n : null)
                      }}
                    />
                  ) : activeFloors.length === 1 ? (
                    <div class="resvHint">{activeFloors[0].name}</div>
                  ) : (
                    <div class="resvEmpty">No hay salones activos para esta fecha.</div>
                  )}
                </div>

                <div class="resvField">
                  <div class="resvLabel">Turno</div>
                  {dayContext?.openingMode === 'both' ? (
                    <PopoverSelect
                      ariaLabel="Turno"
                      value={selectedShift}
                      placeholder="Selecciona comida o cena"
                      options={shiftOptions}
                      onChange={(v) => {
                        if (v !== 'morning' && v !== 'night') return
                        setSelectedShift(v)
                        setReservationTime(null)
                      }}
                    />
                  ) : shiftLabel ? (
                    <div class="resvHint">Horario de {shiftLabel.toLowerCase()}</div>
                  ) : (
                    <div class="resvHint">Selecciona una fecha para ver turnos.</div>
                  )}
                </div>

                <div class="resvField">
                  <div class="resvLabel">Horas disponibles</div>
                  {partySize ? (
                    dayContext?.openingMode === 'both' && !selectedShift ? (
                      <div class="resvHint">Selecciona primero el turno para ver las horas disponibles.</div>
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
                            Hora seleccionada: {selectedHour.hour}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div class="resvEmpty">
                        No hay horas disponibles para {partySize} {t('reservations.people.suffix')} en esta fecha.
                      </div>
                    )
                  ) : (
                    <div class="resvHint">Selecciona primero el número de personas.</div>
                  )}
                </div>

                <div class="resvActions">
                  <button
                    type="button"
                    class="btn primary"
                    onClick={() => void goNextFromDate()}
                    disabled={!reservationTime}
                  >
                    Siguiente
                  </button>
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      )
    }

    if (step === 'groupMenu') {
      return (
        <div class="resvStep">
          <div class="resvCard">
            <div class="resvCardHead">
              <div class="resvCardTitle">Menú de grupos</div>
              <div class="resvCardSub">Menús especiales para grupos.</div>
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
                Sí
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
                No
              </button>
            </div>

            {wantsGroupMenu === true ? (
              <>
                <div class="resvField">
                  <div class="resvLabel">Seleccione un menú</div>
                  <PopoverSelect
                    ariaLabel="Seleccione un menú"
                    value={groupMenuId ? String(groupMenuId) : null}
                    placeholder="Selecciona un menú"
                    options={groupMenuOptions}
                    searchable={groupMenuOptions.length > 6}
                    searchPlaceholder="Buscar menú"
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
                      <div class="resvMenuTitle">Entrantes incluidos</div>
                      <ul class="resvMenuList">
                        {readStringArray(selectedMenu.entrantes).map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    <div class="resvMenuBlock">
                      <div class="resvMenuTitle">{getPrincipalesTitle(selectedMenu)}</div>
                      <div class="resvHint">¿Queréis elegir ahora los principales?</div>
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
                          Sí
                        </button>
                        <button
                          type="button"
                          class={principalesEnabled === false ? 'resvChoice selected' : 'resvChoice'}
                          onClick={() => {
                            setPrincipalesEnabled(false)
                            setPrincipalesRows([])
                          }}
                        >
                          No
                        </button>
                      </div>

                      {principalesEnabled === true ? (
                        <div class="resvPrincipales">
                          {principalesRows.map((row, idx) => (
                            <div class="resvPrincipalRow" key={idx}>
                              <PopoverSelect
                                ariaLabel={`Principal ${idx + 1}`}
                                value={row.name ? row.name : null}
                                placeholder="Selecciona un principal"
                                options={principalesOptions}
                                searchable={principalesOptions.length > 10}
                                searchPlaceholder="Buscar principal"
                                onChange={(name) =>
                                  setPrincipalesRows((prev) => prev.map((p, i) => (i === idx ? { ...p, name } : p)))
                                }
                              />
                              <input
                                class="resvInput"
                                type="number"
                                min={1}
                                max={partySize || 99}
                                value={row.servings ? String(row.servings) : ''}
                                onInput={(e) => {
                                  const v = Number((e.target as HTMLInputElement).value)
                                  setPrincipalesRows((prev) =>
                                    prev.map((p, i) =>
                                      i === idx ? { ...p, servings: Number.isFinite(v) ? v : 0 } : p
                                    )
                                  )
                                }}
                                placeholder="Raciones"
                                inputMode="numeric"
                              />
                              <button
                                type="button"
                                class="resvIconBtn"
                                aria-label="Eliminar"
                                onClick={() => setPrincipalesRows((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                ✕
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
                              Añadir principal
                            </button>
                            <div class="resvHint">
                              Máximo:{' '}
                              {selectedMenu.main_dishes_limit
                                ? selectedMenu.main_dishes_limit_number
                                : Math.min(10, partySize || 10)}{' '}
                              tipos
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
                Anterior
              </button>
              <button type="button" class="btn primary" onClick={goNextFromGroupMenu}>
                Siguiente
              </button>
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
              <div class="resvCardTitle">Selección de arroz</div>
              <div class="resvCardSub">Los arroces solo podrán servirse con reserva previa.</div>
            </div>

            <div class="resvYesNo">
              <button
                type="button"
                class={wantsRice === true ? 'resvChoice selected' : 'resvChoice'}
                onClick={() => setWantsRice(true)}
              >
                Sí
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
                No
              </button>
            </div>

            {wantsRice === true ? (
              <div class="resvRiceGrid">
                <div class="resvField">
                  <div class="resvLabel">Tipo de arroz</div>
                  <PopoverSelect
                    ariaLabel="Tipo de arroz"
                    value={riceType ? riceType : null}
                    placeholder="Selecciona el tipo de arroz"
                    options={riceTypeOptions}
                    searchable={riceTypeOptions.length > 8}
                    searchPlaceholder="Buscar arroz"
                    onChange={(v) => setRiceType(v)}
                  />
                </div>
                <div class="resvField">
                  <div class="resvLabel">Raciones</div>
                  <PopoverSelect
                    ariaLabel="Raciones"
                    value={riceServings != null ? String(riceServings) : null}
                    placeholder="Selecciona raciones"
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
                Anterior
              </button>
              <button type="button" class="btn primary" onClick={goNextFromRice}>
                Siguiente
              </button>
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
              <div class="resvCardTitle">Datos personales</div>
              <div class="resvCardSub">Estos datos son obligatorios para confirmar la reserva.</div>
            </div>

            <div class="resvForm">
              <div class="resvField">
                <div class="resvLabel">Nombre y apellidos</div>
                <input
                  class="resvInput"
                  type="text"
                  value={fullName}
                  onInput={(e) => setFullName((e.target as HTMLInputElement).value)}
                  autoComplete="name"
                />
              </div>
              <div class="resvField">
                <div class="resvLabel">Email</div>
                <input
                  class="resvInput"
                  type="email"
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  autoComplete="email"
                />
              </div>

              <div class="resvField">
                <div class="resvLabel">Teléfono</div>
                <div class="resvPhoneRow">
                  <PopoverSelect
                    ariaLabel="Prefijo"
                    value={countryCode}
                    placeholder="+34"
                    options={countryOptions}
                    searchable
                    searchPlaceholder="Buscar país"
                    onChange={(v) => setCountryCode(v)}
                  />
                  <input
                    class="resvInput"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Número"
                    value={phoneNational}
                    onInput={(e) => setPhoneNational(onlyDigits((e.target as HTMLInputElement).value))}
                    autoComplete="tel-national"
                  />
                </div>
                <div class="resvHint">
                  Se guardará como +{onlyDigits(countryCode)} {onlyDigits(phoneNational)}
                </div>
              </div>
            </div>

            <div class="resvActions">
              <button type="button" class="btn" onClick={goPrev}>
                Anterior
              </button>
              <button type="button" class="btn primary" onClick={goNextFromPersonal}>
                Siguiente
              </button>
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
              <div class="resvCardTitle">¿Cuántos adultos sois?</div>
            </div>

            <div class="resvAdultsPanel">
              <Counter ariaLabel="Adultos" value={a} min={1} max={ps} onChange={(n) => setAdults(n)} />
            </div>

            <div class="resvActions">
              <button type="button" class="btn" onClick={goPrev}>
                Anterior
              </button>
              <button type="button" class="btn primary" onClick={goNextFromAdults}>
                Siguiente
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
              <div class="resvCardTitle">Accesorios para bebés</div>
              <div class="resvCardSub">Indique si necesitáis tronas o vais a traer carrito.</div>
            </div>

            <div class="resvAccGrid">
              <Counter
                ariaLabel="Tronas"
                value={highChairs}
                min={0}
                max={3}
                onChange={(n) => setHighChairs(n)}
                subtitle="Suplemento de 2€ por trona"
              />
              <Counter
                ariaLabel="Carros de bebé"
                value={babyStrollers}
                min={0}
                max={5}
                onChange={(n) => setBabyStrollers(n)}
                subtitle="Indique cuántos traerá"
              />
            </div>

            <div class="resvActions">
              <button type="button" class="btn" onClick={goPrev}>
                Anterior
              </button>
              <button type="button" class="btn primary" onClick={goNextFromAccessories}>
                Siguiente
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
            <div class="resvCardTitle">Resumen de tu reserva</div>
            <div class="resvCardSub">Revisa los datos antes de completar la reserva.</div>
          </div>

          <div class="resvSummary">
            <div class="resvSummaryRow">
              <span>Fecha</span>
              <span class="resvSummaryValue">{selectedDate || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>Hora</span>
              <span class="resvSummaryValue">{reservationTime || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>Turno</span>
              <span class="resvSummaryValue">{shiftLabel || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>Personas</span>
              <span class="resvSummaryValue">{ps || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>Salón</span>
              <span class="resvSummaryValue">{selectedFloor ? selectedFloor.name : '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>Nombre</span>
              <span class="resvSummaryValue">{fullName.trim() || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>Email</span>
              <span class="resvSummaryValue">{email.trim() || '-'}</span>
            </div>
            <div class="resvSummaryRow">
              <span>Teléfono</span>
              <span class="resvSummaryValue">
                +{onlyDigits(countryCode)} {onlyDigits(phoneNational)}
              </span>
            </div>

            {wantsMenu ? (
              <div class="resvSummaryBlock">
                <div class="resvSummaryBlockTitle">Menú de grupo</div>
                <div class="resvSummaryRow">
                  <span>Menú</span>
                  <span class="resvSummaryValue">
                    {selectedMenu.menu_title} ({selectedMenu.price}€/persona)
                  </span>
                </div>
                <div class="resvSummaryListTitle">Entrantes</div>
                <ul class="resvSummaryList">
                  {readStringArray(selectedMenu.entrantes).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {principalesEnabled === true && principalesRows.length > 0 ? (
                  <>
                    <div class="resvSummaryListTitle">Principales</div>
                    <ul class="resvSummaryList">
                      {principalesRows
                        .filter((r) => r.name && r.servings > 0)
                        .map((r) => (
                          <li key={r.name}>
                            {r.name} x {r.servings}
                          </li>
                        ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : (
              <div class="resvSummaryBlock">
              <div class="resvSummaryBlockTitle">Arroz</div>
              <div class="resvSummaryRow">
                <span>Selección</span>
                <span class="resvSummaryValue">
                  {wantsRice === true && riceType ? `${riceType} (${riceServings || 0} raciones)` : 'No arroz'}
                </span>
              </div>
            </div>
          )}

            {hasAccessories ? (
              <div class="resvSummaryBlock">
                <div class="resvSummaryBlockTitle">Accesorios</div>
                <div class="resvSummaryRow">
                  <span>Carros de bebé</span>
                  <span class="resvSummaryValue">{babyStrollers}</span>
                </div>
                <div class="resvSummaryRow">
                  <span>Tronas</span>
                  <span class="resvSummaryValue">
                    {highChairs} ({highChairs * 2}€)
                  </span>
                </div>
              </div>
            ) : null}

            {showUpperFloorWarning ? (
              <div class="resvNotice warn">Ubicación: primera planta sin ascensor.</div>
            ) : null}
          </div>

          <div class="resvTerms">
            <label class="resvCheck">
              <Checkbox checked={termsAccepted} onCheckedChange={setTermsAccepted} variant="accent" size="sm" />
              <span>
                He leído y acepto las{' '}
                <a href="avisolegal.html" target="_blank" rel="noreferrer">
                  condiciones de uso y aviso legal
                </a>{' '}
                y las{' '}
                <a href="booking_policies.php" target="_blank" rel="noreferrer">
                  políticas de reserva del restaurante
                </a>
                .
              </span>
            </label>
            <label class="resvCheck">
              <Checkbox checked={privacyAccepted} onCheckedChange={setPrivacyAccepted} variant="accent" size="sm" />
              <span>
                He leído, acepto y consiento el{' '}
                <a href="protecciondatos.html" target="_blank" rel="noreferrer">
                  tratamiento de datos personales
                </a>
                .
              </span>
            </label>
          </div>

          <div class="resvActions">
            <button type="button" class="btn" onClick={goPrev} disabled={submitting}>
              Anterior
            </button>
            <button type="button" class="btn primary" onClick={() => void submitBooking()} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Completar reserva'}
            </button>
          </div>
        </div>
      </div>
    )
  })()

  return (
    <div class="page resvPage">
      <section class="page-hero resvHero">
        <div class="container">
          <h1 class="page-title">Reservas</h1>
          <p class="page-subtitle">Selecciona fecha, personas y completa tu reserva.</p>
        </div>
      </section>

      <section class="resvMain">
        <div class="container">
          <div class="resvSteps" aria-label="Pasos" ref={stepsScrollerRef}>
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
        title="Reserva para el mismo día"
        onClose={() => setSameDayOpen(false)}
        primaryHref="tel:638857294"
        primaryLabel="Llamar"
      >
        No se admiten reservas por la web para el mismo día. Para completar su reserva, llame al 638 85 72 94.
      </Modal>

      <Modal
        open={moreThan10Open}
        title="Reservas de más de 10 personas"
        onClose={() => setMoreThan10Open(false)}
        primaryHref="tel:638857294"
        primaryLabel="Llamar"
      >
        Para mesas superiores a 10 comensales se ofrecerá el menú de grupo. Para finalizar la reserva por favor llame o
        contacte por WhatsApp.
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

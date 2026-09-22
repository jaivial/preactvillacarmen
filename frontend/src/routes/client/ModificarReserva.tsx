import { useEffect, useMemo, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { localized, useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type {
  ClosedDaysResponse,
  HourDataResponse,
  MonthAvailabilityResponse,
  RiceTypesResponse,
  SpecialDateSummary,
  SpecialDatesResponse,
} from '../../lib/types'
import { PopoverSelect, type PopoverSelectOption } from '../../components/reservas/PopoverSelect'
import { InlineCounter } from '../../components/reservas/InlineCounter'
import { ReservationCalendar } from '../../components/reservas/ReservationCalendar'
import { ReservationHourPicker } from '../../components/reservas/ReservationHourPicker'
import { ReservationChoice } from '../../components/reservas/ReservationChoice'
import { buildCountries, countrySelectOptions } from '../../components/reservas/countryOptions'
import { onlyDigits } from '../../lib/phone'
import {
  addDaysLocal,
  isoFromLocalDate,
  normalizeDateSet,
  parseISODateLocal,
  startOfDayLocal,
  type CalendarRuleContext,
} from '../../lib/reservationCalendar'
import {
  fetchModifyContext,
  readSelfServiceProof,
  submitBookingModification,
  type SelfServiceBooking,
} from '../../lib/reservationSelfService'

/**
 * /reservas/modificar?id=<bookingId>
 *
 * Self-service edit wizard reached from the duplicate-booking modal. It reuses
 * the booking wizard's step language and components (calendar, service-time
 * picker, yes/no pairs, counters, country picker) and inherits every value from
 * the existing booking, so the guest walks the same familiar steps and only
 * changes what they need.
 *
 * Steps: date -> time -> rice -> mobility (only when the date asks for it) ->
 * details. A special-menu booking keeps its frozen snapshot, so its date step
 * is dropped entirely.
 *
 * Mobile first: single column cards, a horizontally scrollable stepper and
 * 44px+ tap targets, exactly like the booking wizard.
 *
 * Coordination id: reservation_self_modification_v1
 */
type StepId = 'date' | 'time' | 'rice' | 'mobility' | 'details'
type PageState = 'loading' | 'ready' | 'blocked' | 'error' | 'success'

export function ModificarReserva() {
  const { lang } = useI18n()
  const text = (es: string, en: string) => localized(es, en, lang)
  const reduceMotion = useReducedMotion()

  const bookingId = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('id')
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) && n > 0 ? n : null
  }, [])

  const [state, setState] = useState<PageState>('loading')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  // --- inherited booking values -------------------------------------------
  const [date, setDate] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [time, setTime] = useState('')
  const [wantsRice, setWantsRice] = useState<boolean | null>(null)
  const [riceType, setRiceType] = useState('')
  const [riceServings, setRiceServings] = useState<number | null>(null)
  const [hasMobilityIssues, setHasMobilityIssues] = useState<boolean | null>(null)
  const [mobilityPeople, setMobilityPeople] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('34')
  const [phoneNational, setPhoneNational] = useState('')
  const [children, setChildren] = useState(0)
  const [highChairs, setHighChairs] = useState(0)
  const [babyStrollers, setBabyStrollers] = useState(0)

  // --- wizard plumbing -----------------------------------------------------
  const [step, setStep] = useState<StepId>('date')
  const [dateLocked, setDateLocked] = useState(false)
  const [mobilityEnabled, setMobilityEnabled] = useState(false)

  // --- calendar + availability data ---------------------------------------
  const todayISO = useMemo(() => isoFromLocalDate(startOfDayLocal(new Date())), [])
  const maxISO = useMemo(() => isoFromLocalDate(addDaysLocal(startOfDayLocal(new Date()), 40)), [])
  const [viewMonth0, setViewMonth0] = useState(() => new Date().getMonth())
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [monthAvailability, setMonthAvailability] = useState<Record<string, { freeBookingSeats: number }> | null>(null)
  const [closedDays, setClosedDays] = useState<ReadonlySet<string>>(() => new Set())
  const [openedDays, setOpenedDays] = useState<ReadonlySet<string>>(() => new Set())
  const [specialDatesMap, setSpecialDatesMap] = useState<Record<string, SpecialDateSummary>>({})
  const [hourData, setHourData] = useState<HourDataResponse | null>(null)
  const [riceTypes, setRiceTypes] = useState<string[]>([])
  const [riceTypesEnglish, setRiceTypesEnglish] = useState<string[]>([])

  const countryOptions = useMemo<PopoverSelectOption[]>(() => countrySelectOptions(buildCountries(text)), [lang])

  const calendarRules = useMemo<CalendarRuleContext>(
    () => ({ todayISO, maxISO, openedDays, closedDays, specialDates: specialDatesMap, monthAvailability }),
    [todayISO, maxISO, openedDays, closedDays, specialDatesMap, monthAvailability],
  )

  // --- 1. inherit the booking ---------------------------------------------
  useEffect(() => {
    if (!bookingId) {
      setState('error')
      setMessage(text('ID de reserva inválido.', 'Invalid booking ID.'))
      return
    }
    const proof = readSelfServiceProof()
    if (!proof || proof.id !== bookingId) {
      setState('blocked')
      setMessage(
        text(
          'No se pudo verificar la reserva. Vuelve a reservas e inténtalo de nuevo.',
          'We could not verify the booking. Please go back to reservations and try again.',
        ),
      )
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetchModifyContext(bookingId, proof)
        if (cancelled) return
        if (!res.success || !res.booking) {
          setState('error')
          setMessage(res.message || text('Reserva no encontrada.', 'Booking not found.'))
          return
        }
        const b: SelfServiceBooking = res.booking
        setDate(b.reservationDate)
        setPartySize(b.partySize)
        setTime(b.reservationTime)
        setWantsRice(Boolean(b.arrozType))
        setRiceType(b.arrozType || '')
        setRiceServings(b.arrozServings && b.arrozServings >= 2 ? b.arrozServings : null)
        setHasMobilityIssues(Boolean(res.mobilityEnabled) ? Boolean(b.hasMobilityIssues) : null)
        setMobilityPeople((b.mobilityPeople || 0) > 0 ? Number(b.mobilityPeople) : 1)
        setName(b.customerName)
        setEmail(b.contactEmail)
        setCountryCode(b.contactPhoneCountryCode || '34')
        setPhoneNational(b.contactPhone)
        setChildren(b.children)
        setHighChairs(b.highChairs)
        setBabyStrollers(b.babyStrollers)
        setDateLocked(Boolean(res.date_locked))
        setMobilityEnabled(Boolean(res.mobilityEnabled))
        // Open on the month of the booked date.
        const booked = parseISODateLocal(b.reservationDate)
        if (booked) {
          setViewMonth0(booked.getMonth())
          setViewYear(booked.getFullYear())
        }
        if (!res.modifiable) {
          setState('blocked')
          setMessage(res.message || text('No se puede modificar esta reserva online.', 'This booking cannot be modified online.'))
          return
        }
        setStep(res.date_locked ? 'time' : 'date')
        setState('ready')
      } catch {
        if (!cancelled) {
          setState('error')
          setMessage(text('Error al cargar la reserva.', 'Could not load the booking.'))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bookingId])

  // --- 2. calendar datasets + rice types ----------------------------------
  useEffect(() => {
    if (state !== 'ready') return
    let cancelled = false
    const from = todayISO
    const to = isoFromLocalDate(addDaysLocal(startOfDayLocal(new Date()), 120))

    apiGetJson<ClosedDaysResponse>(`/api/reservations/closed-days?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((d) => {
        if (cancelled) return
        setClosedDays(normalizeDateSet(d.closed_days))
        setOpenedDays(normalizeDateSet(d.opened_days))
      })
      .catch(() => {
        if (!cancelled) {
          setClosedDays(new Set())
          setOpenedDays(new Set())
        }
      })

    apiGetJson<SpecialDatesResponse>(`/api/reservations/special-dates?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((d) => {
        if (cancelled) return
        const map: Record<string, SpecialDateSummary> = {}
        for (const s of Array.isArray(d.special_dates) ? d.special_dates : []) {
          if (s && s.date) map[s.date] = s
        }
        setSpecialDatesMap(map)
      })
      .catch(() => {
        if (!cancelled) setSpecialDatesMap({})
      })

    apiGetJson<RiceTypesResponse>('/api/reservations/rice-types')
      .then((d) => {
        if (cancelled) return
        setRiceTypes((d.riceTypes || []).map((s) => String(s).trim()).filter(Boolean))
        setRiceTypesEnglish(Array.isArray(d.riceTypesEnglish) ? d.riceTypesEnglish : [])
      })
      .catch(() => {
        if (!cancelled) setRiceTypes([])
      })

    return () => {
      cancelled = true
    }
  }, [state, todayISO])

  // --- 3. month availability (cached per month) ---------------------------
  const monthCacheRef = useMemo(() => new Map<string, Record<string, { freeBookingSeats: number }>>(), [])
  useEffect(() => {
    if (state !== 'ready') return
    const key = `${viewYear}-${viewMonth0 + 1}`
    const cached = monthCacheRef.get(key)
    if (cached) {
      setMonthAvailability(cached)
      return
    }
    let cancelled = false
    apiGetJson<MonthAvailabilityResponse>(
      `/api/reservations/month-availability?month=${encodeURIComponent(String(viewMonth0 + 1))}&year=${encodeURIComponent(String(viewYear))}`,
    )
      .then((d) => {
        if (cancelled) return
        const compact: Record<string, { freeBookingSeats: number }> = {}
        for (const iso of Object.keys(d.availability || {})) {
          const free = typeof d.availability[iso]?.freeBookingSeats === 'number' ? d.availability[iso].freeBookingSeats : 0
          compact[iso] = { freeBookingSeats: free }
        }
        monthCacheRef.set(key, compact)
        setMonthAvailability(compact)
      })
      .catch(() => {
        if (!cancelled) setMonthAvailability({})
      })
    return () => {
      cancelled = true
    }
  }, [state, viewMonth0, viewYear, monthCacheRef])

  // --- 4. service times for the chosen date -------------------------------
  useEffect(() => {
    if (state !== 'ready' || !date) return
    let cancelled = false
    apiGetJson<HourDataResponse>(`/api/reservations/hour-data?date=${encodeURIComponent(date)}`)
      .then((d) => {
        if (!cancelled) setHourData(d)
      })
      .catch(() => {
        if (!cancelled) setHourData(null)
      })
    return () => {
      cancelled = true
    }
  }, [state, date])

  const availableHours = useMemo(() => {
    const out: { hour: string; status: string }[] = []
    const splitEnabled = hourData?.hourSplitEnabled !== false
    for (const h of hourData?.activeHours || []) {
      const slot = hourData?.hourData?.[h]
      if (!slot || slot.isClosed) continue
      if (splitEnabled && typeof slot.capacity === 'number' && partySize && slot.capacity < partySize) continue
      out.push({ hour: h, status: slot.status === 'limited' ? 'limited' : 'available' })
    }
    // The booked time stays selectable so a no-op edit is always possible.
    if (time && !out.some((h) => h.hour === time)) {
      const slot = hourData?.hourData?.[time]
      if (slot && !slot.isClosed) {
        out.push({ hour: time, status: 'available' })
        out.sort((a, b) => a.hour.localeCompare(b.hour))
      }
    }
    return out
  }, [hourData, partySize, time])

  const freeSeats = typeof monthAvailability?.[date]?.freeBookingSeats === 'number' ? monthAvailability[date].freeBookingSeats : null

  const peopleOptions = useMemo<PopoverSelectOption[]>(() => {
    const suffix = text('personas', 'guests')
    const max = Math.max(20, partySize)
    const out: PopoverSelectOption[] = []
    for (let i = 2; i <= max; i++) out.push({ value: String(i), label: suffix, left: String(i) })
    return out
  }, [lang, partySize])

  const riceTypeOptions = useMemo<PopoverSelectOption[]>(() => {
    const options: PopoverSelectOption[] = riceTypes.map((it, index) => ({
      value: it,
      label: localized(it, riceTypesEnglish[index], lang),
      keywords: `${it} ${riceTypesEnglish[index] || ''}`.toLowerCase(),
    }))
    // The booked dish may have left the catalogue since it was ordered; keep it
    // selectable so the inherited value never renders as an empty field.
    if (riceType && !options.some((o) => o.value === riceType)) {
      options.unshift({ value: riceType, label: riceType })
    }
    return options
  }, [riceTypes, riceTypesEnglish, lang, riceType])

  const riceServingsOptions = useMemo<PopoverSelectOption[]>(() => {
    const out: PopoverSelectOption[] = []
    const max = Math.max(2, partySize || 2)
    for (let i = 2; i <= max; i++) out.push({ value: String(i), label: String(i) })
    return out
  }, [partySize])

  // --- step definitions ----------------------------------------------------
  const steps = useMemo(() => {
    const out: { id: StepId; label: string }[] = []
    if (!dateLocked) out.push({ id: 'date', label: text('Fecha y personas', 'Date and guests') })
    out.push({ id: 'time', label: text('Hora', 'Time') })
    out.push({ id: 'rice', label: text('Arroz', 'Rice') })
    if (mobilityEnabled) out.push({ id: 'mobility', label: text('Movilidad', 'Mobility') })
    out.push({ id: 'details', label: text('Datos', 'Details') })
    return out
  }, [dateLocked, mobilityEnabled, lang])

  const stepIndex = steps.findIndex((s) => s.id === step)

  const dateStepReady = Boolean(date && partySize >= 2)
  const timeStepReady = Boolean(time) && availableHours.some((h) => h.hour === time)
  const riceStepReady =
    wantsRice === false ||
    Boolean(wantsRice === true && riceType && riceServings != null && riceServings >= 2 && riceServings <= partySize)
  const mobilityStepReady = hasMobilityIssues != null
  const detailsReady = Boolean(
    name.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      onlyDigits(countryCode) &&
      onlyDigits(phoneNational).length >= 6,
  )

  const goNext = () => {
    if (stepIndex < 0 || stepIndex + 1 >= steps.length) return
    setStep(steps[stepIndex + 1].id)
  }
  const goPrev = () => {
    if (stepIndex <= 0) return
    setStep(steps[stepIndex - 1].id)
  }

  // --- save ----------------------------------------------------------------
  const handleSubmit = async () => {
    if (!bookingId || !detailsReady) return
    const proof = readSelfServiceProof()
    if (!proof || proof.id !== bookingId) {
      setState('blocked')
      setMessage(
        text(
          'No se pudo verificar la reserva. Vuelve a reservas e inténtalo de nuevo.',
          'We could not verify the booking. Please go back to reservations and try again.',
        ),
      )
      return
    }
    setSaving(true)
    try {
      const res = await submitBookingModification({
        booking_id: bookingId,
        reservation_date: date,
        reservation_time: time,
        party_size: partySize,
        children: Math.min(children, Math.max(0, partySize - 1)),
        customer_name: name.trim(),
        contact_email: email.trim(),
        country_code: onlyDigits(countryCode),
        contact_phone: onlyDigits(phoneNational),
        high_chairs: Math.min(highChairs, partySize),
        baby_strollers: Math.min(babyStrollers, partySize),
        toggle_arroz: wantsRice === true,
        arroz_type: wantsRice === true ? riceType : '',
        arroz_servings: wantsRice === true && riceServings != null ? riceServings : 0,
        has_mobility_issues: mobilityEnabled ? hasMobilityIssues === true : undefined,
        mobility_people: hasMobilityIssues === true ? Math.min(Math.max(mobilityPeople, 1), partySize) : 0,
        verify_email: proof.email,
        verify_country_code: proof.countryCode,
        verify_phone: proof.phone,
      })
      if (res.success) {
        setState('success')
        setMessage(text('Hemos actualizado tu reserva.', 'We have updated your booking.'))
        return
      }
      setState('blocked')
      setMessage(res.message || text('No se pudo modificar la reserva.', 'The booking could not be modified.'))
    } catch {
      setState('error')
      setMessage(text('Error al modificar la reserva.', 'Could not modify the booking.'))
    } finally {
      setSaving(false)
    }
  }

  const shell = (children: any) => (
    <div class="page resvPage" data-testid="modificar-reserva-page">
      <section class="page-hero resvHero" data-testid="modificar-reserva-hero">
        <div class="container" data-testid="modificar-reserva-hero-container">
          <h1 class="page-title" data-testid="modificar-reserva-hero-title">{text('Modificar reserva', 'Modify booking')}</h1>
          <p class="page-subtitle" data-testid="modificar-reserva-hero-subtitle">
            {text('Revisa y actualiza los datos de tu reserva.', 'Review and update your booking details.')}
          </p>
        </div>
      </section>
      <section class="resvMain" data-testid="modificar-reserva-main">
        <div class="container" data-testid="modificar-reserva-main-container">{children}</div>
      </section>
    </div>
  )

  if (state === 'loading') {
    return shell(
      <div class="resvCard" data-testid="modificar-reserva-loading-card">
        <div class="resvCardSub" data-testid="modificar-reserva-loading-text">{text('Cargando tu reserva…', 'Loading your booking…')}</div>
      </div>,
    )
  }

  if (state === 'error' || state === 'blocked') {
    return shell(
      <div class="resvCard" data-testid={`modificar-reserva-${state}-card`}>
        <div class="resvNotice warn" data-testid={`modificar-reserva-${state}-message`}>{message}</div>
        <div class="resvActions" data-testid={`modificar-reserva-${state}-actions`}>
          <a class="btn" href="/reservas" data-testid={`modificar-reserva-${state}-back`}>{text('Volver a reservas', 'Back to reservations')}</a>
          <a class="btn primary" href="tel:638857294" data-testid={`modificar-reserva-${state}-call`}>{text('Llamar', 'Call')}</a>
        </div>
      </div>,
    )
  }

  if (state === 'success') {
    return shell(
      <div class="resvCard" data-testid="modificar-reserva-success-card">
        <div class="resvCardHead" data-testid="modificar-reserva-success-head">
          <div class="resvCardTitle" data-testid="modificar-reserva-success-title">{text('Reserva actualizada', 'Booking updated')}</div>
        </div>
        <div class="resvNotice" data-testid="modificar-reserva-success-message">{message}</div>
        <div class="resvActions" data-testid="modificar-reserva-success-actions">
          <a class="btn primary" href="/" data-testid="modificar-reserva-success-home">{text('Volver al inicio', 'Back to home')}</a>
        </div>
      </div>,
    )
  }

  const stepContent = (() => {
    if (step === 'date') {
      return (
        <div class="resvStep" data-testid="modificar-reserva-step-date">
          <div class="resvGrid2" data-testid="modificar-reserva-date-grid">
            <ReservationCalendar
              testId="modificar-reserva-calendar"
              title={text('Selecciona una fecha', 'Select a date')}
              selectedDate={date}
              todayISO={todayISO}
              viewMonth0={viewMonth0}
              viewYear={viewYear}
              onViewChange={(month0, year) => {
                setViewMonth0(month0)
                setViewYear(year)
              }}
              monthAvailability={monthAvailability}
              rules={calendarRules}
              onPickDate={(iso, inMonth) => {
                if (!inMonth || iso < todayISO) return
                setDate(iso)
              }}
              text={text}
              lang={lang}
            />

            <motion.div
              class="resvCard"
              data-testid="modificar-reserva-booking-card"
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
            >
              <div class="resvCardHead" data-testid="modificar-reserva-booking-card-head">
                <div class="resvCardTitle" data-testid="modificar-reserva-booking-card-title">{text('Tu reserva', 'Your reservation')}</div>
                <div class="resvCardSub" data-testid="modificar-reserva-booking-card-subtitle">{date}</div>
              </div>

              <div class="resvField" data-testid="modificar-reserva-party-field">
                <div class="resvLabel resvLabel--step1" data-testid="modificar-reserva-party-label">{text('Personas', 'Guests')}</div>
                <PopoverSelect
                  testId="modificar-reserva-party-select"
                  ariaLabel={text('Número de personas', 'Number of guests')}
                  value={String(partySize)}
                  placeholder={text('Selecciona', 'Select')}
                  options={peopleOptions}
                  onChange={(v) => {
                    const n = Number(v)
                    if (!Number.isFinite(n) || n < 2) return
                    setPartySize(n)
                    setChildren((c) => Math.min(c, Math.max(0, n - 1)))
                    setHighChairs((c) => Math.min(c, n))
                    setBabyStrollers((c) => Math.min(c, n))
                    setRiceServings((s) => (s != null && s > n ? null : s))
                  }}
                />
                {freeSeats != null ? (
                  <div class="resvHint" data-testid="modificar-reserva-party-hint">
                    {text('Quedan', 'Remaining')} {freeSeats} {text('plazas', 'seats')}
                  </div>
                ) : null}
              </div>

              <div class="resvActions" data-testid="modificar-reserva-date-actions">
                <button
                  type="button"
                  class="btn primary"
                  data-testid="modificar-reserva-date-next"
                  disabled={!dateStepReady}
                  onClick={goNext}
                >
                  {text('Siguiente', 'Next')}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )
    }

    if (step === 'time') {
      return (
        <div class="resvStep" data-testid="modificar-reserva-step-time">
          <div class="resvCard" data-testid="modificar-reserva-time-card">
            <div class="resvCardHead" data-testid="modificar-reserva-time-card-head">
              <div class="resvCardTitle" data-testid="modificar-reserva-time-card-title">{text('Elige la hora', 'Choose the time')}</div>
              <div class="resvCardSub" data-testid="modificar-reserva-time-card-subtitle">{date}</div>
            </div>

            <ReservationHourPicker
              testId="modificar-reserva"
              label={text('Horas disponibles', 'Available times')}
              hours={availableHours}
              value={time}
              onChange={setTime}
              emptyLabel={`${text('No hay horas disponibles para', 'No times available for')} ${partySize} ${text('personas', 'guests')}.`}
              text={text}
            />

            <div class="resvActions" data-testid="modificar-reserva-time-actions">
              {!dateLocked ? (
                <button type="button" class="btn" data-testid="modificar-reserva-time-back" onClick={goPrev}>
                  {text('Anterior', 'Back')}
                </button>
              ) : null}
              <button
                type="button"
                class="btn primary"
                data-testid="modificar-reserva-time-next"
                disabled={!timeStepReady}
                onClick={goNext}
              >
                {text('Siguiente', 'Next')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (step === 'rice') {
      return (
        <div class="resvStep" data-testid="modificar-reserva-step-rice">
          <div class="resvCard" data-testid="modificar-reserva-rice-card">
            <div class="resvCardHead" data-testid="modificar-reserva-rice-card-head">
              <div class="resvCardTitle" data-testid="modificar-reserva-rice-card-title">{text('Selección de arroz', 'Rice selection')}</div>
              <div class="resvCardSub" data-testid="modificar-reserva-rice-card-subtitle">
                {text('Los arroces solo podrán servirse con reserva previa.', 'Rice dishes are only available when ordered in advance.')}
              </div>
            </div>

            <ReservationChoice
              testId="modificar-reserva-rice"
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
              <div class="resvRiceGrid" data-testid="modificar-reserva-rice-grid">
                <div class="resvField" data-testid="modificar-reserva-rice-type-field">
                  <div class="resvLabel" data-testid="modificar-reserva-rice-type-label">{text('Tipo de arroz', 'Rice dish')}</div>
                  <PopoverSelect
                    testId="modificar-reserva-rice-type-select"
                    ariaLabel={text('Tipo de arroz', 'Rice dish')}
                    value={riceType ? riceType : null}
                    placeholder={text('Selecciona el tipo de arroz', 'Select a rice dish')}
                    options={riceTypeOptions}
                    searchable={riceTypeOptions.length > 8}
                    searchPlaceholder={text('Buscar arroz', 'Search rice dishes')}
                    onChange={(v) => setRiceType(v)}
                  />
                </div>
                <div class="resvField" data-testid="modificar-reserva-rice-servings-field">
                  <div class="resvLabel" data-testid="modificar-reserva-rice-servings-label">{text('Raciones', 'Servings')}</div>
                  <PopoverSelect
                    testId="modificar-reserva-rice-servings-select"
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

            <div class="resvActions" data-testid="modificar-reserva-rice-actions">
              <button type="button" class="btn" data-testid="modificar-reserva-rice-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              <button
                type="button"
                class="btn primary"
                data-testid="modificar-reserva-rice-next"
                disabled={!riceStepReady}
                onClick={goNext}
              >
                {text('Siguiente', 'Next')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (step === 'mobility') {
      const ps = partySize || 1
      return (
        <div class="resvStep" data-testid="modificar-reserva-step-mobility">
          <div class="resvCard" data-testid="modificar-reserva-mobility-card">
            <div class="resvCardHead" data-testid="modificar-reserva-mobility-card-head">
              <div class="resvCardTitle" data-testid="modificar-reserva-mobility-card-title">
                {text('¿Hay personas con problemas de movilidad?', 'Is anyone in your party mobility impaired?')}
              </div>
              <div class="resvCardSub" data-testid="modificar-reserva-mobility-card-subtitle">
                {text(
                  'Nos ayuda a ubicar mejor la reserva si el restaurante tiene una primera planta sin ascensor.',
                  'This helps us seat you better if the restaurant has a first floor with no lift.',
                )}
              </div>
            </div>

            <ReservationChoice
              testId="modificar-reserva-mobility"
              value={hasMobilityIssues}
              onChange={(next) => {
                setHasMobilityIssues(next)
                setMobilityPeople(next ? Math.min(Math.max(mobilityPeople || 1, 1), ps) : 0)
              }}
              yesLabel={text('Sí', 'Yes')}
              noLabel={text('No', 'No')}
            />

            {hasMobilityIssues === true ? (
              <div class="resvField" data-testid="modificar-reserva-mobility-people-field">
                <div class="resvLabel" data-testid="modificar-reserva-mobility-people-label">{text('¿Cuántas personas?', 'How many people?')}</div>
                <InlineCounter
                  testId="modificar-reserva-mobility-counter"
                  ariaLabel={text('Personas con problemas de movilidad', 'Mobility impaired guests')}
                  value={Math.min(Math.max(mobilityPeople || 1, 1), ps)}
                  min={1}
                  max={ps}
                  onChange={setMobilityPeople}
                />
              </div>
            ) : null}

            <div class="resvActions" data-testid="modificar-reserva-mobility-actions">
              <button type="button" class="btn" data-testid="modificar-reserva-mobility-back" onClick={goPrev}>
                {text('Anterior', 'Back')}
              </button>
              <button
                type="button"
                class="btn primary"
                data-testid="modificar-reserva-mobility-next"
                disabled={!mobilityStepReady}
                onClick={goNext}
              >
                {text('Siguiente', 'Next')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div class="resvStep" data-testid="modificar-reserva-step-details">
        <div class="resvCard" data-testid="modificar-reserva-details-card">
          <div class="resvCardHead" data-testid="modificar-reserva-details-card-head">
            <div class="resvCardTitle" data-testid="modificar-reserva-details-card-title">{text('Datos personales', 'Personal details')}</div>
            <div class="resvCardSub" data-testid="modificar-reserva-details-card-subtitle">
              {text('Revisa tus datos de contacto y los extras.', 'Review your contact details and extras.')}
            </div>
          </div>

          <div class="resvForm" data-testid="modificar-reserva-details-form">
            <div class="resvField" data-testid="modificar-reserva-name-field">
              <div class="resvLabel resvLabel--compact" data-testid="modificar-reserva-name-label">{text('Nombre y apellidos', 'Full name')}</div>
              <input
                class="resvInput"
                data-testid="modificar-reserva-name-input"
                type="text"
                value={name}
                autoComplete="name"
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="resvField" data-testid="modificar-reserva-email-field">
              <div class="resvLabel resvLabel--compact" data-testid="modificar-reserva-email-label">Email</div>
              <input
                class="resvInput"
                data-testid="modificar-reserva-email-input"
                type="email"
                value={email}
                autoComplete="email"
                onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="resvField" data-testid="modificar-reserva-phone-field">
              <div class="resvLabel" data-testid="modificar-reserva-phone-label">{text('Teléfono', 'Phone')}</div>
              <div class="resvPhoneRow" data-testid="modificar-reserva-phone-row">
                <PopoverSelect
                  testId="modificar-reserva-country-code-select"
                  ariaLabel={text('Prefijo', 'Country code')}
                  value={countryCode}
                  placeholder="+34"
                  options={countryOptions}
                  searchable
                  searchPlaceholder={text('Buscar país', 'Search countries')}
                  onChange={setCountryCode}
                />
                <input
                  class="resvInput"
                  data-testid="modificar-reserva-phone-input"
                  type="tel"
                  inputMode="numeric"
                  value={phoneNational}
                  autoComplete="tel-national"
                  onInput={(e) => setPhoneNational(onlyDigits((e.target as HTMLInputElement).value))}
                />
              </div>
            </div>

            <div class="resvField" data-testid="modificar-reserva-children-field">
              <div class="resvLabel resvLabel--compact" data-testid="modificar-reserva-children-label">{text('Niños', 'Children')}</div>
              <InlineCounter
                testId="modificar-reserva-children-counter"
                ariaLabel={text('Niños', 'Children')}
                value={children}
                min={0}
                max={Math.max(0, partySize - 1)}
                onChange={setChildren}
              />
            </div>

            <div class="resvField" data-testid="modificar-reserva-highchairs-field">
              <div class="resvLabel resvLabel--compact" data-testid="modificar-reserva-highchairs-label">{text('Tronas', 'High chairs')}</div>
              <InlineCounter
                testId="modificar-reserva-highchairs-counter"
                ariaLabel={text('Tronas', 'High chairs')}
                value={highChairs}
                min={0}
                max={partySize}
                onChange={setHighChairs}
              />
            </div>

            <div class="resvField" data-testid="modificar-reserva-strollers-field">
              <div class="resvLabel resvLabel--compact" data-testid="modificar-reserva-strollers-label">{text('Carritos', 'Strollers')}</div>
              <InlineCounter
                testId="modificar-reserva-strollers-counter"
                ariaLabel={text('Carritos', 'Strollers')}
                value={babyStrollers}
                min={0}
                max={partySize}
                onChange={setBabyStrollers}
              />
            </div>
          </div>

          <div class="resvActions" data-testid="modificar-reserva-details-actions">
            <button type="button" class="btn" data-testid="modificar-reserva-details-back" onClick={goPrev}>
              {text('Anterior', 'Back')}
            </button>
            <button
              type="button"
              class="btn primary"
              data-testid="modificar-reserva-save"
              disabled={!detailsReady || saving}
              onClick={() => void handleSubmit()}
            >
              {saving ? text('Guardando…', 'Saving…') : text('Guardar cambios', 'Save changes')}
            </button>
          </div>
        </div>
      </div>
    )
  })()

  return shell(
    <>
      <div class="resvSteps" aria-label={text('Pasos', 'Steps')} data-testid="modificar-reserva-stepper">
        {steps.map((s, idx) => {
          const isActive = s.id === step
          const isDone = idx < stepIndex
          return (
            <div class="resvStepSeg" key={s.id} data-testid={`modificar-reserva-stepper-segment-${s.id}`}>
              <div class="resvStepDot" data-step-id={s.id} data-testid={`modificar-reserva-stepper-dot-${s.id}`}>
                <div class={isActive ? 'resvDot active' : isDone ? 'resvDot done' : 'resvDot'} data-testid={`modificar-reserva-stepper-number-${s.id}`}>
                  {idx + 1}
                </div>
                <div class={isActive ? 'resvDotLabel active' : 'resvDotLabel'} data-testid={`modificar-reserva-stepper-label-${s.id}`}>{s.label}</div>
              </div>
              {idx < steps.length - 1 ? (
                <div class={isDone ? 'resvStepBar done' : 'resvStepBar'} aria-hidden="true" data-testid={`modificar-reserva-stepper-bar-${s.id}`} />
              ) : null}
            </div>
          )
        })}
      </div>

      <motion.div
        key={step}
        data-testid="modificar-reserva-step-content"
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      >
        {stepContent}
      </motion.div>
    </>,
  )
}

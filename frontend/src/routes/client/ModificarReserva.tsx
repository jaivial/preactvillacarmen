import { useEffect, useMemo, useState } from 'preact/hooks'
import { localized, useI18n } from '../../lib/i18n'
import { PopoverSelect } from '../../components/reservas/PopoverSelect'
import { InlineCounter } from '../../components/reservas/InlineCounter'
import { buildCountries, countrySelectOptions } from '../../components/reservas/countryOptions'
import { onlyDigits } from '../../lib/phone'
import {
  fetchModifyContext,
  readSelfServiceProof,
  submitBookingModification,
  type SelfServiceBooking,
} from '../../lib/reservationSelfService'

/**
 * /reservas/modificar?id=<bookingId>
 *
 * Self-service edit page reached from the duplicate-booking modal. It inherits
 * the existing booking into the same reservation components used by the wizard
 * (fields, counters, country picker) and records the change as a customer
 * modification on the backend.
 *
 * Coordination id: reservation_self_modification_v1
 */
type PageState = 'loading' | 'ready' | 'blocked' | 'error' | 'success'

// The backend refuses same-day and past edits, so the picker never offers them.
function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function ModificarReserva() {
  const { lang } = useI18n()
  const text = (es: string, en: string) => localized(es, en, lang)

  const bookingId = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('id')
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) && n > 0 ? n : null
  }, [])

  const [state, setState] = useState<PageState>('loading')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [dateLocked, setDateLocked] = useState(false)

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [children, setChildren] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('34')
  const [phoneNational, setPhoneNational] = useState('')
  const [highChairs, setHighChairs] = useState(0)
  const [babyStrollers, setBabyStrollers] = useState(0)

  const countryOptions = useMemo<ReturnType<typeof countrySelectOptions>>(
    () => countrySelectOptions(buildCountries(text)),
    [lang],
  )

  useEffect(() => {
    if (!bookingId) {
      setState('error')
      setMessage(text('ID de reserva inválido.', 'Invalid booking ID.'))
      return
    }
    // Ownership proof captured by the wizard. Without it we cannot prove the
    // guest owns the booking, so the page refuses to load its details.
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
        setTime(b.reservationTime)
        setPartySize(b.partySize)
        setChildren(b.children)
        setName(b.customerName)
        setEmail(b.contactEmail)
        setCountryCode(b.contactPhoneCountryCode || '34')
        setPhoneNational(b.contactPhone)
        setHighChairs(b.highChairs)
        setBabyStrollers(b.babyStrollers)
        setDateLocked(Boolean(res.date_locked))
        if (!res.modifiable) {
          setState('blocked')
          setMessage(res.message || text('No se puede modificar esta reserva online.', 'This booking cannot be modified online.'))
          return
        }
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

  const ready = Boolean(
    date &&
      time &&
      name.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      onlyDigits(countryCode) &&
      onlyDigits(phoneNational).length >= 6,
  )

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!bookingId || !ready) return
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
        // Proof is the original contact, never the edited values.
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

  return (
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
        <div class="container" data-testid="modificar-reserva-main-container">
          {state === 'loading' ? (
            <div class="resvCard" data-testid="modificar-reserva-loading-card">
              <div class="resvCardSub" data-testid="modificar-reserva-loading-text">
                {text('Cargando tu reserva…', 'Loading your booking…')}
              </div>
            </div>
          ) : null}

          {state === 'error' || state === 'blocked' ? (
            <div class="resvCard" data-testid={`modificar-reserva-${state}-card`}>
              <div class="resvNotice warn" data-testid={`modificar-reserva-${state}-message`}>{message}</div>
              <div class="resvActions" data-testid={`modificar-reserva-${state}-actions`}>
                <a class="btn" href="/reservas" data-testid={`modificar-reserva-${state}-back`}>
                  {text('Volver a reservas', 'Back to reservations')}
                </a>
                <a class="btn primary" href="tel:638857294" data-testid={`modificar-reserva-${state}-call`}>
                  {text('Llamar', 'Call')}
                </a>
              </div>
            </div>
          ) : null}

          {state === 'success' ? (
            <div class="resvCard" data-testid="modificar-reserva-success-card">
              <div class="resvCardHead" data-testid="modificar-reserva-success-head">
                <div class="resvCardTitle" data-testid="modificar-reserva-success-title">
                  {text('Reserva actualizada', 'Booking updated')}
                </div>
              </div>
              <div class="resvNotice" data-testid="modificar-reserva-success-message">{message}</div>
              <div class="resvActions" data-testid="modificar-reserva-success-actions">
                <a class="btn primary" href="/" data-testid="modificar-reserva-success-home">
                  {text('Volver al inicio', 'Back to home')}
                </a>
              </div>
            </div>
          ) : null}

          {state === 'ready' ? (
            <form class="resvCard" data-testid="modificar-reserva-form" onSubmit={handleSubmit}>
              <div class="resvCardHead" data-testid="modificar-reserva-form-head">
                <div class="resvCardTitle" data-testid="modificar-reserva-form-title">{text('Tu reserva', 'Your booking')}</div>
                <div class="resvCardSub" data-testid="modificar-reserva-form-subtitle">
                  {text('Modifica lo que necesites y guarda los cambios.', 'Change what you need and save.')}
                </div>
              </div>

              <div class="resvForm" data-testid="modificar-reserva-fields">
                <div class="resvField" data-testid="modificar-reserva-date-field">
                  <div class="resvLabel resvLabel--compact" data-testid="modificar-reserva-date-label">{text('Fecha', 'Date')}</div>
                  <input
                    class="resvInput"
                    data-testid="modificar-reserva-date-input"
                    type="date"
                    value={date}
                    min={tomorrowISO()}
                    disabled={dateLocked}
                    onInput={(e) => setDate((e.target as HTMLInputElement).value)}
                  />
                  {dateLocked ? (
                    <div class="resvHint" data-testid="modificar-reserva-date-locked-hint">
                      {text(
                        'Para cambiar de fecha una reserva de menu especial, contacta con el restaurante.',
                        'To move a special-menu booking to another date, please contact the restaurant.',
                      )}
                    </div>
                  ) : null}
                </div>

                <div class="resvField" data-testid="modificar-reserva-time-field">
                  <div class="resvLabel resvLabel--compact" data-testid="modificar-reserva-time-label">{text('Hora', 'Time')}</div>
                  <input
                    class="resvInput"
                    data-testid="modificar-reserva-time-input"
                    type="time"
                    value={time}
                    onInput={(e) => setTime((e.target as HTMLInputElement).value)}
                  />
                </div>

                <div class="resvField" data-testid="modificar-reserva-party-field">
                  <div class="resvLabel resvLabel--compact" data-testid="modificar-reserva-party-label">{text('Comensales', 'Guests')}</div>
                  <InlineCounter
                    testId="modificar-reserva-party-counter"
                    ariaLabel={text('Comensales', 'Guests')}
                    value={partySize}
                    min={2}
                    max={20}
                    onChange={(v) => {
                      setPartySize(v)
                      setChildren((c) => Math.min(c, Math.max(0, v - 1)))
                      setHighChairs((c) => Math.min(c, v))
                      setBabyStrollers((c) => Math.min(c, v))
                    }}
                  />
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

              <div class="resvActions" data-testid="modificar-reserva-actions">
                <a class="btn" href="/reservas" data-testid="modificar-reserva-back">
                  {text('Volver', 'Back')}
                </a>
                <button
                  type="submit"
                  class="btn primary"
                  data-testid="modificar-reserva-submit"
                  disabled={!ready || saving}
                >
                  {saving ? text('Guardando…', 'Saving…') : text('Guardar cambios', 'Save changes')}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  )
}

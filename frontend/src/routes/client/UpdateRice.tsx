import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { apiFetch } from '../../lib/api'
import { Counter } from '../../components/ui/Counter'
import { Selector } from '../../components/ui/Selector'

interface BookingData {
  id: number
  reservationDate: string
  reservationTime: string
  partySize: number
  customerName: string
  arrozType?: string
  arrozDisplay?: string
  isSameDay: boolean
  isConfirmed: boolean
}

export function UpdateRice() {
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [riceOptions, setRiceOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedRice, setSelectedRice] = useState('')
  const [servings, setServings] = useState(1)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const showForm = useMemo(() => {
    if (!booking) return false
    return !booking.arrozType || booking.arrozType === '' || booking.arrozType === 'null'
  }, [booking])

  const selectorOptions = useMemo(() =>
    riceOptions.map(opt => ({ value: opt, label: opt })),
    [riceOptions],
  )

  const maxServings = booking?.partySize || 1

  const handleServingsChange = useCallback((val: number) => setServings(val), [])
  const handleRiceChange = useCallback((val: string) => setSelectedRice(val), [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (!id) {
      setError('ID de reserva inválido.')
      setLoading(false)
      return
    }
    void (async () => {
      try {
        const res = await apiFetch(`/api/public/booking?id=${encodeURIComponent(id)}`)
        const data = await res.json()
        if (!data.success || !data.booking) {
          setError(data.message || 'Reserva no encontrada.')
          setLoading(false)
          return
        }
        setBooking(data.booking)
        setRiceOptions(data.riceOptions || [])
      } catch {
        setError('Error al cargar la reserva.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSubmit = async () => {
    if (!booking || !selectedRice || servings <= 0) return
    setSubmitting(true)
    setError('')
    try {
      const res = await apiFetch('/api/public/booking/rice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id, riceType: selectedRice, servings }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(data.message || '¡Arroz reservado correctamente!')
      } else {
        setError(data.message || 'Error al reservar el arroz.')
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div class="page bookingActionPage" data-ui="book-rice" data-state="loading">
        <div class="bookingActionCard" data-slot="card">
          <div class="bookingActionSpinner" data-slot="spinner" />
          <p data-slot="loading-text">Cargando reserva…</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div class="page bookingActionPage" data-ui="book-rice" data-state="error">
        <div class="bookingActionCard" data-slot="card">
          <div class="bookingActionAlert danger" data-slot="alert" data-role="error-message">{error}</div>
          <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
        </div>
      </div>
    )
  }

  if (booking?.isSameDay && !success) {
    return (
      <div class="page bookingActionPage" data-ui="book-rice" data-state="sameday-blocked">
        <div class="bookingActionCard" data-slot="card">
          <h1 class="bookingActionTitle" data-slot="title">No Disponible</h1>
          <p class="bookingActionSubtext" data-slot="subtitle">Reserva para hoy</p>
          <div class="bookingActionAlert warning" data-slot="alert" data-role="warning-message">Las reservas de arroz para el mismo día deben hacerse por teléfono.</div>
          <a href="tel:+34638857294" class="bookingActionBtn success" data-slot="call-btn" data-role="phone-action">Llamar ahora</a>
          <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div class="page bookingActionPage" data-ui="book-rice" data-state="success">
        <div class="bookingActionCard" data-slot="card">
          <h1 class="bookingActionTitle" data-slot="title">Arroz Reservado</h1>
          <p class="bookingActionSubtext" data-slot="subtitle">{success}</p>
          {booking && (
            <div class="bookingActionDetails" data-slot="details">
              <div class="bookingActionName" data-slot="customer-name">{booking.customerName}</div>
              <div class="bookingActionSub" data-slot="summary">{booking.reservationDate} · {booking.reservationTime} · {booking.partySize} personas</div>
            </div>
          )}
          <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
        </div>
      </div>
    )
  }

  if (!showForm && booking) {
    return (
      <div class="page bookingActionPage" data-ui="book-rice" data-state="already-has-rice">
        <div class="bookingActionCard" data-slot="card">
          <h1 class="bookingActionTitle" data-slot="title">Tu Arroz</h1>
          <p class="bookingActionSubtext" data-slot="subtitle">Arroz actual de tu reserva</p>
          <div class="bookingActionDetails" data-slot="details">
            <div class="bookingActionName" data-slot="customer-name">{booking.customerName}</div>
            <div class="bookingActionSub" data-slot="summary">{booking.reservationDate} · {booking.reservationTime}</div>
            <div class="bookingActionGrid" data-slot="info-grid">
              <div data-slot="field-rice"><span class="bookingActionLabel">Arroz</span><span class="bookingActionValue">{booking.arrozDisplay || 'No Arroz'}</span></div>
            </div>
          </div>
          <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
        </div>
      </div>
    )
  }

  return (
    <div class="page bookingActionPage" data-ui="book-rice" data-state="ready">
      <div class="bookingActionCard" data-slot="card">
        <h1 class="bookingActionTitle" data-slot="title">Reservar Arroz</h1>
        <p class="bookingActionSubtext" data-slot="subtitle">Seleccione el tipo de arroz para su reserva</p>

        {error && <div class="bookingActionAlert danger" data-slot="alert" data-role="error-message">{error}</div>}

        {booking && (
          <div class="bookingActionDetails" data-slot="details">
            <div class="bookingActionName" data-slot="customer-name">{booking.customerName}</div>
            <div class="bookingActionSub" data-slot="summary">{booking.reservationDate} · {booking.reservationTime} · {booking.partySize} personas</div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit() }} class="bookingActionForm" data-slot="form">
          <div class="bookingActionFormGroup" data-slot="rice-type-group">
            <Selector
              options={selectorOptions}
              value={selectedRice}
              onChange={handleRiceChange}
              placeholder="Seleccione una opción"
              label="Tipo de arroz"
              id="rice_type"
            />
          </div>
          <div class="bookingActionFormGroup" data-slot="servings-group">
            <Counter
              value={servings}
              min={1}
              max={maxServings}
              onChange={handleServingsChange}
              label={`Raciones (máximo ${maxServings})`}
            />
          </div>
          <button class="bookingActionBtn primary" data-slot="submit-btn" data-role="primary-action" type="submit" disabled={submitting || !selectedRice}>
            {submitting ? 'Reservando…' : 'Reservar Arroz'}
          </button>
        </form>
        <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver sin reservar</a>
      </div>
    </div>
  )
}

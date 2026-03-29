import { useEffect, useState } from 'preact/hooks'
import { apiFetch } from '../../lib/api'

interface BookingData {
  id: number
  reservationDate: string
  reservationTime: string
  partySize: number
  customerName: string
  arrozDisplay?: string
  status?: string
  isSameDay: boolean
  isConfirmed: boolean
}

export function ConfirmBooking() {
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      } catch {
        setError('Error al cargar la reserva.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleConfirm = async () => {
    if (!booking) return
    setConfirming(true)
    try {
      const res = await apiFetch('/api/public/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(data.message || '¡Reserva confirmada!')
        if (data.booking) setBooking(data.booking)
      } else if (data.alreadyConfirmed) {
        setSuccess(data.message || 'Esta reserva ya estaba confirmada.')
      } else {
        setError(data.message || 'Error al confirmar la reserva.')
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div class="page bookingActionPage" data-ui="confirm-reservation" data-state="loading">
        <div class="bookingActionCard" data-slot="card">
          <div class="bookingActionSpinner" data-slot="spinner" />
          <p data-slot="loading-text">Cargando reserva…</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div class="page bookingActionPage" data-ui="confirm-reservation" data-state="error">
        <div class="bookingActionCard" data-slot="card">
          <div class="bookingActionAlert danger" data-slot="alert" data-role="error-message">{error}</div>
          <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div class="page bookingActionPage" data-ui="confirm-reservation" data-state="success">
        <div class="bookingActionCard" data-slot="card">
          <h1 class="bookingActionTitle" data-slot="title">Reserva Confirmada</h1>
          <div class="bookingActionAlert success" data-slot="alert" data-role="success-message">{success}</div>
          {booking && (
            <div class="bookingActionDetails" data-slot="details">
              <div class="bookingActionName" data-slot="customer-name">{booking.customerName}</div>
              <div class="bookingActionGrid" data-slot="info-grid">
                <div data-slot="field-date"><span class="bookingActionLabel">Fecha</span><span class="bookingActionValue">{booking.reservationDate}</span></div>
                <div data-slot="field-time"><span class="bookingActionLabel">Hora</span><span class="bookingActionValue">{booking.reservationTime}</span></div>
                <div data-slot="field-party"><span class="bookingActionLabel">Personas</span><span class="bookingActionValue">{booking.partySize}</span></div>
                {booking.arrozDisplay && <div data-slot="field-rice"><span class="bookingActionLabel">Arroz</span><span class="bookingActionValue">{booking.arrozDisplay}</span></div>}
              </div>
            </div>
          )}
          <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
        </div>
      </div>
    )
  }

  return (
    <div class="page bookingActionPage" data-ui="confirm-reservation" data-state="ready">
      <div class="bookingActionCard" data-slot="card">
        <h1 class="bookingActionTitle" data-slot="title">Confirmar Reserva</h1>
        <p class="bookingActionSubtext" data-slot="subtitle">Revise los datos y confirme su asistencia</p>

        {error && <div class="bookingActionAlert danger" data-slot="alert" data-role="error-message">{error}</div>}

        {booking && (
          <div class="bookingActionDetails" data-slot="details">
            <div class="bookingActionName" data-slot="customer-name">{booking.customerName}</div>
            <div class="bookingActionGrid" data-slot="info-grid">
              <div data-slot="field-date"><span class="bookingActionLabel">Fecha</span><span class="bookingActionValue">{booking.reservationDate}</span></div>
              <div data-slot="field-time"><span class="bookingActionLabel">Hora</span><span class="bookingActionValue">{booking.reservationTime}</span></div>
              <div data-slot="field-party"><span class="bookingActionLabel">Personas</span><span class="bookingActionValue">{booking.partySize}</span></div>
              {booking.arrozDisplay && <div data-slot="field-rice"><span class="bookingActionLabel">Arroz</span><span class="bookingActionValue">{booking.arrozDisplay}</span></div>}
            </div>
          </div>
        )}

        {booking?.isConfirmed ? (
          <div class="bookingActionAlert success" data-slot="already-confirmed" data-role="info-message">Esta reserva ya está confirmada.</div>
        ) : (
          <button class="bookingActionBtn success" data-slot="confirm-btn" data-role="primary-action" onClick={() => void handleConfirm()} disabled={confirming}>
            {confirming ? 'Confirmando…' : 'Confirmar Reserva'}
          </button>
        )}
        <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
      </div>
    </div>
  )
}

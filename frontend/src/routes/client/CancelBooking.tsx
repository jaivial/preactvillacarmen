import { useEffect, useState } from 'preact/hooks'
import { apiFetch } from '../../lib/api'

interface BookingData {
  id: number
  reservationDate: string
  reservationTime: string
  partySize: number
  customerName: string
  isSameDay: boolean
  isConfirmed: boolean
}

export function CancelBooking() {
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
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

  const handleCancel = async () => {
    if (!booking) return
    setCancelling(true)
    setError('')
    try {
      const res = await apiFetch('/api/public/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(data.message || 'Reserva cancelada correctamente.')
      } else {
        setError(data.message || 'Error al cancelar la reserva.')
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div class="page bookingActionPage" data-ui="cancel-reservation" data-state="loading">
        <div class="bookingActionCard" data-slot="card">
          <div class="bookingActionSpinner" data-slot="spinner" />
          <p data-slot="loading-text">Cargando reserva…</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div class="page bookingActionPage" data-ui="cancel-reservation" data-state="error">
        <div class="bookingActionCard" data-slot="card">
          <div class="bookingActionAlert danger" data-slot="alert" data-role="error-message">{error}</div>
          <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
        </div>
      </div>
    )
  }

  if (booking?.isSameDay && !success) {
    return (
      <div class="page bookingActionPage" data-ui="cancel-reservation" data-state="sameday-blocked">
        <div class="bookingActionCard" data-slot="card">
          <h1 class="bookingActionTitle" data-slot="title">Cancelación No Disponible</h1>
          <p class="bookingActionSubtext" data-slot="subtitle">Reserva para hoy</p>
          <div class="bookingActionAlert warning" data-slot="alert" data-role="warning-message">Las reservas para el mismo día no se pueden cancelar online. Por favor, llame al restaurante.</div>
          {booking && (
            <div class="bookingActionDetails" data-slot="details">
              <div class="bookingActionName" data-slot="customer-name">{booking.customerName}</div>
              <div class="bookingActionGrid" data-slot="info-grid">
                <div data-slot="field-date"><span class="bookingActionLabel">Fecha</span><span class="bookingActionValue">{booking.reservationDate}</span></div>
                <div data-slot="field-time"><span class="bookingActionLabel">Hora</span><span class="bookingActionValue">{booking.reservationTime}</span></div>
                <div data-slot="field-party"><span class="bookingActionLabel">Personas</span><span class="bookingActionValue">{booking.partySize}</span></div>
              </div>
            </div>
          )}
          <a href="tel:+34638857294" class="bookingActionBtn success" data-slot="call-btn" data-role="phone-action">Llamar ahora</a>
          <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div class="page bookingActionPage" data-ui="cancel-reservation" data-state="success">
        <div class="bookingActionCard" data-slot="card">
          <h1 class="bookingActionTitle" data-slot="title">Reserva Cancelada</h1>
          <p class="bookingActionSubtext" data-slot="subtitle">Su reserva ha sido cancelada correctamente</p>
          <div class="bookingActionAlert success" data-slot="alert" data-role="success-message">{success}</div>
          {booking && (
            <div class="bookingActionDetails" data-slot="details">
              <div class="bookingActionName" data-slot="customer-name">{booking.customerName}</div>
              <div class="bookingActionGrid" data-slot="info-grid">
                <div data-slot="field-date"><span class="bookingActionLabel">Fecha</span><span class="bookingActionValue">{booking.reservationDate}</span></div>
                <div data-slot="field-time"><span class="bookingActionLabel">Hora</span><span class="bookingActionValue">{booking.reservationTime}</span></div>
                <div data-slot="field-party"><span class="bookingActionLabel">Personas</span><span class="bookingActionValue">{booking.partySize}</span></div>
              </div>
            </div>
          )}
          <a href="/" class="bookingActionBtn accent" data-slot="home-link" data-role="navigation">Volver al inicio</a>
        </div>
      </div>
    )
  }

  return (
    <div class="page bookingActionPage" data-ui="cancel-reservation" data-state="ready">
      <div class="bookingActionCard" data-slot="card">
        <h1 class="bookingActionTitle" data-slot="title">Cancelar Reserva</h1>
        <p class="bookingActionSubtext" data-slot="subtitle">Revise los detalles antes de confirmar</p>

        {error && <div class="bookingActionAlert danger" data-slot="alert" data-role="error-message">{error}</div>}

        {booking && (
          <div class="bookingActionDetails" data-slot="details">
            <div class="bookingActionName" data-slot="customer-name">{booking.customerName}</div>
            <div class="bookingActionGrid" data-slot="info-grid">
              <div data-slot="field-date"><span class="bookingActionLabel">Fecha</span><span class="bookingActionValue">{booking.reservationDate}</span></div>
              <div data-slot="field-time"><span class="bookingActionLabel">Hora</span><span class="bookingActionValue">{booking.reservationTime}</span></div>
              <div data-slot="field-party"><span class="bookingActionLabel">Personas</span><span class="bookingActionValue">{booking.partySize}</span></div>
            </div>
          </div>
        )}

        <button class="bookingActionBtn danger" data-slot="cancel-btn" data-role="primary-action" onClick={() => void handleCancel()} disabled={cancelling}>
          {cancelling ? 'Cancelando…' : 'Cancelar Reserva'}
        </button>
        <a href="/" class="bookingActionBtn accent" data-slot="back-link" data-role="navigation">Volver sin cancelar</a>
        <p class="bookingActionNote" data-slot="note" data-role="disclaimer">Esta acción no se puede deshacer. Se notificará al restaurante de la cancelación.</p>
      </div>
    </div>
  )
}

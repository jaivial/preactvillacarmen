import { useEffect, useState } from 'preact/hooks'
import { apiFetch } from '../../lib/api'

// Coordination id: stripe_prereserva_adelanto_v1 - landing of the Stripe (or
// demo) checkout. Completing is idempotent: it inserts the prereserva the first
// time and just reads it back afterwards (refresh, back button, webhook).
type SpecialMenuLine = { label: string; count: number; adelanto_per_unit: number }

type CheckoutView = {
  checkout_id: string
  status: string
  amount: number
  currency: string
  demo: boolean
  payment_ref: string
  receipt_url: string
  booking_id: number
  paid_at?: string
  error?: string
  reservation: { date: string; time: string; party_size: string; customer_name: string; contact_email: string }
  special?: { title?: string; menus?: SpecialMenuLine[] } | null
}

function euros(v: number) {
  return `${v.toFixed(2).replace('.', ',')} €`
}

function formatDay(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function PrereservaPagoCompletado() {
  const [view, setView] = useState<CheckoutView | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('checkout') || ''
    if (!/^pc_[a-f0-9]{32}$/.test(id)) {
      setError('Enlace de pago no válido.')
      setLoading(false)
      return
    }
    let tries = 0
    const run = async () => {
      try {
        const res = await apiFetch(`/api/bookings/checkout/${encodeURIComponent(id)}/complete`, { method: 'POST' })
        const data = (await res.json()) as { success: boolean; message?: string; checkout?: CheckoutView }
        if (data.checkout) setView(data.checkout)
        // Stripe may confirm a few seconds after the redirect: retry briefly.
        if (!data.success && data.checkout?.status === 'pending' && tries < 5) {
          tries += 1
          window.setTimeout(() => void run(), 2000)
          return
        }
        if (!data.success) setError(data.message || 'No se pudo completar la prereserva.')
        else console.log('[checkpoint] prereserva_payment_success_page', data.checkout?.booking_id)
      } catch {
        setError('No se pudo comprobar el pago. Recarga la página en unos segundos.')
      }
      setLoading(false)
    }
    void run()
  }, [])

  if (loading) {
    return (
      <div class="page bookingActionPage" data-testid="prereserva-pago-page" data-state="loading">
        <div class="bookingActionCard" data-testid="prereserva-pago-card-loading">
          <div class="bookingActionSpinner" data-testid="prereserva-pago-spinner" />
          <p data-testid="prereserva-pago-loading-text">Confirmando tu pago…</p>
        </div>
      </div>
    )
  }

  if (error || !view || view.status !== 'completed') {
    return (
      <div class="page bookingActionPage" data-testid="prereserva-pago-page" data-state="error">
        <div class="bookingActionCard" data-testid="prereserva-pago-card-error">
          <div class="bookingActionAlert danger" data-testid="prereserva-pago-error">{error || view?.error || 'El pago no se ha completado.'}</div>
          <a href="/reservas" class="bookingActionBtn accent" data-testid="prereserva-pago-back">Volver a reservas</a>
        </div>
      </div>
    )
  }

  const r = view.reservation
  const lines = (view.special?.menus || []).filter((m) => m.count > 0 && m.adelanto_per_unit > 0)
  return (
    <div class="page bookingActionPage" data-testid="prereserva-pago-page" data-state="success">
      <div class="bookingActionCard prereservaPagoCard" data-testid="prereserva-pago-card">
        <div class="bookingActionAlert success" data-testid="prereserva-pago-success">
          ¡Pago recibido! Tu prereserva está confirmada.
        </div>
        {view.demo ? (
          <p class="prereservaPagoDemo" data-testid="prereserva-pago-demo">Pago de demostración: no se ha cobrado nada.</p>
        ) : null}

        <h1 class="prereservaPagoTitle" data-testid="prereserva-pago-title">{view.special?.title || 'Prereserva'}</h1>
        <dl class="prereservaPagoList" data-testid="prereserva-pago-details">
          <dt data-testid="prereserva-pago-label-number">Nº de prereserva</dt>
          <dd data-testid="prereserva-pago-value-number">{view.booking_id}</dd>
          <dt data-testid="prereserva-pago-label-name">Nombre</dt>
          <dd data-testid="prereserva-pago-value-name">{r.customer_name}</dd>
          <dt data-testid="prereserva-pago-label-date">Fecha</dt>
          <dd data-testid="prereserva-pago-value-date">{formatDay(r.date)}</dd>
          <dt data-testid="prereserva-pago-label-time">Hora</dt>
          <dd data-testid="prereserva-pago-value-time">{r.time}</dd>
          <dt data-testid="prereserva-pago-label-guests">Comensales</dt>
          <dd data-testid="prereserva-pago-value-guests">{r.party_size}</dd>
          <dt data-testid="prereserva-pago-label-email">Email</dt>
          <dd data-testid="prereserva-pago-value-email">{r.contact_email}</dd>
        </dl>

        <h2 class="prereservaPagoSubtitle" data-testid="prereserva-pago-payment-title">Pago del adelanto</h2>
        <ul class="prereservaPagoLines" data-testid="prereserva-pago-lines">
          {lines.map((m, i) => (
            <li key={i} data-testid={`prereserva-pago-line-${i}`}>
              <span data-testid={`prereserva-pago-line-label-${i}`}>{m.label} × {m.count}</span>
              <span data-testid={`prereserva-pago-line-amount-${i}`}>{euros(m.adelanto_per_unit * m.count)}</span>
            </li>
          ))}
          <li class="prereservaPagoTotal" data-testid="prereserva-pago-line-total">
            <span data-testid="prereserva-pago-total-label">Total pagado</span>
            <span data-testid="prereserva-pago-total-value">{euros(view.amount)}</span>
          </li>
        </ul>
        <p class="prereservaPagoRef" data-testid="prereserva-pago-ref">Referencia de pago: {view.payment_ref || view.checkout_id}</p>

        {view.receipt_url ? (
          <a class="bookingActionBtn accent" href={view.receipt_url} target="_blank" rel="noreferrer" download data-testid="prereserva-pago-receipt">
            Descargar comprobante
          </a>
        ) : (
          <p class="prereservaPagoRef" data-testid="prereserva-pago-receipt-email">Te hemos enviado el comprobante por email.</p>
        )}
        <a href="/" class="bookingActionBtn" data-testid="prereserva-pago-home">Volver al inicio</a>
      </div>
    </div>
  )
}

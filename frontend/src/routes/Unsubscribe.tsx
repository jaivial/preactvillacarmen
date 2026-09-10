import { useEffect, useState } from 'preact/hooks'
import { apiFetch } from '../lib/api'

// camp-unsub: public self-service unsubscribe landing (opened from email/WhatsApp campaigns).
const REASONS = [
  { key: 'demasiados_emails', label: 'Recibo demasiados emails' },
  { key: 'no_relevante', label: 'El contenido no me interesa' },
  { key: 'nunca_me_suscribi', label: 'No recuerdo haberme suscrito' },
  { key: 'duplicado', label: 'Recibo mensajes duplicados' },
  { key: 'otro', label: 'Otro motivo' },
] as const

const FALLBACK_NAME = 'nuestro restaurante'
const OPTION_STYLE = 'display:flex;gap:10px;align-items:flex-start;text-align:left;font-size:14px;padding:6px 0;cursor:pointer'

export function Unsubscribe() {
  const [query] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const channel = params.get('c')
    return {
      bookingId: params.get('b') || '',
      channel: channel === 'email' || channel === 'whatsapp' ? channel : 'all',
      // Opaque target token: recipients without a booking row (test sends,
      // manual audiences) still carry their contact in the opt-out link.
      target: params.get('t') || '',
    }
  })
  const [restaurantName, setRestaurantName] = useState('')
  const [loading, setLoading] = useState(true)
  const [already, setAlready] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const params = `b=${encodeURIComponent(query.bookingId)}&c=${encodeURIComponent(query.channel)}`
        const token = query.target ? `&t=${encodeURIComponent(query.target)}` : ''
        const res = await apiFetch(`/api/unsubscribe/context?${params}${token}`)
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; restaurant_name?: string; already?: boolean; message?: string }
          | null
        if (data?.success && data.restaurant_name) setRestaurantName(data.restaurant_name)
        else setRestaurantName(FALLBACK_NAME)
        if (data?.already) setAlready(true)
      } catch {
        // Never block the unsubscribe: fall back to a generic restaurant name.
        setRestaurantName(FALLBACK_NAME)
      } finally {
        setLoading(false)
      }
    })()
  }, [query.bookingId, query.channel, query.target])

  const confirm = async () => {
    setSending(true)
    setError('')
    try {
      const bookingId = Number(query.bookingId)
      const res = await apiFetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: Number.isFinite(bookingId) ? bookingId : 0,
          channel: query.channel,
          reason,
          target: query.target,
        }),
      })
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null
      if (res.ok && data?.success) setDone(true)
      else setError(data?.message || 'No se pudo confirmar la baja. Intentalo de nuevo.')
    } catch {
      setError('No se pudo confirmar la baja. Intentalo de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      class="page bookingActionPage"
      data-testid="unsubscribe-page"
      data-coord-id="camp-unsub"
      data-channel={query.channel}
      data-state={done ? 'success' : already ? 'already' : loading ? 'loading' : 'ready'}
    >
      <div class="bookingActionCard" data-testid="unsubscribe-card">
        <h1 class="bookingActionTitle" data-testid="unsubscribe-title">
          Darse de baja de los emails comerciales de {restaurantName || '\u2026'}
        </h1>
        <p class="bookingActionSubtext" data-testid="unsubscribe-subtitle">
          {loading ? 'Cargando\u2026' : 'Confirma y dejaremos de enviarte comunicaciones comerciales.'}
        </p>

        {error ? (
          <div class="bookingActionAlert danger" role="alert" data-testid="unsubscribe-error">
            {error}
          </div>
        ) : null}

        {done ? (
          <div class="bookingActionAlert success" role="status" data-testid="unsubscribe-success">
            Te has dado de baja correctamente
          </div>
        ) : null}

        {already && !done ? (
          <div class="bookingActionAlert success" role="status" data-testid="unsubscribe-already">
            Ya estabas dado de baja de estas comunicaciones.
          </div>
        ) : null}

        {!done && !already ? (
          <div data-testid="unsubscribe-form">
            <div class="bookingActionDetails" role="radiogroup" aria-label="Motivo de la baja" data-testid="unsubscribe-reason-list">
              {REASONS.map((item) => (
                <label key={item.key} style={OPTION_STYLE}>
                  <input
                    type="radio"
                    name="unsubscribe-reason"
                    value={item.key}
                    checked={reason === item.key}
                    onChange={() => setReason(item.key)}
                    data-testid={`unsubscribe-reason-${item.key}`}
                  />
                  <span data-testid={`unsubscribe-reason-label-${item.key}`}>{item.label}</span>
                </label>
              ))}
            </div>
            <button class="bookingActionBtn primary" data-testid="unsubscribe-confirm-btn" onClick={() => void confirm()} disabled={sending}>
              {sending ? 'Confirmando\u2026' : 'Confirmar baja'}
            </button>
          </div>
        ) : null}

        <a href="/" class="bookingActionBtn accent" data-testid="unsubscribe-home-link">
          Volver al inicio
        </a>
      </div>
    </div>
  )
}

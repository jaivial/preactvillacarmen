import { useEffect } from 'preact/hooks'
import { localized, useI18n } from '../../lib/i18n'

/**
 * Shared reservation modal shell: dialog + backdrop + action row, with Esc and
 * backdrop close. Extracted from Reservas so the booking wizard and the
 * self-service modify flow render the exact same chrome.
 *
 * Coordination id: reservation_self_modification_v1
 */
export function Modal(props: {
  open: boolean
  title: string
  children: any
  onClose: () => void
  primaryHref?: string
  primaryLabel?: string
  secondaryLabel?: string
  testId: string
}) {
  const tid = props.testId
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
    <div class="resvModal" role="dialog" aria-modal="true" aria-label={props.title} data-testid={tid}>
      <div class="resvModal__backdrop" onClick={props.onClose} data-testid={`${tid}-backdrop`} />
      <div class="resvModal__card" onClick={(e) => e.stopPropagation()} data-testid={`${tid}-card`}>
        <div class="resvModal__title" data-testid={`${tid}-title`}>{props.title}</div>
        <div class="resvModal__body" data-testid={`${tid}-body`}>{props.children}</div>
        <div class="resvModal__actions" data-testid={`${tid}-actions`}>
          <button type="button" class="btn" onClick={props.onClose} data-testid={`${tid}-close`}>
            {props.secondaryLabel || localized('Cerrar', 'Close', lang)}
          </button>
          {props.primaryHref ? (
            <a class="btn primary" href={props.primaryHref} data-testid={`${tid}-primary`}>
              {props.primaryLabel || localized('Continuar', 'Continue', lang)}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

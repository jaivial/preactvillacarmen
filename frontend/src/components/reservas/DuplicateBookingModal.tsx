import { CalendarDays, Clock, User, Users } from 'lucide-react'
import { Modal } from './Modal'
import { localized, useI18n } from '../../lib/i18n'
import type { DuplicateCheckResponse } from '../../lib/reservationSelfService'

/**
 * Shown on the personal-details step when the guest's email / phone already
 * match a live booking for the same day. Offers the "modify instead of
 * rebook" path when the backend marks the booking modifiable.
 *
 * The booking summary is a "receipt" surface: one row per datum, a leading
 * outline icon so each row is scannable before it is read, and the date as the
 * hero line so the guest recognises the booking at a glance. Icons stay on
 * one stroke weight (1.5px, matching the regular-weight labels) and inherit
 * their colour from CSS.
 *
 * Coordination id: reservation_self_modification_v1
 */
export function DuplicateBookingModal(props: {
  open: boolean
  response: DuplicateCheckResponse | null
  onClose: () => void
}) {
  const { lang } = useI18n()
  const text = (es: string, en: string) => localized(es, en, lang)
  const booking = props.response?.booking
  const modifyUrl = props.response?.modifiable ? props.response?.modifyUrl : undefined
  const notifyText =
    props.response?.message ||
    text(
      'Escríbenos o llámanos y lo ajustamos al momento.',
      'Message or call us and we will adjust it right away.',
    )

  const tid = 'reservas-duplicate-modal'

  return (
    <Modal
      open={props.open}
      title={text('Ya tenemos una reserva tuya', 'We already have a booking for you')}
      onClose={props.onClose}
      testId={tid}
      primaryHref={modifyUrl}
      primaryLabel={text('Modificar mi reserva', 'Modify my booking')}
      secondaryLabel={modifyUrl ? text('Cambiar mis datos', 'Change my details') : text('Cerrar', 'Close')}
    >
      <div class="resvDuplicateModal" data-testid="reservas-duplicate-modal-content">
        <p class="resvDuplicateModal__lead" data-testid="reservas-duplicate-modal-lead">
          {modifyUrl
            ? text(
                'Para esta fecha ya existe una reserva con tus datos de contacto. Puedes modificarla en lugar de crear una nueva.',
                'There is already a booking with your contact details for this date. You can modify it instead of creating a new one.',
              )
            : notifyText}
        </p>

        {booking ? (
          <div class="resvDuplicateModal__details" data-testid="reservas-duplicate-modal-details">
            <div
              class="resvDuplicateModal__row resvDuplicateModal__row--hero"
              data-testid="reservas-duplicate-modal-detail-date"
            >
              <span class="resvDuplicateModal__icon" aria-hidden="true" data-testid="reservas-duplicate-modal-detail-date-icon">
                <CalendarDays size={16} strokeWidth={1.5} />
              </span>
              <span class="resvDuplicateModal__label" data-testid="reservas-duplicate-modal-detail-date-label">
                {text('Fecha', 'Date')}
              </span>
              <span class="resvDuplicateModal__value" data-testid="reservas-duplicate-modal-detail-date-value">
                {booking.reservationDate}
              </span>
            </div>

            <div class="resvDuplicateModal__row" data-testid="reservas-duplicate-modal-detail-time">
              <span class="resvDuplicateModal__icon" aria-hidden="true" data-testid="reservas-duplicate-modal-detail-time-icon">
                <Clock size={16} strokeWidth={1.5} />
              </span>
              <span class="resvDuplicateModal__label" data-testid="reservas-duplicate-modal-detail-time-label">
                {text('Hora', 'Time')}
              </span>
              <span class="resvDuplicateModal__value" data-testid="reservas-duplicate-modal-detail-time-value">
                {booking.reservationTime}
              </span>
            </div>

            <div class="resvDuplicateModal__row" data-testid="reservas-duplicate-modal-detail-party">
              <span class="resvDuplicateModal__icon" aria-hidden="true" data-testid="reservas-duplicate-modal-detail-party-icon">
                <Users size={16} strokeWidth={1.5} />
              </span>
              <span class="resvDuplicateModal__label" data-testid="reservas-duplicate-modal-detail-party-label">
                {text('Comensales', 'Guests')}
              </span>
              <span class="resvDuplicateModal__value" data-testid="reservas-duplicate-modal-detail-party-value">
                {booking.partySize}
              </span>
            </div>

            <div class="resvDuplicateModal__row" data-testid="reservas-duplicate-modal-detail-name">
              <span class="resvDuplicateModal__icon" aria-hidden="true" data-testid="reservas-duplicate-modal-detail-name-icon">
                <User size={16} strokeWidth={1.5} />
              </span>
              <span class="resvDuplicateModal__label" data-testid="reservas-duplicate-modal-detail-name-label">
                {text('A nombre de', 'Booked under')}
              </span>
              <span class="resvDuplicateModal__value" data-testid="reservas-duplicate-modal-detail-name-value">
                {booking.customerName}
              </span>
            </div>
          </div>
        ) : null}

        {!modifyUrl ? (
          <p class="resvDuplicateModal__note" data-testid="reservas-duplicate-modal-note">
            {text(
              'Si no reconoces esta reserva, contacta con el restaurante antes de continuar.',
              'If you do not recognise this booking, please contact the restaurant before continuing.',
            )}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

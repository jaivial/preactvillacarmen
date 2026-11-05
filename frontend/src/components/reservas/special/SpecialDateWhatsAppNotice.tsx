import { useI18n } from '../../../lib/i18n'

/**
 * Notice shown instead of the time / party selectors on a special date that is
 * booked only through the restaurant's WhatsApp.
 *
 * Coordination id: special_date_whatsapp_only_v1
 * (backoffice switch special_dates.whatsapp_only -> public special-dates
 * whatsapp_only + whatsapp_phone -> this notice; wa.me clicks are tracked as
 * whatsapp_click by lib/analytics).
 */
export function SpecialDateWhatsAppNotice({ title, dateLabel, phone }: { title: string; dateLabel: string; phone: string }) {
  const { lang } = useI18n()
  const en = lang === 'en'
  const digits = phone.replace(/\D/g, '')
  const display = digits.startsWith('34') && digits.length === 11 ? `${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}` : `+${digits}`
  const message = en ? `Hello, I would like to book for ${title} (${dateLabel}).` : `Hola, me gustaría reservar para ${title} (${dateLabel}).`
  return (
    <div class="resvNotice warn resvWhatsAppOnly" role="note" data-testid="reservas-whatsapp-only-notice">
      <p class="resvWhatsAppOnlyText" data-testid="reservas-whatsapp-only-text">
        {en
          ? `Bookings for ${title} can only be made through our WhatsApp. Online booking and pre-booking are not available for this date.`
          : `Las reservas para ${title} se hacen únicamente por nuestro WhatsApp. Para esta fecha no se puede reservar ni prereservar desde la web.`}
      </p>
      {digits ? (
        <a
          class="btn primary resvWhatsAppOnlyBtn"
          href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          data-testid="reservas-whatsapp-only-link"
        >
          {en ? `Book on WhatsApp (${display})` : `Reservar por WhatsApp (${display})`}
        </a>
      ) : null}
    </div>
  )
}

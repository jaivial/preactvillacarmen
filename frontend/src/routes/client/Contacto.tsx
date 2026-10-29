import { motion } from 'motion/react'
import { Link } from 'wouter-preact'
import { useI18n } from '../../lib/i18n'
import { OPENING_HOURS, RESTAURANT } from '../../lib/restaurant'

export function Contacto() {
  const { lang, t } = useI18n()

  const hours = OPENING_HOURS.flatMap((entry) => entry.days.map((day) => `${day}: ${entry[lang].split(': ')[1]}`))

  return (
    <div class="page">
      <section class="page-hero">
        <div class="container">
          <motion.h1
            className="page-title"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {t('contact.title')}
          </motion.h1>
          <p class="page-subtitle">{t('contact.subtitle')}</p>
        </div>
      </section>

      <section class="section">
        <div class="container contact-grid">
          <div class="contact-card">
            <h2 class="contact-title">{t('contact.address')}</h2>
            <p class="contact-text">
              {RESTAURANT.street}
              <br />
              {RESTAURANT.postalCode} {RESTAURANT.locality}, {RESTAURANT.region}
            </p>

            <div class="contact-actions">
              <a
                class="btn primary"
                href={RESTAURANT.directions}
                target="_blank"
                rel="noreferrer"
              >
                {t('contact.directions')}
              </a>
              <a class="btn" href="https://wa.me/34638857294" target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              <a class="btn" href={`tel:${RESTAURANT.phone}`} data-testid="contact-phone-link">{RESTAURANT.phone}</a>
              <Link className="btn" href="/reservas" data-testid="contact-booking-link">{t('nav.reserve')}</Link>
            </div>

            <h2 class="contact-title" style={{ marginTop: '26px' }}>
              {t('contact.hours')}
            </h2>
            <div class="hours">
              {hours.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div class="contact-map">
            <h2 class="sr-only">{lang === 'es' ? 'Cómo llegar a Alquería Villa Carmen' : 'How to get to Alquería Villa Carmen'}</h2>
            <iframe
              title="Mapa Alquería Villa Carmen"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3082.9041110667404!2d-0.41829958463462646!3d39.4036753794957!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd604fed36fb5283%3A0xebbb1fe4b41e6e15!2sRestaurante%20Alquer%C3%ADa%20Villa%20Carmen!5e0!3m2!1ses!2ses!4v1681057872724!5m2!1ses!2ses"
              style="border:0;"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <section class="section container contact-visit" aria-label={lang === 'es' ? 'Información para tu visita' : 'Plan your visit'}>
        <h2>{lang === 'es' ? 'Prepara tu llegada' : 'Plan your journey'}</h2>
        <div class="contact-visit-grid">
          <article><h3>{lang === 'es' ? 'Acceso y ruta' : 'Access and directions'}</h3><p>{lang === 'es' ? `El destino es ${RESTAURANT.street}, ${RESTAURANT.postalCode} ${RESTAURANT.locality}. Abre la ruta para elegir el acceso en coche, a pie o en transporte público desde tu punto de partida; así evitas confundir la entrada con otra dirección de Catarroja.` : `The destination is ${RESTAURANT.street}, ${RESTAURANT.postalCode} ${RESTAURANT.locality}. Open the route to choose directions by car, on foot or by public transport from your starting point, so you do not confuse our entrance with another address in Catarroja.`}</p></article>
          <article><h3>{lang === 'es' ? 'Aparcamiento' : 'Parking'}</h3><p>{lang === 'es' ? 'El restaurante dispone de aparcamiento junto al establecimiento. Si necesitas una plaza adaptada o vienes en un vehículo de gran tamaño, consúltanos antes de la visita para confirmar el acceso.' : 'The restaurant has parking next to the premises. If you need an accessible space or are arriving in a large vehicle, ask us before your visit so we can confirm access.'}</p></article>
          <article><h3>{lang === 'es' ? 'Transporte y horarios especiales' : 'Transport and special hours'}</h3><p>{lang === 'es' ? 'Para venir en transporte público, comprueba en la ruta la línea, la parada y el horario actualizados desde tu origen. En festivos y celebraciones especiales el horario puede variar: confírmalo al reservar o por teléfono o WhatsApp antes de desplazarte.' : 'For public transport, check the route for current services, stops and timetables from your starting point. Hours can vary on public holidays and special celebrations: confirm when booking or by phone or WhatsApp before travelling.'}</p></article>
        </div>
        <div class="contact-nearby" data-testid="contact-nearby-towns" data-coordination-id="contact_nearby_towns_v1">
          <h3 data-testid="contact-nearby-title">{lang === 'es' ? 'Cerca de Albal, Massanassa y toda l\'Horta Sud' : 'Close to Albal, Massanassa and l\'Horta Sud'}</h3>
          <p data-testid="contact-nearby-text">{lang === 'es'
            ? 'Estamos en el límite entre Catarroja y Albal: a menos de 1 km de Albal y a unos 2 km de Massanassa y Beniparrell. Benetússer, Alfafar y Sedaví quedan a unos 3–4 km, Silla a unos 5 km y el centro de Valencia a unos 8 km en línea recta, así que es fácil venir a comer desde cualquier pueblo de l\'Horta Sud. El Palmar y el parque natural de la Albufera están a unos 7 km.'
            : 'We sit on the border between Catarroja and Albal: less than 1 km from Albal and about 2 km from Massanassa and Beniparrell. Benetússer, Alfafar and Sedaví are about 3–4 km away, Silla about 5 km and Valencia city centre about 8 km as the crow flies, so it is an easy lunch trip from anywhere in l\'Horta Sud. El Palmar and the Albufera natural park are about 7 km away.'}</p>
        </div>
        <p>{lang === 'es' ? 'También puedes escribirnos a ' : 'You can also email us at '}<a href={`mailto:${RESTAURANT.email}`}>{RESTAURANT.email}</a>.</p>
      </section>
    </div>
  )
}

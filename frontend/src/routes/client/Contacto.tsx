import { motion } from 'motion/react'
import { useI18n } from '../../lib/i18n'

export function Contacto() {
  const { lang, t } = useI18n()

  const hours =
    lang === 'en'
      ? [
          'Mon: Closed',
          'Tue: Closed',
          'Wed: Closed',
          'Thu: 13:30-17:00',
          'Fri: 13:30-17:30',
          'Sat: 13:30-18:00',
          'Sun: 13:30-18:00',
        ]
      : [
          'lun: Cerrado',
          'mar: Cerrado',
          'mi\u00e9: Cerrado',
          'jue: 13:30-17:00',
          'vie: 13:30-17:30',
          's\u00e1b: 13:30-18:00',
          'dom: 13:30-18:00',
        ]

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
              C/ Sequia de Rascanya, 2
              <br />
              46470 Catarroja, Valencia
            </p>

            <div class="contact-actions">
              <a
                class="btn primary"
                href="https://www.google.com/maps/dir//Alquer%C3%ADa+Villa+Carmen/data=!4m8!4m7!1m0!1m5!1m1!1s0xd604fed36fb5283:0xebbb1fe4b41e6e15!2m2!1d-0.41609809999999997!2d39.403670999999996"
                target="_blank"
                rel="noreferrer"
              >
                {t('contact.directions')}
              </a>
              <a class="btn" href="https://wa.me/34638857294" target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </div>

            <h2 class="contact-title" style={{ marginTop: '26px' }}>
              {t('contact.hours')}
            </h2>
            <div class="hours">
              {hours.map((line) => (
                <p>{line}</p>
              ))}
            </div>
          </div>

          <div class="contact-map">
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
    </div>
  )
}

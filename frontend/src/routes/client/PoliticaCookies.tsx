import { Link } from 'wouter-preact'
import { useI18n } from '../../lib/i18n'
import { openCookieConsent } from '../../lib/consent'
import { RESTAURANT } from '../../lib/restaurant'

// Coordination id: cookie_policy_page_v1 - keep this list in sync with what the site stores (cookie_consent_v1).
type StorageRow = { name: string; provider: string; purpose: [string, string]; duration: [string, string]; type: [string, string] }

const ROWS: StorageRow[] = [
  { name: '_ga', provider: 'Google Analytics', purpose: ['Distingue visitantes de forma anónima para obtener estadísticas de uso.', 'Distinguishes visitors anonymously to produce usage statistics.'], duration: ['2 años', '2 years'], type: ['Analítica (requiere consentimiento)', 'Analytics (requires consent)'] },
  { name: '_ga_0B9N606V7M', provider: 'Google Analytics', purpose: ['Mantiene el estado de la sesión de Google Analytics 4.', 'Keeps the Google Analytics 4 session state.'], duration: ['2 años', '2 years'], type: ['Analítica (requiere consentimiento)', 'Analytics (requires consent)'] },
  { name: 'vc_cookie_consent', provider: 'Alquería Villa Carmen', purpose: ['Recuerda si has aceptado o rechazado las cookies analíticas.', 'Remembers whether you accepted or rejected analytics cookies.'], duration: ['Persistente (almacenamiento local)', 'Persistent (local storage)'], type: ['Técnica', 'Technical'] },
  { name: 'villacarmen_menu_pick_v1', provider: 'Alquería Villa Carmen', purpose: ['Guarda los platos que marcas en la carta para consultarlos después.', 'Stores the dishes you mark on the menu so you can review them later.'], duration: ['Persistente (almacenamiento local)', 'Persistent (local storage)'], type: ['Técnica / preferencias', 'Technical / preferences'] },
  { name: 'vc_seen_ad_ids', provider: 'Alquería Villa Carmen', purpose: ['Evita mostrarte el mismo aviso más de una vez por visita.', 'Avoids showing you the same notice more than once per visit.'], duration: ['Sesión', 'Session'], type: ['Técnica', 'Technical'] },
  { name: 'villacarmen_reserva_self_service_proof', provider: 'Alquería Villa Carmen', purpose: ['Permite gestionar tu reserva de forma segura sin exponer datos en la URL.', 'Lets you manage your booking securely without exposing data in the URL.'], duration: ['Sesión', 'Session'], type: ['Técnica', 'Technical'] },
]

export function PoliticaCookies() {
  const { lang } = useI18n()
  const es = lang !== 'en'
  const i = es ? 0 : 1
  return (
    <div class="page legalPage" data-testid="cookie-policy-page">
      <div class="containeravisolegal" data-testid="cookie-policy-container">
        <div class="headeravisolegal" data-testid="cookie-policy-header">
          <p class="legal-wordmark">ALQUERIA VILLACARMEN</p>
          <p>{RESTAURANT.street}, {RESTAURANT.postalCode} {RESTAURANT.locality}, {RESTAURANT.region}</p>
        </div>
        <h1 data-testid="cookie-policy-title">{es ? 'Política de cookies' : 'Cookie policy'}</h1>
        <div class="wrapperavisolegal" data-testid="cookie-policy-content">
          <h2>{es ? '¿Qué son las cookies?' : 'What are cookies?'}</h2>
          <p>{es
            ? 'Las cookies y tecnologías similares (como el almacenamiento local del navegador) son pequeños archivos o datos que un sitio web guarda en tu dispositivo para que funcione correctamente, recordar tus preferencias o medir cómo se utiliza.'
            : 'Cookies and similar technologies (such as the browser\'s local storage) are small files or data a website saves on your device so it works properly, remembers your preferences or measures how it is used.'}</p>

          <h2>{es ? 'Responsable' : 'Data controller'}</h2>
          <p>{es
            ? `${RESTAURANT.name}, ${RESTAURANT.street}, ${RESTAURANT.postalCode} ${RESTAURANT.locality} (${RESTAURANT.region}). Contacto: ${RESTAURANT.email} · ${RESTAURANT.phone}.`
            : `${RESTAURANT.name}, ${RESTAURANT.street}, ${RESTAURANT.postalCode} ${RESTAURANT.locality} (${RESTAURANT.region}). Contact: ${RESTAURANT.email} · ${RESTAURANT.phone}.`}</p>

          <h2>{es ? 'Tipos de cookies que utilizamos' : 'Types of cookies we use'}</h2>
          <ul>
            <li><strong>{es ? 'Técnicas:' : 'Technical:'}</strong> {es ? 'imprescindibles para que la web funcione (reservas, carta, tu elección de cookies). No requieren consentimiento.' : 'essential for the website to work (bookings, menu, your cookie choice). They do not require consent.'}</li>
            <li><strong>{es ? 'Analíticas:' : 'Analytics:'}</strong> {es ? 'Google Analytics 4 nos ayuda a saber qué páginas se visitan y cómo mejorar la web. Solo se activan si pulsas «Aceptar». No usamos cookies publicitarias ni de personalización de anuncios.' : 'Google Analytics 4 helps us understand which pages are visited and how to improve the website. They are only enabled if you click “Accept all”. We do not use advertising or ad-personalisation cookies.'}</li>
          </ul>
          <p>{es
            ? 'También utilizamos una herramienta de estadísticas propia (Umami) que no instala cookies ni guarda datos personales en tu dispositivo.'
            : 'We also use a self-hosted statistics tool (Umami) that does not set cookies or store personal data on your device.'}</p>

          <h2>{es ? 'Cookies y almacenamiento en detalle' : 'Cookies and storage in detail'}</h2>
          <div class="legalCookieTableWrap" data-testid="cookie-policy-table-wrap">
            <table class="legalCookieTable" data-testid="cookie-policy-table">
              <thead>
                <tr>
                  <th scope="col">{es ? 'Nombre' : 'Name'}</th>
                  <th scope="col">{es ? 'Proveedor' : 'Provider'}</th>
                  <th scope="col">{es ? 'Finalidad' : 'Purpose'}</th>
                  <th scope="col">{es ? 'Duración' : 'Duration'}</th>
                  <th scope="col">{es ? 'Tipo' : 'Type'}</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.name} data-testid={`cookie-policy-row-${row.name}`}>
                    <td><code>{row.name}</code></td>
                    <td>{row.provider}</td>
                    <td>{row.purpose[i]}</td>
                    <td>{row.duration[i]}</td>
                    <td>{row.type[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>{es ? 'Servicios de terceros' : 'Third-party services'}</h2>
          <p>{es
            ? 'La página de contacto incluye un mapa de Google Maps. Al cargarlo, Google puede instalar sus propias cookies conforme a su política de privacidad (policies.google.com). Google Analytics es un servicio de Google Ireland Limited; la información puede transferirse a Estados Unidos bajo el Marco de Privacidad de Datos UE-EE. UU.'
            : 'The contact page includes a Google Maps map. When it loads, Google may set its own cookies under its privacy policy (policies.google.com). Google Analytics is provided by Google Ireland Limited; data may be transferred to the United States under the EU-US Data Privacy Framework.'}</p>

          <h2>{es ? 'Cómo gestionar o retirar tu consentimiento' : 'How to manage or withdraw your consent'}</h2>
          <p>{es
            ? 'Puedes cambiar tu elección en cualquier momento desde el botón siguiente o desde «Configurar cookies» al pie de cada página. Si rechazas, Google Analytics deja de guardar cookies en tu dispositivo.'
            : 'You can change your choice at any time with the button below or with “Cookie settings” at the bottom of every page. If you reject, Google Analytics stops storing cookies on your device.'}</p>
          <p><button type="button" class="vcCookieBtn vcCookieBtn--solid" onClick={openCookieConsent} data-testid="cookie-policy-open-settings">{es ? 'Configurar cookies' : 'Cookie settings'}</button></p>
          <p>{es
            ? 'También puedes bloquear o eliminar las cookies desde la configuración de tu navegador (Chrome, Firefox, Safari o Edge, en el apartado de privacidad). Bloquear las cookies técnicas puede impedir que algunas funciones, como las reservas, funcionen correctamente.'
            : 'You can also block or delete cookies in your browser settings (Chrome, Firefox, Safari or Edge, under privacy). Blocking technical cookies may stop some features, such as bookings, from working properly.'}</p>

          <h2>{es ? 'Más información' : 'More information'}</h2>
          <p>{es ? 'Para saber cómo tratamos tus datos personales consulta la ' : 'To learn how we process your personal data, see our '}<Link href="/protecciondatos" data-testid="cookie-policy-privacy-link">{es ? 'Política de privacidad' : 'Privacy policy'}</Link>{es ? ' y el ' : ' and '}<Link href="/avisolegal" data-testid="cookie-policy-legal-link">{es ? 'Aviso legal' : 'Legal notice'}</Link>.</p>
          <p data-testid="cookie-policy-updated">{es ? 'Última actualización: 2 de noviembre de 2026.' : 'Last updated: 2 November 2026.'}</p>
        </div>
      </div>
    </div>
  )
}

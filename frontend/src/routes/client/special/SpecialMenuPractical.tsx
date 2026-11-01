import type { PublicMenu } from '../../../lib/types'
import { useI18n } from '../../../lib/i18n'
import { prerenderData } from '../../../lib/prerenderData'
import { buildPublicMenuHref } from '../../../lib/publicMenus'
import { MENU_TYPE_SPECIAL, normalizeMenuType } from '../../../lib/menuTypeCodes'
import { RESTAURANT } from '../../../lib/restaurant'

const euro = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(2)} €`

function longDate(iso: string, lang: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Practical, crawlable facts for image-based special menus (date, prices per
 * section, prereserva, location) plus links to the other current proposals.
 * Everything is derived from published menu data, so it never drifts from the
 * backoffice. When the date is COMPLETO the links become the alternatives.
 *
 * Coordination id: special_menu_practical_v1
 */
export function SpecialMenuPractical(props: { menu: PublicMenu; headingLevel?: 'h2' | 'h3' }) {
  const { lang } = useI18n()
  const Heading = props.headingLevel || 'h3'
  const es = lang !== 'en'
  const { menu } = props
  const specialDate = menu.special_date ?? null
  const sections = Array.isArray(menu.special_menu_sections) ? menu.special_menu_sections : []
  const prices = sections
    .filter((section) => section.price != null)
    .map((section) => `${section.title || menu.menu_title}: ${euro(Number(section.price))}${es ? ' por persona' : ' per person'}`)
  const mains = sections
    .map((section) => ({ id: section.id, title: section.title || menu.menu_title, dishes: (section.principales || []).map((dish) => dish.title).filter(Boolean) }))
    .filter((group) => group.dishes.length > 0)
  const others = Object.values(prerenderData().menus || {})
    .filter((other) => other.id !== menu.id && normalizeMenuType(other.menu_type) === MENU_TYPE_SPECIAL && !other.completo)
    .map((other) => ({
      href: buildPublicMenuHref(other),
      label: `${other.menu_title}${other.special_date?.date ? ` (${longDate(other.special_date.date, lang)})` : ''}`,
    }))
  const prefix = es ? '' : '/en'
  const links = [
    ...others,
    { href: '/menusdegrupos', label: es ? 'Menús para grupos todo el año' : 'Group menus all year round' },
    { href: '/eventos-empresa', label: es ? 'Comidas y cenas de empresa' : 'Company lunches and dinners' },
  ]

  return (
    <section class="section container specialMenuPractical" data-coordination-id="special_menu_practical_v1" data-testid="public-special-menu-practical">
      <Heading data-testid="public-special-menu-practical-title">{es ? 'Información práctica' : 'Practical information'}</Heading>
      <ul class="specialMenuPracticalList" data-testid="public-special-menu-practical-list">
        {specialDate?.date ? (
          <li data-testid="public-special-menu-practical-date"><strong>{es ? 'Fecha: ' : 'Date: '}</strong>{longDate(specialDate.date, lang)}{specialDate.title ? ` · ${specialDate.title}` : ''}</li>
        ) : null}
        {prices.length ? (
          <li data-testid="public-special-menu-practical-prices"><strong>{es ? 'Precios: ' : 'Prices: '}</strong>{prices.join(' · ')}</li>
        ) : null}
        {mains.map((group) => (
          <li key={group.title} data-testid={`public-special-menu-practical-mains-${group.id}`}><strong>{es ? `Principal a elegir (${group.title}): ` : `Choice of main (${group.title}): `}</strong>{group.dishes.join(' · ')}</li>
        ))}
        {menu.completo ? (
          <li data-testid="public-special-menu-practical-completo"><strong>{es ? 'Disponibilidad: ' : 'Availability: '}</strong>{es ? 'esta fecha está completa. Te proponemos las alternativas de abajo.' : 'this date is fully booked. See the alternatives below.'}</li>
        ) : specialDate?.prereserva_enabled ? (
          <li data-testid="public-special-menu-practical-prereserva"><strong>{es ? 'Reserva: ' : 'Booking: '}</strong>{es ? 'para esta fecha es necesaria una prerreserva. ' : 'a pre-booking is required for this date. '}<a href={`${prefix}/reservas-especiales-politica`} data-testid="public-special-menu-practical-policy-link">{es ? 'Consulta las condiciones para fechas festivas' : 'Read the conditions for festive dates'}</a>.</li>
        ) : null}
        <li data-testid="public-special-menu-practical-allergens"><strong>{es ? 'Alergias e intolerancias: ' : 'Allergies and intolerances: '}</strong>{es ? 'indícalas al reservar o escríbenos por WhatsApp y te confirmamos las opciones disponibles.' : 'tell us when booking or message us on WhatsApp and we will confirm the available options.'}</li>
        <li data-testid="public-special-menu-practical-place"><strong>{es ? 'Dónde: ' : 'Where: '}</strong>{`${RESTAURANT.name}, ${RESTAURANT.street}, ${RESTAURANT.postalCode} ${RESTAURANT.locality} (${RESTAURANT.region})`}{es ? ', con aparcamiento junto al restaurante.' : ', with parking next to the restaurant.'}</li>
      </ul>
      <Heading data-testid="public-special-menu-practical-others-title">{menu.completo ? (es ? 'Alternativas disponibles' : 'Available alternatives') : (es ? 'Otras propuestas' : 'Other proposals')}</Heading>
      <ul class="specialMenuPracticalList" data-testid="public-special-menu-practical-others">
        {links.map((link) => (
          <li key={link.href} data-testid={`public-special-menu-practical-other-${link.href.replace(/[^a-z0-9]+/gi, '-')}`}>
            <a href={`${prefix}${link.href}`}>{link.label}</a>
          </li>
        ))}
      </ul>
    </section>
  )
}

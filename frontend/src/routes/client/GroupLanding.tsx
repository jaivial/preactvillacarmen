import { Link } from 'wouter-preact'
import { localized, useI18n } from '../../lib/i18n'
import { menuPath } from '../../lib/routes'
import type { GroupMenuDisplay } from '../../lib/types'

export function GroupLanding({ menus }: { menus: GroupMenuDisplay[] | null | undefined }) {
  const { lang } = useI18n()
  const es = lang === 'es'
  return <header class="container editorial-page group-landing" data-testid="group-commercial-landing">
    <p class="editorial-kicker">{es ? 'Comidas y celebraciones en Catarroja' : 'Group dining and celebrations in Catarroja'}</p>
    <h1 class="page-title">{es ? 'Menús para grupos en Catarroja' : 'Group menus in Catarroja'}</h1>
    <p class="editorial-lead">{es ? 'Reunir a familia, amigos o equipo empieza por elegir bien el menú. Compara las propuestas publicadas, sus precios y condiciones y cuéntanos cómo es tu celebración.' : 'Bring family, friends or colleagues together with the right menu. Compare published options, prices and conditions, then tell us about your celebration.'}</p>
    <section><h2>{es ? 'Cómo organizamos tu comida de grupo' : 'How we organise your group meal'}</h2><p>{es ? 'Indícanos fecha, número de asistentes y tipo de celebración. El mínimo de comensales aparece en cada menú. El equipo confirmará el espacio disponible, el aforo máximo para ese montaje, la elección de platos y las condiciones antes de la reserva: no existe un máximo genérico para todas las celebraciones.' : 'Tell us your date, guest count and celebration. Each menu states its minimum party size. Our team will confirm the available space, maximum capacity for that layout, dishes and conditions before booking: there is no single maximum for every celebration.'}</p></section>
    {menus?.length ? <section data-testid="group-menu-comparison"><h2>{es ? 'Menús disponibles' : 'Available menus'}</h2><div class="group-menu-comparison">{menus.map((menu) => <article key={menu.id}><h3>{localized(menu.menu_title, menu.menu_title_english, lang)}</h3><p>{menu.price} € · {es ? 'mínimo' : 'minimum'} {menu.min_party_size} {es ? 'personas' : 'people'}</p><Link href={menuPath({ id: menu.id, slug: null })}>{es ? 'Consultar platos y condiciones' : 'View dishes and conditions'}</Link></article>)}</div></section> : null}
    <section class="editorial-faq"><h2>{es ? 'Preguntas antes de reservar' : 'Questions before booking'}</h2>
      <details><summary>{es ? '¿Qué incluyen las bebidas y qué suplementos puede haber?' : 'What drinks are included and what supplements may apply?'}</summary><p>{es ? 'Cada ficha indica las bebidas, el café y cualquier suplemento aplicable. Consulta el menú elegido antes de reservar; las condiciones pueden ser distintas entre propuestas.' : 'Each menu states its drinks, coffee and any applicable supplements. Check your chosen menu before booking; conditions can differ between options.'}</p></details>
      <details><summary>{es ? '¿Podéis atender alergias o adaptar el menú?' : 'Can you accommodate allergies or adapt a menu?'}</summary><p>{es ? 'Consulta los alérgenos publicados y coméntanos cualquier necesidad antes de confirmar. El equipo te indicará las adaptaciones posibles; no des por hecho que un plato es apto sin confirmarlo.' : 'Check the published allergens and tell us about any requirements before confirming. Our team will explain possible adaptations; do not assume a dish is suitable without checking.'}</p></details>
      <details><summary>{es ? '¿Cómo pido una propuesta y confirmo la fecha?' : 'How do I request a proposal and confirm a date?'}</summary><p>{es ? 'Escríbenos desde Contacto con la fecha, el número de asistentes y el menú que te interesa. La fecha queda confirmada cuando recibes respuesta del equipo.' : 'Use Contact to send the date, guest count and preferred menu. Your date is confirmed when our team replies.'}</p></details>
    </section>
    <aside class="editorial-cta"><h2>{es ? 'Cuéntanos qué quieres celebrar' : 'Tell us what you are planning'}</h2><div class="editorial-actions"><Link className="btn primary" href="/contacto">{es ? 'Pedir una propuesta' : 'Request a proposal'}</Link><Link className="btn" href="/arroces-y-paellas">{es ? 'Ver arroces y paellas' : 'View rice and paellas'}</Link><Link className="btn" href="/reservas">{es ? 'Consultar reservas' : 'Check bookings'}</Link></div></aside>
  </header>
}

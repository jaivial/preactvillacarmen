import { Link } from 'wouter-preact'
import { localized, useI18n } from '../../lib/i18n'
import { menuPath } from '../../lib/routes'
import { initialMenu } from '../../lib/prerenderData'
import { DiscoveryCard } from '../../components/DiscoveryCard'
import type { GroupMenuDisplay } from '../../lib/types'

export function GroupLanding({ menus }: { menus: GroupMenuDisplay[] | null | undefined }) {
  const { lang } = useI18n()
  const es = lang === 'es'
  const action = es ? 'Consultar platos y condiciones' : 'View dishes and conditions'
  return <div class="page editorial-page group-landing" data-testid="group-commercial-landing">
    <header class="container group-landing-hero"><div>
      <p class="editorial-kicker">{es ? 'Comidas y celebraciones en Catarroja' : 'Group dining and celebrations in Catarroja'}</p><h1 class="page-title">{es ? 'Menús para grupos en Catarroja' : 'Group menus in Catarroja'}</h1>
      <p class="editorial-lead">{es ? 'Reunir a familia, amigos o equipo empieza por elegir bien el menú. Compara propuestas, precios y condiciones y cuéntanos cómo es tu celebración.' : 'Bring family, friends or colleagues together with the right menu. Compare published options, prices and conditions, then tell us about your celebration.'}</p>
      <ol class="group-planning-steps"><li>{es ? 'Elige una propuesta y revisa platos, bebidas y suplementos.' : 'Choose a menu and review its dishes, drinks and supplements.'}</li><li>{es ? 'Indícanos fecha, asistentes y cualquier necesidad alimentaria.' : 'Tell us your date, guest count and any dietary requirements.'}</li><li>{es ? 'Confirmamos contigo espacio, aforo para el montaje y condiciones.' : 'We confirm the space, capacity for your layout and conditions with you.'}</li></ol>
    </div><figure><img src="https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp" alt={es ? 'Salón de Alquería Villa Carmen preparado para una comida de grupo' : 'A room at Alqueria Villa Carmen prepared for a group meal'} width="1200" height="800" fetchpriority="high" decoding="async" /><figcaption>{es ? 'Fotografía propia de Alquería Villa Carmen.' : 'Villa Carmen’s own photograph.'}</figcaption></figure></header>
    {menus?.length ? <section class="container group-menu-section" data-testid="group-menu-comparison"><h2>{es ? 'Encuentra el menú para vuestro grupo' : 'Find the menu for your group'}</h2><div class="group-menu-comparison">{menus.map((menu) => {
      const detail = initialMenu(menu.id); const title = localized(menu.menu_title, menu.menu_title_english, lang)
      const image = detail?.show_menu_preview_image && detail.menu_preview_image_url ? detail.menu_preview_image_url : 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp'
      return <DiscoveryCard key={menu.id} href={menuPath({ id: menu.id, slug: detail?.slug || menu.slug, seo_slug: detail?.seo_slug || menu.seo_slug })} title={title} description={`${menu.price} € · ${es ? 'mínimo' : 'minimum'} ${menu.min_party_size} ${es ? 'personas' : 'people'}`} image={image} imageAlt={`${title} · Alqueria Villa Carmen`} action={action} testId={`group-menu-card-${menu.id}`} />
    })}</div></section> : null}
    <section class="container editorial-faq"><h2>{es ? 'Preguntas antes de reservar' : 'Questions before booking'}</h2>
      <details><summary><span>{es ? '¿Qué incluyen las bebidas y qué suplementos puede haber?' : 'What drinks are included and what supplements may apply?'}</span><span class="editorial-faq-icon" aria-hidden="true" /></summary><p>{es ? 'Cada ficha indica las bebidas, el café y cualquier suplemento aplicable. Consulta el menú elegido antes de reservar; las condiciones pueden ser distintas entre propuestas.' : 'Each menu states its drinks, coffee and any applicable supplements. Check your chosen menu before booking; conditions can differ between options.'}</p></details>
      <details><summary><span>{es ? '¿Podéis atender alergias o adaptar el menú?' : 'Can you accommodate allergies or adapt a menu?'}</span><span class="editorial-faq-icon" aria-hidden="true" /></summary><p>{es ? 'Consulta los alérgenos publicados y coméntanos cualquier necesidad antes de confirmar. El equipo te indicará las adaptaciones posibles; no des por hecho que un plato es apto sin confirmarlo.' : 'Check the published allergens and tell us about any requirements before confirming. Our team will explain possible adaptations; do not assume a dish is suitable without checking.'}</p></details>
      <details><summary><span>{es ? '¿Cómo pido una propuesta y confirmo la fecha?' : 'How do I request a proposal and confirm a date?'}</span><span class="editorial-faq-icon" aria-hidden="true" /></summary><p>{es ? 'Escríbenos desde Contacto con la fecha, el número de asistentes y el menú que te interesa. La fecha queda confirmada cuando recibes respuesta del equipo.' : 'Use Contact to send the date, guest count and preferred menu. Your date is confirmed when our team replies.'}</p></details>
    </section>
    <aside class="container editorial-cta"><h2>{es ? 'Cuéntanos qué quieres celebrar' : 'Tell us what you are planning'}</h2><div class="editorial-actions"><Link className="btn primary" href="/contacto">{es ? 'Pedir una propuesta' : 'Request a proposal'}</Link><Link className="btn" href="/arroces-y-paellas">{es ? 'Ver arroces y paellas' : 'View rice and paellas'}</Link><Link className="btn" href="/reservas">{es ? 'Consultar reservas' : 'Check bookings'}</Link></div></aside>
  </div>
}

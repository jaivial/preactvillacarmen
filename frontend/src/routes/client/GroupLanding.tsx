import { Link } from 'wouter-preact'
import { localized, useI18n } from '../../lib/i18n'
import { menuPath } from '../../lib/routes'
import { initialMenu } from '../../lib/prerenderData'
import { DiscoveryCard } from '../../components/DiscoveryCard'
import type { GroupMenuDisplay, PublicMenu } from '../../lib/types'

// Local, responsive derivatives of the freely licensed Unsplash photographs
// documented in docs/group-menu-photos.md. They illustrate the menu type;
// they are not presented as photographs of Villa Carmen's dishes or rooms.
// Versioned asset URLs bypass a stale Bunny 404 cached before all responsive
// derivatives were deployed; no binary or licensed-source change is needed.
const groupPhotoVersion = '20261028'
const menuPhotos: Record<number, { name: string; alt: Record<'es' | 'en', string> }> = {
  1: { name: 'arrocero', alt: { es: 'Fotografía ilustrativa de una paella de marisco para el Menú Arrocero', en: 'Illustrative photograph of a seafood paella for the Rice Menu' } },
  2: { name: 'mediterraneo', alt: { es: 'Fotografía ilustrativa de un plato mediterráneo con verduras para el Menú Mediterráneo', en: 'Illustrative photograph of a Mediterranean dish with vegetables for the Mediterranean Menu' } },
  3: { name: 'level', alt: { es: 'Fotografía ilustrativa de un comedor preparado para una comida de grupo', en: 'Illustrative photograph of a dining room set for a group meal' } },
}

export function GroupLanding({ menus, details }: { menus: GroupMenuDisplay[] | null | undefined; details: Record<number, PublicMenu> }) {
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
      const detail = details[menu.id] || initialMenu(menu.id); const title = localized(menu.menu_title, menu.menu_title_english, lang)
      // The lightweight active-menu list intentionally omits commercial details.
      // Read them from the public menu already embedded for prerender/hydration.
      const price = detail?.price || ''
      const minimum = detail?.settings?.min_party_size || 0
      const description = [
        price ? `${price} €` : '',
        minimum ? `${es ? 'mínimo' : 'minimum'} ${minimum} ${es ? 'personas' : 'people'}` : '',
      ].filter(Boolean).join(' · ') || (es ? 'Consulta platos, precio y condiciones' : 'View dishes, price and conditions')
      const photo = menuPhotos[menu.id]
      const image = photo ? `/images/group-menus/${photo.name}-800.jpg?v=${groupPhotoVersion}` : 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp'
      const imageSrcSet = photo ? [480, 800, 1200].map((width) => `/images/group-menus/${photo.name}-${width}.webp ${width}w`).join(', ') : undefined
      const imageFallbackSrcSet = photo ? [480, 800, 1200].map((width) => `/images/group-menus/${photo.name}-${width}.jpg ${width}w`).join(', ') : undefined
      return <DiscoveryCard key={menu.id} href={menuPath({ id: menu.id, slug: detail?.slug || menu.slug, seo_slug: detail?.seo_slug || menu.seo_slug })} title={title} description={description} image={image} imageSrcSet={imageSrcSet} imageFallbackSrcSet={imageFallbackSrcSet} imageSizes="(max-width: 600px) calc(100vw - 40px), (max-width: 1024px) calc(50vw - 40px), 360px" imageAlt={photo?.alt[lang] || (es ? `Salón de Villa Carmen · ${title}` : `Villa Carmen dining room · ${title}`)} action={action} testId={`group-menu-card-${menu.id}`} />
    })}</div></section> : null}
    <section class="container editorial-faq"><h2>{es ? 'Preguntas antes de reservar' : 'Questions before booking'}</h2>
      <details><summary><span>{es ? '¿Qué incluyen las bebidas y qué suplementos puede haber?' : 'What drinks are included and what supplements may apply?'}</span><span class="editorial-faq-icon" aria-hidden="true" /></summary><p>{es ? 'Cada ficha indica las bebidas, el café y cualquier suplemento aplicable. Consulta el menú elegido antes de reservar; las condiciones pueden ser distintas entre propuestas.' : 'Each menu states its drinks, coffee and any applicable supplements. Check your chosen menu before booking; conditions can differ between options.'}</p></details>
      <details><summary><span>{es ? '¿Podéis atender alergias o adaptar el menú?' : 'Can you accommodate allergies or adapt a menu?'}</span><span class="editorial-faq-icon" aria-hidden="true" /></summary><p>{es ? 'Consulta los alérgenos publicados y coméntanos cualquier necesidad antes de confirmar. El equipo te indicará las adaptaciones posibles; no des por hecho que un plato es apto sin confirmarlo.' : 'Check the published allergens and tell us about any requirements before confirming. Our team will explain possible adaptations; do not assume a dish is suitable without checking.'}</p></details>
      <details><summary><span>{es ? '¿Cómo pido una propuesta y confirmo la fecha?' : 'How do I request a proposal and confirm a date?'}</span><span class="editorial-faq-icon" aria-hidden="true" /></summary><p>{es ? 'Escríbenos desde Contacto con la fecha, el número de asistentes y el menú que te interesa. La fecha queda confirmada cuando recibes respuesta del equipo.' : 'Use Contact to send the date, guest count and preferred menu. Your date is confirmed when our team replies.'}</p></details>
    </section>
    <aside class="container editorial-cta"><h2>{es ? 'Cuéntanos qué quieres celebrar' : 'Tell us what you are planning'}</h2><div class="editorial-actions"><Link className="btn primary" href="/contacto">{es ? 'Pedir una propuesta' : 'Request a proposal'}</Link><Link className="btn" href="/arroces-y-paellas">{es ? 'Ver arroces y paellas' : 'View rice and paellas'}</Link><Link className="btn" href="/reservas">{es ? 'Consultar reservas' : 'Check bookings'}</Link></div></aside>
  </div>
}

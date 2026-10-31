export const SITE_ORIGIN = 'https://www.alqueriavillacarmen.com'
export const SOCIAL_IMAGE = 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_4.webp'
export type Language = 'es' | 'en'

export type RouteMetadata = {
  path: string
  indexable: boolean
  prerender: boolean
  localized: boolean
  title: Record<Language, string>
  description: Record<Language, string>
}

const page = (
  path: string,
  title: [string, string],
  description: [string, string],
  options: Partial<Pick<RouteMetadata, 'indexable' | 'prerender' | 'localized'>> = {},
): RouteMetadata => ({
  path,
  indexable: options.indexable ?? true,
  prerender: options.prerender ?? true,
  localized: options.localized ?? true,
  title: { es: title[0], en: title[1] },
  description: { es: description[0], en: description[1] },
})

// The single editorial route registry used by the renderer, head and sitemap.
// Menu URLs are appended from the same public catalog that creates their HTML.
export const PUBLIC_ROUTES: RouteMetadata[] = [
  page('/', ['Restaurante en Catarroja | Alquería Villa Carmen', 'Restaurant in Catarroja | Alqueria Villa Carmen'], ['Cocina mediterránea, arroces, menús y celebraciones en una alquería con jardines en Catarroja, Valencia.', 'Mediterranean food, rice dishes, menus and celebrations in an alqueria with gardens in Catarroja, Valencia.']),
  page('/contacto', ['Contacto y cómo llegar | Alquería Villa Carmen', 'Contact and directions | Alqueria Villa Carmen'], ['Dirección, horario, teléfono y cómo llegar a Alquería Villa Carmen en Catarroja.', 'Address, opening hours, phone and directions to Alqueria Villa Carmen in Catarroja.']),
  page('/arroces-y-paellas', ['Arrocería en Catarroja: arroces y paellas | Villa Carmen', 'Rice restaurant in Catarroja: rice and paella | Villa Carmen'], [
    'Arroces secos y melosos, especialidades mediterráneas y menús para compartir en Alquería Villa Carmen, Catarroja.',
    'Dry and creamy rice, Mediterranean specialties and menus for sharing at Alqueria Villa Carmen, Catarroja.']),
  page('/eventos', ['Salones para celebraciones en Catarroja | Villa Carmen', 'Celebration venue in Catarroja | Villa Carmen'], ['Salones y jardines en una alquería de Catarroja para celebraciones: bodas, comuniones, bautizos, cumpleaños y eventos de empresa. Pide tu propuesta.', 'Rooms and gardens in a Catarroja alqueria for celebrations: weddings, communions, christenings, birthdays and company events. Request a proposal.']),
  page('/bodas', ['Bodas en Catarroja: salones y jardines | Villa Carmen', 'Weddings in Catarroja: rooms and gardens | Villa Carmen'], ['Bodas en una alquería con jardines en Catarroja, cerca de Valencia: ceremonia, cóctel y banquete con cocina mediterránea y coordinación.', 'Rooms, gardens, cuisine and personal planning for weddings in Catarroja, Valencia.']),
  page('/comuniones', ['Restaurante para comuniones en Catarroja | Villa Carmen', 'Communion restaurant in Catarroja | Villa Carmen'], ['Restaurante para comuniones cerca de Valencia: salones, jardines y menús para familias, con opción para niños, en Catarroja.', 'Communion celebrations with rooms, gardens and family menus in Catarroja.']),
  page('/bautizos', ['Restaurante para bautizos cerca de Valencia | Villa Carmen', 'Christening restaurant near Valencia | Villa Carmen'], ['Celebra el bautizo en una alquería con salones y jardines en Catarroja, cerca de Valencia: menús de grupo con precio cerrado y horario ajustado a la ceremonia.', 'Christening lunches in an alqueria with rooms and gardens in Catarroja, near Valencia: set-price group menus timed around the ceremony.']),
  page('/eventos-empresa', ['Comidas y cenas de empresa cerca de Valencia | Villa Carmen', 'Company lunches and dinners near Valencia | Villa Carmen'], ['Comidas y cenas de empresa en Catarroja, cerca de Valencia: salones, menús cerrados por persona, cenas de Navidad y una propuesta adaptada a vuestro equipo.', 'Company lunches and dinners in Catarroja, near Valencia: rooms, set per-person menus, Christmas dinners and a proposal shaped around your team.']),
  page('/guia-arroces-valencianos', ['Guía de arroces valencianos | Villa Carmen', 'Guide to Valencian rice dishes | Villa Carmen'], ['Guía práctica para entender los arroces secos y melosos, la paella valenciana y cómo elegir y reservar en Catarroja.', 'A practical guide to dry and creamy rice, Valencian paella and choosing and booking a meal in Catarroja.']),
  page('/checklist-celebraciones', ['Checklist para bodas y celebraciones | Villa Carmen', 'Wedding and celebration checklist | Villa Carmen'], ['Checklist práctica para organizar una boda, comunión o evento: invitados, menú, alérgenos, espacios, horarios y confirmaciones.', 'A practical wedding, communion and event checklist: guests, menu, allergens, spaces, timings and confirmations.']),
  page('/menusdegrupos', ['Menús para grupos en Catarroja (Valencia) | Villa Carmen', 'Group menus in Catarroja (Valencia) | Villa Carmen'], ['Menús cerrados para grupos y comidas familiares cerca de Valencia: platos, precio por persona, mínimo de comensales, bebidas y condiciones.', 'Set menus for groups and family meals near Valencia: dishes, price per person, minimum party size, drinks and conditions.']),
  page('/restaurante-albufera-catarroja', ['Restaurante cerca de l’Albufera y el Port de Catarroja | Villa Carmen', 'Restaurant near l’Albufera and Catarroja port | Villa Carmen'], ['Arroces, paella y cocina mediterránea en una alquería con jardines a pocos minutos del Port de Catarroja y l’Albufera. Reserva mesa.', 'Rice dishes, paella and Mediterranean food in an alqueria with gardens a few minutes from Catarroja port and l’Albufera. Book a table.']),
  page('/postres', ['Postres caseros | Alquería Villa Carmen', 'Homemade desserts | Alqueria Villa Carmen'], ['Consulta la carta de postres de nuestro restaurante en Catarroja.', 'Explore the dessert menu at our restaurant in Catarroja.']),
  page('/vinos', ['Carta de vinos | Alquería Villa Carmen', 'Wine list | Alqueria Villa Carmen'], ['Vinos valencianos y otras denominaciones para acompañar nuestra cocina mediterránea.', 'Valencian wines and other appellations to accompany our Mediterranean cuisine.']),
  page('/cafes', ['Cafés | Alquería Villa Carmen', 'Coffee | Alqueria Villa Carmen'], ['Consulta nuestra selección de cafés para terminar la sobremesa.', 'Explore our coffee selection to finish your meal.']),
  page('/bebidas', ['Bebidas | Alquería Villa Carmen', 'Drinks | Alqueria Villa Carmen'], ['Consulta la carta de bebidas de Alquería Villa Carmen.', 'Explore the drinks list at Alqueria Villa Carmen.']),
  page('/avisolegal', ['Aviso legal | Alquería Villa Carmen', 'Legal notice | Alqueria Villa Carmen'], ['Información legal del sitio web de Alquería Villa Carmen.', 'Legal information for the Alqueria Villa Carmen website.']),
  page('/protecciondatos', ['Protección de datos | Alquería Villa Carmen', 'Data protection | Alqueria Villa Carmen'], ['Política de privacidad y protección de datos de Alquería Villa Carmen.', 'Privacy and data protection policy for Alqueria Villa Carmen.']),
  page('/booking-policies', ['Política de reservas | Alquería Villa Carmen', 'Booking policy | Alqueria Villa Carmen'], ['Condiciones aplicables a las reservas de Alquería Villa Carmen.', 'Terms and conditions for bookings at Alqueria Villa Carmen.']),
  page('/reservas-especiales-politica', ['Política de fechas festivas | Villa Carmen', 'Festive-date booking policy | Villa Carmen'], ['Condiciones de reserva para menús y fechas festivas.', 'Booking conditions for festive menus and dates.']),
  page('/reservas', ['Reservar mesa | Alquería Villa Carmen', 'Book a table | Alqueria Villa Carmen'], ['Consulta disponibilidad y reserva mesa en Alquería Villa Carmen.', 'Check availability and book a table at Alqueria Villa Carmen.'], { indexable: false, prerender: false }),
  page('/reservas/modificar', ['Modificar reserva | Villa Carmen', 'Change booking | Villa Carmen'], ['Gestiona una reserva existente.', 'Manage an existing booking.'], { indexable: false, prerender: false }),
  page('/reservas/pago-completado', ['Pago completado | Villa Carmen', 'Payment completed | Villa Carmen'], ['Estado del pago de tu reserva.', 'Your booking payment status.'], { indexable: false, prerender: false, localized: false }),
  page('/confirm', ['Confirmar reserva | Villa Carmen', 'Confirm booking | Villa Carmen'], ['Confirmación de una reserva.', 'Booking confirmation.'], { indexable: false, prerender: false, localized: false }),
  page('/cancel', ['Cancelar reserva | Villa Carmen', 'Cancel booking | Villa Carmen'], ['Cancelación de una reserva.', 'Booking cancellation.'], { indexable: false, prerender: false, localized: false }),
  page('/update-rice', ['Elegir arroz | Villa Carmen', 'Choose rice | Villa Carmen'], ['Actualiza la elección de arroz de tu reserva.', 'Update the rice choice for your booking.'], { indexable: false, prerender: false, localized: false }),
  page('/baja-publicidad', ['Baja de comunicaciones | Villa Carmen', 'Unsubscribe | Villa Carmen'], ['Gestiona tu baja de comunicaciones comerciales.', 'Manage your marketing communications subscription.'], { indexable: false, prerender: false, localized: false }),
  page('/backoffice', ['Backoffice | Villa Carmen', 'Backoffice | Villa Carmen'], ['Acceso privado de gestión.', 'Private management access.'], { indexable: false, prerender: false, localized: false }),
]

export function stripLanguagePrefix(pathname: string): { lang: Language; path: string } {
  const path = pathname.split('?')[0].split('#')[0] || '/'
  if (path === '/en' || path.startsWith('/en/')) {
    const stripped = path.slice(3) || '/'
    return { lang: 'en', path: stripped.startsWith('/') ? stripped : `/${stripped}` }
  }
  return { lang: 'es', path }
}

export function localizedPath(path: string, lang: Language): string {
  const clean = path.split('?')[0].split('#')[0] || '/'
  return lang === 'en' ? `/en${clean === '/' ? '' : clean}` : clean
}

export function equivalentLanguagePath(pathname: string, lang: Language): string {
  const current = stripLanguagePrefix(pathname)
  // Operational booking/unsubscribe routes have no English variant. Keep
  // their language controls on the real URL instead of emitting dead /en links.
  const route = PUBLIC_ROUTES.find((item) => item.path === current.path)
  if (route && !route.localized) return current.path
  return localizedPath(current.path, lang)
}

export function menuPath(menu: { id: number; slug?: string | null; seo_slug?: string | null }): string {
  const seoSlug = String(menu.seo_slug || '').trim()
  if (seoSlug) return `/menu/${encodeURIComponent(seoSlug)}`
  const slug = String(menu.slug || '').trim()
  return `/menu/${encodeURIComponent(String(menu.id))}${slug ? `/${encodeURIComponent(slug)}` : ''}`
}

// Coordination id: menu_seo_content_v1 - faq/price feed the menu FAQPage and Offer schema.
export type MenuRouteEntry = { id: number; slug: string; seo_slug?: string; title: Record<Language, string>; description: Record<Language, string>; path: string; price?: string; faq?: Record<Language, { question: string; answer: string }[]> }
// Coordination id: seo_item_routes_v1 - one public route per dish and per wine.
export type ItemRouteEntry = {
  id: number
  entityType: 'dish' | 'wine'
  slug: string
  path: string
  name: Record<Language, string>
  description: Record<Language, string>
  title: Record<Language, string>
  price?: number | null
  allergens: string[]
  photo: string
  section: string
  menuTitle: string
  menuPath: string
  tipo: string
  bodega: string
  denominacion: string
  graduacion?: number | null
  anyo: string
}
export type RouteMetadataInput = RouteMetadata | MenuRouteEntry

export function itemPath(entityType: 'dish' | 'wine', slug: string): string {
  return entityType === 'wine' ? `/vinos/${encodeURIComponent(slug)}` : `/platos/${encodeURIComponent(slug)}`
}

export function routeMetadata(pathname: string, menus: MenuRouteEntry[] = [], items: ItemRouteEntry[] = []): RouteMetadata & { canonicalPath: string } {
  const { lang, path } = stripLanguagePrefix(pathname)
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path
  const menuMatch = normalized.match(/^\/menu\/([^/]+)(?:\/([^/]+))?$/)
  if (menuMatch) {
    let routeKey = menuMatch[1]
    try { routeKey = decodeURIComponent(routeKey) } catch { /* Invalid keys fall through to 404. */ }
    const menu = menus.find((item) => /^\d+$/.test(routeKey) ? item.id === Number(routeKey) : item.seo_slug === routeKey)
    if (menu) {
      return {
        path: menu.path,
        indexable: true,
        prerender: true,
        localized: true,
        title: menu.title,
        description: menu.description,
        canonicalPath: localizedPath(menu.path, lang),
      }
    }
  }
  // Coordination id: seo_item_routes_v1 - /platos/<slug> and /vinos/<slug>.
  const itemMatch = normalized.match(/^\/(platos|vinos)\/([^/]+)$/)
  if (itemMatch) {
    const entityType = itemMatch[1] === 'vinos' ? 'wine' : 'dish'
    let slug = itemMatch[2]
    try { slug = decodeURIComponent(slug) } catch { /* Invalid slugs fall through to 404. */ }
    const item = items.find((entry) => entry.entityType === entityType && entry.slug === slug)
    if (item) {
      return {
        path: item.path,
        indexable: true,
        prerender: true,
        localized: true,
        title: item.title,
        description: item.description,
        canonicalPath: localizedPath(item.path, lang),
      }
    }
  }
  const aliases: Record<string, string> = {
    '/reservas.php': '/reservas',
    '/avisolegal.html': '/avisolegal',
    '/protecciondatos.html': '/protecciondatos',
    '/booking_policies.php': '/booking-policies',
    '/reservas-especiales-politica.html': '/reservas-especiales-politica',
    '/menudegrupos': '/menusdegrupos',
    '/menudegrupos.php': '/menusdegrupos',
  }
  const routePath = aliases[normalized] || (normalized.startsWith('/backoffice') ? '/backoffice' : normalized)
  const found = PUBLIC_ROUTES.find((route) => route.path === routePath)
  if (found) return { ...found, canonicalPath: localizedPath(found.path, lang) }
  return { ...page(normalized, ['Página no encontrada | Villa Carmen', 'Page not found | Villa Carmen'], ['La página solicitada no está disponible.', 'The requested page is not available.'], { indexable: false, prerender: false, localized: false }), canonicalPath: localizedPath(normalized, lang) }
}

export function canonicalUrl(pathname: string, menus: MenuRouteEntry[] = [], items: ItemRouteEntry[] = []): string {
  return new URL(routeMetadata(pathname, menus, items).canonicalPath, SITE_ORIGIN).href
}

export const GONE_PATHS = [
  // Retired public report: its private equivalent lives in the backoffice.
  '/datos-busquedas-restaurante',
  '/menusanvalentin', '/menusanvalentin.php',
  '/regala', '/regala.php',
  // Retired private administration URL: never expose it as a public page.
  '/configuracion.php',
] as const

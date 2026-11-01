import type { Lang } from './i18n'
import { localizedPath, routeMetadata, SITE_ORIGIN, SOCIAL_IMAGE, stripLanguagePrefix, type ItemRouteEntry, type MenuRouteEntry } from './routes'
import { OPENING_HOURS, RESTAURANT } from './restaurant'
import { resourceContent } from './resourceContent'
import { celebrationContent } from './celebrationContent'
import { menuSEOContent } from './menuSeoContent'
import { prerenderData } from './prerenderData'

export type BreadcrumbItem = { name: string; path: string }

// Breadcrumb labels stay short and stable even when the SEO title changes.
// Coordination id: editorial_breadcrumb_names_v1 - title edits must not leak into crumbs.
const editorialNames: Record<string, Record<Lang, string>> = {
  '/contacto': { es: 'Contacto', en: 'Contact' },
  '/eventos': { es: 'Eventos y celebraciones', en: 'Events and celebrations' },
  '/bodas': { es: 'Bodas en Catarroja', en: 'Weddings in Catarroja' },
  '/comuniones': { es: 'Comuniones en Catarroja', en: 'Communions in Catarroja' },
  '/bautizos': { es: 'Bautizos en Catarroja', en: 'Christenings in Catarroja' },
  '/eventos-empresa': { es: 'Eventos de empresa', en: 'Company events' },
  '/menusdegrupos': { es: 'Menús de grupos', en: 'Group menus' },
  '/arroces-y-paellas': { es: 'Arroces y paellas', en: 'Rice and paellas' },
  '/restaurante-albufera-catarroja': { es: 'Cerca de l’Albufera', en: 'Near l’Albufera' },
}

export function breadcrumbItems(pathname: string, lang: Lang, menus: MenuRouteEntry[] = [], items: ItemRouteEntry[] = []): BreadcrumbItem[] {
  const { path } = stripLanguagePrefix(pathname)
  if (path === '/') return []
  const home = { name: lang === 'es' ? 'Inicio' : 'Home', path: '/' }
  const crumbs = [home]
  // Coordination id: seo_item_routes_v1 - a dish or a wine hangs from the menu
  // it belongs to.
  const item = items.find((entry) => entry.path === path)
  if (item) {
    if (item.menuPath) crumbs.push({ name: item.menuTitle || (lang === 'es' ? 'Carta' : 'Menu'), path: item.menuPath })
    crumbs.push({ name: item.name[lang], path })
    return crumbs
  }
  if (['/bodas', '/comuniones', '/bautizos', '/eventos-empresa'].includes(path)) crumbs.push({ name: editorialNames['/eventos'][lang], path: '/eventos' })
  const menuId = path.match(/^\/menu\/(\d+)/)?.[1]
  const menu = menus.find((entry) => entry.path === path) || (menuId ? menus.find((entry) => entry.id === Number(menuId)) : undefined)
  if (menu) crumbs.push({ name: editorialNames['/menusdegrupos'][lang], path: '/menusdegrupos' })
  // PUBLIC_ROUTES and the catalog are the source of truth for every current
  // page, including editorial resources and menus using an SEO slug.
  const metadata = routeMetadata(path, menus, items)
  // Editorial pages use their short label; menus keep their own SEO title.
  const name = menu?.title[lang].split('|')[0].trim() || editorialNames[path]?.[lang] || (metadata.indexable ? metadata.title[lang].split('|')[0].trim() : '')
  if (!name) return []
  crumbs.push({ name, path })
  return crumbs
}

export function structuredData(pathname: string, menus: MenuRouteEntry[] = [], items: ItemRouteEntry[] = []): Record<string, unknown>[] {
  const metadata = routeMetadata(pathname, menus, items)
  if (!metadata.indexable) return []
  const { lang, path } = stripLanguagePrefix(pathname)
  const canonical = new URL(metadata.canonicalPath, SITE_ORIGIN).href
  const restaurant = {
    '@type': 'Restaurant',
    '@id': `${SITE_ORIGIN}/#restaurant`,
    name: RESTAURANT.name,
    // Name variants Google and directories already use for this business.
    alternateName: ['Alqueria Villa Carmen', 'Alquer\u00eda Vila Carmen', 'Villa Carmen Catarroja'],
    url: `${SITE_ORIGIN}/`,
    image: [SOCIAL_IMAGE],
    telephone: RESTAURANT.phone,
    email: RESTAURANT.email,
    servesCuisine: ['Mediterranean', 'Rice'],
    priceRange: '\u20ac\u20ac',
    // Coordination id: local_area_served_v1 - towns covered by /contacto (contact_nearby_towns_v1).
    areaServed: ['Catarroja', 'Albal', 'Massanassa', 'Beniparrell', 'Benet\u00fasser', 'Alfafar', 'Sedav\u00ed', 'Silla', 'Valencia'].map((name) => ({ '@type': 'City', name })),
    acceptsReservations: new URL(localizedPath('/reservas', lang), SITE_ORIGIN).href,
    menu: `${SITE_ORIGIN}/#menus`,
    address: {
      '@type': 'PostalAddress', streetAddress: RESTAURANT.street, postalCode: RESTAURANT.postalCode,
      addressLocality: RESTAURANT.locality, addressRegion: RESTAURANT.region, addressCountry: RESTAURANT.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: RESTAURANT.latitude, longitude: RESTAURANT.longitude },
    hasMap: RESTAURANT.directions,
    sameAs: [RESTAURANT.instagram],
    openingHoursSpecification: OPENING_HOURS.filter((entry) => 'opens' in entry).map((entry) => ({
      '@type': 'OpeningHoursSpecification', dayOfWeek: entry.days, opens: entry.opens, closes: entry.closes,
    })),
  }
  const breadcrumbs = breadcrumbItems(pathname, lang, menus, items)
  const graph: Record<string, unknown>[] = [restaurant]
  if (path !== '/' && breadcrumbs.length >= 2) graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name,
      item: new URL(localizedPath(item.path, lang), SITE_ORIGIN).href,
    })),
  })
  // Coordination id: menu_seo_content_v1 - menu Offer + FAQPage from backoffice content.
  const menu = menus.find((entry) => localizedPath(entry.path, lang) === metadata.canonicalPath)
  const price = Number(String(menu?.price || '').replace(',', '.').replace(/[^\d.]/g, ''))
  if (menu) graph.push({
    '@type': 'Menu', '@id': `${canonical}#menu`, name: menu.title[lang].split('|')[0].trim(), url: canonical, inLanguage: lang,
    provider: { '@id': `${SITE_ORIGIN}/#restaurant` },
    ...(price > 0 ? { offers: { '@type': 'Offer', price: price.toFixed(2), priceCurrency: 'EUR', url: canonical } } : {}),
  })
  // Coordination id: celebration_faq_schema_v1 - visible FAQ on celebration pages feeds FAQPage.
  // Coordination id: cafes_page_seo_v1 - the /cafes FAQ comes from its backoffice SEO.
  const pageFaq = path === '/cafes' ? menuSEOContent(prerenderData().cafesSeo || {}, lang).faq : []
  const faq = menu?.faq?.[lang] || resourceContent[path]?.[lang].faq || celebrationContent[path]?.[lang].faq || pageFaq
  if (faq.length) graph.push({
    '@type': 'FAQPage', '@id': `${canonical}#faq`,
    mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
  })
  // Coordination id: seo_item_routes_v1 - the dish or the wine of this page.
  const item = items.find((entry) => entry.path === path)
  if (item) {
    const offer = item.price && item.price > 0
      ? { '@type': 'Offer', price: item.price.toFixed(2), priceCurrency: 'EUR', url: canonical, availability: 'https://schema.org/InStock' }
      : undefined
    const properties: Record<string, unknown>[] = []
    if (item.denominacion) properties.push({ '@type': 'PropertyValue', name: lang === 'es' ? 'Denominación de origen' : 'Appellation', value: item.denominacion })
    if (item.graduacion) properties.push({ '@type': 'PropertyValue', name: lang === 'es' ? 'Graduación' : 'Alcohol by volume', value: `${item.graduacion}%` })
    graph.push({
      '@type': item.entityType === 'wine' ? 'Product' : 'MenuItem',
      '@id': `${canonical}#item`,
      name: item.name[lang],
      ...(item.description[lang] ? { description: item.description[lang] } : {}),
      url: canonical,
      inLanguage: lang,
      ...(item.photo ? { image: [item.photo] } : {}),
      ...(item.bodega ? { brand: { '@type': 'Brand', name: item.bodega } } : {}),
      ...(properties.length ? { additionalProperty: properties } : {}),
      ...(offer ? { offers: offer } : {}),
      provider: { '@id': `${SITE_ORIGIN}/#restaurant` },
    })
  }
  return [{ '@context': 'https://schema.org', '@graph': graph }]
}

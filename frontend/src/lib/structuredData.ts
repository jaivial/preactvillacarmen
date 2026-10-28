import type { Lang } from './i18n'
import { localizedPath, routeMetadata, SITE_ORIGIN, SOCIAL_IMAGE, stripLanguagePrefix, type MenuRouteEntry } from './routes'
import { OPENING_HOURS, RESTAURANT } from './restaurant'

export type BreadcrumbItem = { name: string; path: string }

const editorialNames: Record<string, Record<Lang, string>> = {
  '/contacto': { es: 'Contacto', en: 'Contact' },
  '/eventos': { es: 'Bodas y eventos', en: 'Weddings and events' },
  '/bodas': { es: 'Bodas', en: 'Weddings' },
  '/comuniones': { es: 'Comuniones', en: 'Communions' },
  '/eventos-empresa': { es: 'Eventos de empresa', en: 'Company events' },
  '/menusdegrupos': { es: 'Menús de grupos', en: 'Group menus' },
  '/arroces-y-paellas': { es: 'Arroces y paellas', en: 'Rice and paellas' },
}

export function breadcrumbItems(pathname: string, lang: Lang, menus: MenuRouteEntry[] = []): BreadcrumbItem[] {
  const { path } = stripLanguagePrefix(pathname)
  if (path === '/') return []
  const home = { name: lang === 'es' ? 'Inicio' : 'Home', path: '/' }
  const items = [home]
  if (['/bodas', '/comuniones', '/eventos-empresa'].includes(path)) items.push({ name: editorialNames['/eventos'][lang], path: '/eventos' })
  const menuId = path.match(/^\/menu\/(\d+)/)?.[1]
  const menu = menus.find((entry) => entry.path === path) || (menuId ? menus.find((entry) => entry.id === Number(menuId)) : undefined)
  if (menu) items.push({ name: editorialNames['/menusdegrupos'][lang], path: '/menusdegrupos' })
  // PUBLIC_ROUTES and the catalog are the source of truth for every current
  // page, including editorial resources and menus using an SEO slug.
  const name = menu?.title[lang].split('|')[0].trim() || routeMetadata(path, menus).title[lang].split('|')[0].trim()
  items.push({ name, path })
  return items
}

export function structuredData(pathname: string, menus: MenuRouteEntry[] = []): Record<string, unknown>[] {
  const metadata = routeMetadata(pathname, menus)
  if (!metadata.indexable) return []
  const { lang, path } = stripLanguagePrefix(pathname)
  const canonical = new URL(metadata.canonicalPath, SITE_ORIGIN).href
  const restaurant = {
    '@type': 'Restaurant',
    '@id': `${SITE_ORIGIN}/#restaurant`,
    name: RESTAURANT.name,
    url: `${SITE_ORIGIN}/`,
    image: [SOCIAL_IMAGE],
    telephone: RESTAURANT.phone,
    email: RESTAURANT.email,
    servesCuisine: ['Mediterranean', 'Rice'],
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
  const breadcrumbs = breadcrumbItems(pathname, lang, menus)
  const graph: Record<string, unknown>[] = [restaurant]
  if (path !== '/') graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name,
      item: new URL(localizedPath(item.path, lang), SITE_ORIGIN).href,
    })),
  })
  return [{ '@context': 'https://schema.org', '@graph': graph }]
}

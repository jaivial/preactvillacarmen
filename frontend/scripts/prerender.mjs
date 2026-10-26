import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const dist = new URL('../dist/', import.meta.url).pathname
const ssr = await import('../dist-ssr/ssr.js')
const apiOrigin = (process.env.VITE_PRERENDER_API_ORIGIN || 'https://www.alqueriavillacarmen.com').replace(/\/$/, '')
const template = await readFile(join(dist, 'index.html'), 'utf8')
const getJson = async (path) => {
  const response = await fetch(`${apiOrigin}${path}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return response.json()
}

const legalSlugs = {
  '/avisolegal': 'aviso-legal',
  '/protecciondatos': 'proteccion-datos',
  '/booking-policies': 'booking-policies',
  '/reservas-especiales-politica': 'special-booking-politics',
}
const [sidebarResponse, homeResponse, groupResponse, postresResponse, cafesResponse, bebidasResponse, tintoResponse, ...legalResponses] = await Promise.all([
  getJson('/api/menus/sidebar'), getJson('/api/menus/home'),
  getJson('/api/menuDeGruposBackend/getActiveMenusForDisplay'), getJson('/api/postres'),
  getJson('/api/comida/cafes?active=1'), getJson('/api/comida/bebidas?active=1'),
  getJson('/api/vinos?tipo=TINTO&include_image=0'),
  ...Object.values(legalSlugs).map((slug) => getJson(`/api/public/legal-page?slug=${slug}`)),
])
const sidebar = {
  menus: sidebarResponse.menus || [], visible_sections: sidebarResponse.visible_sections || [],
  cafe_page_active: Boolean(sidebarResponse.cafe_page_active), bebidas_page_active: Boolean(sidebarResponse.bebidas_page_active),
  postres_page_active: Boolean(sidebarResponse.postres_page_active), vinos_page_active: sidebarResponse.vinos_page_active !== false,
  postres_web_placement: sidebarResponse.postres_web_placement || 'inside_menus', cafes_web_placement: sidebarResponse.cafes_web_placement || 'inside_menus',
  vinos_web_placement: sidebarResponse.vinos_web_placement || 'inside_menus', bebidas_web_placement: sidebarResponse.bebidas_web_placement || 'inside_menus',
}
const menus = {}
await Promise.all(sidebar.menus.map(async (item) => {
  const response = await getJson(`/api/menus/${item.id}`)
  const menu = { ...ssr.normalizePublicMenu(response.menu), slug: response.menu.slug || item.slug || '' }
  if (menu.active && menu.menu_public_active !== false) menus[String(menu.id)] = menu
}))
const homeMenus = homeResponse.menus || []
const groupMenus = (groupResponse.menus || []).map((menu) => ({
  ...menu,
  slug: menus[String(menu.id)]?.slug || menu.slug,
  seo_slug: menus[String(menu.id)]?.seo_slug || menu.seo_slug,
}))
const postres = postresResponse.postres || []
const cafes = cafesResponse.items || []
const bebidas = bebidasResponse.items || []
const vinos = { TINTO: tintoResponse.vinos || [] }
const legalPages = Object.fromEntries(legalResponses.map((page) => [page.slug, page]))

const redirects = { '/index.php': '/', '/reservas.php': '/reservas', '/avisolegal.html': '/avisolegal', '/protecciondatos.html': '/protecciondatos', '/booking_policies.php': '/booking-policies', '/reservas-especiales-politica.html': '/reservas-especiales-politica', '/menudegrupos': '/menusdegrupos', '/menudegrupos.php': '/menusdegrupos', '/menusdegrupos.php': '/menusdegrupos', '/datos-busquedas-restaurante': '/' }
const conventionalMenus = Object.values(menus).filter((menu) => menu.menu_type === 1 && menu.active)
const legacyMenus = {
  DIA: conventionalMenus.find((menu) => String(menu.legacy_source_table || '').toUpperCase() === 'DIA') || conventionalMenus.find((menu) => menu.slug === 'menu-del-dia-41'),
  FINDE: conventionalMenus.find((menu) => String(menu.legacy_source_table || '').toUpperCase() === 'FINDE') || conventionalMenus.find((menu) => menu.slug === 'menu-fin-de-semana-42'),
}
for (const menu of Object.values(menus)) {
  const target = ssr.menuPath(menu)
  // The ID is stable; preserve both legacy forms when an SEO slug is set.
  if (menu.slug || menu.seo_slug) redirects[`/menu/${menu.id}`] = target
  if (menu.slug && menu.seo_slug) redirects[`/menu/${menu.id}/${encodeURIComponent(menu.slug)}`] = target
}
for (const [source, menu] of Object.entries(legacyMenus)) {
  if (!menu) continue
  const target = ssr.menuPath(menu)
  const path = source === 'DIA' ? '/menudeldia' : '/menufindesemana'
  redirects[path] = target
  redirects[`${path}.php`] = target
}
const withEnglish = Object.fromEntries(Object.entries(redirects).flatMap(([from, to]) => [[from, to], [`/en${from}`, `/en${to === '/' ? '' : to}`]]))
const baseData = { menus, sidebar, redirects: withEnglish }
const foodActive = { '/postres': sidebar.postres_page_active, '/vinos': sidebar.vinos_page_active, '/cafes': sidebar.cafe_page_active, '/bebidas': sidebar.bebidas_page_active }
const routes = ssr.PUBLIC_ROUTES.filter((route) => foodActive[route.path] !== false)
const editorialPaths = routes.filter((route) => route.prerender).flatMap((route) => route.localized ? [route.path, `/en${route.path === '/' ? '' : route.path}`] : [route.path])
const menuPaths = Object.values(menus).flatMap((menu) => {
  const path = ssr.menuPath(menu)
  return [path, `/en${path}`]
})
const paths = [...new Set([...editorialPaths, ...menuPaths])]
const barePath = (path) => path === '/en' ? '/' : path.startsWith('/en/') ? path.slice(3) : path

const renderedPaths = new Set(paths)
const htmlFor = (path, body, head, pageData) => {
  const lang = path === '/en' || path.startsWith('/en/') ? 'en' : 'es'
  const bootstrap = JSON.stringify(pageData).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
  return template.replace('<html lang="es">', `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, '').replace(/<meta\s+name="description"[\s\S]*?\/>/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="app"></div>', `<div id="app">${body}</div>`)
    .replace('<script type="module"', `<script>window.__VILLACARMEN_DATA__=${bootstrap}</script>\n    <script type="module"`)
}

for (const path of paths) {
  const bare = barePath(path)
  const menu = Object.values(menus).find((item) => ssr.menuPath(item) === bare)
  const isGroup = bare === '/menusdegrupos'
  const legalSlug = legalSlugs[bare]
  const pageData = {
    ...baseData,
    menus: menu ? { [menu.id]: menu } : isGroup || bare === '/arroces-y-paellas' ? menus : {},
    homeMenus: bare === '/' ? homeMenus : undefined,
    groupMenus: isGroup ? groupMenus : undefined,
    postres: bare === '/postres' ? postres : undefined,
    cafes: bare === '/cafes' ? cafes : undefined,
    bebidas: bare === '/bebidas' ? bebidas : undefined,
    vinos: bare === '/vinos' ? vinos : undefined,
    legalPages: legalSlug ? { [legalSlug]: legalPages[legalSlug] } : undefined,
  }
  const body = ssr.renderPage(path, pageData)
  const head = ssr.renderHead(path)
  const html = htmlFor(path, body, head, pageData)
  const output = join(dist, path === '/' ? 'index.html' : `${path.replace(/^\//, '')}/index.html`)
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, html)
}

const notFoundData = { ...baseData, menus: {} }
const notFound = ssr.renderPage('/404', notFoundData)
const notFoundHead = ssr.renderHead('/404')
const notFoundHtml = htmlFor('/404', notFound, notFoundHead, notFoundData)
await writeFile(join(dist, '404.html'), notFoundHtml)
await writeFile(join(dist, 'gone.html'), notFoundHtml)

// Dynamic/private pages still need correct metadata before hydration. Keep
// their shell at the root; the backend serves it only for manifest app paths.
const appPaths = routes.flatMap((route) => route.localized ? [route.path, `/en${route.path === '/' ? '' : route.path}`] : [route.path])
const dynamicPaths = [...new Set([...appPaths, ...menuPaths])].filter((path) => !renderedPaths.has(path))
for (const path of dynamicPaths) {
  const bare = barePath(path)
  const pageData = { ...baseData, menus: bare.startsWith('/menu/') ? menus : {} }
  // Booking-management views intentionally remain client-rendered: some read
  // their private token from window.location during render. Their noindex head
  // does not require executing that interactive code during the build.
  const route = ssr.PUBLIC_ROUTES.find((item) => item.path === bare)
  const body = route && !route.prerender ? '' : ssr.renderPage(path, pageData)
  const head = ssr.renderHead(path)
  const output = join(dist, `${path.replace(/^\//, '')}/index.html`)
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, htmlFor(path, body, head, pageData))
}
const indexablePaths = paths.filter((path) => !ssr.PUBLIC_ROUTES.some((route) => !route.indexable && (path === route.path || path === `/en${route.path}`)))
const absolute = (value) => `${ssr.SITE_ORIGIN}${value}`
const urlEntries = indexablePaths.map((path) => {
  const es = barePath(path)
  const en = `/en${es === '/' ? '' : es}`
  return `  <url><loc>${absolute(path)}</loc><xhtml:link rel="alternate" hreflang="es" href="${absolute(es)}"/><xhtml:link rel="alternate" hreflang="en" href="${absolute(en)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${absolute(es)}"/></url>`
}).join('\n')
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlEntries}\n</urlset>\n`)
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ssr.SITE_ORIGIN}/sitemap.xml\n`)
await writeFile(join(dist, 'seo-routes.json'), JSON.stringify({ redirects: withEnglish, gonePaths: [...ssr.GONE_PATHS, ...ssr.GONE_PATHS.map((path) => `/en${path}`)], menuPaths: Object.fromEntries(Object.values(menus).map((menu) => [menu.id, ssr.menuPath(menu)])), appPaths }, null, 2))
console.log(`[prerender] rendered ${paths.length} pages, ${Object.keys(menus).length} menus, ${indexablePaths.length} sitemap URLs`)

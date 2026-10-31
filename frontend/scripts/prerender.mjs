import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { geoManifest, llmsFiles, markdownDocument, markdownPath } from './lib/public-geo.mjs'

const dist = new URL('../dist/', import.meta.url).pathname
const repository = new URL('../../', import.meta.url).pathname
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

const redirects = { '/index.php': '/', '/reservas.php': '/reservas', '/avisolegal.html': '/avisolegal', '/protecciondatos.html': '/protecciondatos', '/booking_policies.php': '/booking-policies', '/reservas-especiales-politica.html': '/reservas-especiales-politica', '/menudegrupos': '/menusdegrupos', '/menudegrupos.php': '/menusdegrupos', '/menusdegrupos.php': '/menusdegrupos' }
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
const seasonalMenus = Object.values(menus).filter((menu) => menu.menu_type === 6 && menu.active)
const menuText = (menu) => `${menu.menu_title || ''} ${menu.slug || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const seasonalLegacyMenus = {
  menuNavidad: seasonalMenus.find((menu) => menu.slug === 'menu-navidad-50') || seasonalMenus.find((menu) => menuText(menu).includes('navidad') && !menuText(menu).includes('grupo')),
  menuNochevieja: seasonalMenus.find((menu) => menuText(menu).includes('nochevieja')),
}
const retiredLegacyPaths = []
for (const [source, menu] of Object.entries({ ...legacyMenus, ...seasonalLegacyMenus })) {
  const path = source === 'DIA' ? '/menudeldia' : source === 'FINDE' ? '/menufindesemana' : `/${source}`
  if (!menu) {
    retiredLegacyPaths.push(path, `${path}.php`)
    continue
  }
  const target = ssr.menuPath(menu)
  redirects[path] = target
  redirects[`${path}.php`] = target
}
if (sidebar.postres_page_active) redirects['/confpostres.php'] = '/postres'
else retiredLegacyPaths.push('/confpostres.php')
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
const renderedBodies = new Map()
const gitDate = (file) => {
  try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', `frontend/${file}`], { cwd: repository, encoding: 'utf8' }).trim() }
  catch { return '' }
}
const editorialDates = new Map([
  ['/', gitDate('src/routes/client/Home.tsx')],
  ['/contacto', gitDate('src/routes/client/Contacto.tsx')],
  ['/arroces-y-paellas', gitDate('src/lib/editorialContent.ts')],
  ['/guia-arroces-valencianos', gitDate('src/lib/editorialContent.ts')],
  ['/checklist-celebraciones', gitDate('src/lib/celebrationContent.ts')],
  ['/restaurante-albufera-catarroja', gitDate('src/lib/resourceContent.ts')],
  ['/eventos', gitDate('src/routes/client/Eventos.tsx')],
  ['/bodas', gitDate('src/routes/client/CelebrationLanding.tsx')],
  ['/comuniones', gitDate('src/routes/client/CelebrationLanding.tsx')],
  ['/bautizos', gitDate('src/lib/celebrationContent.ts')],
  ['/eventos-empresa', gitDate('src/lib/celebrationContent.ts')],
  ['/menusdegrupos', gitDate('src/routes/client/GroupLanding.tsx')],
  ['/postres', gitDate('src/routes/client/Postres.tsx')],
  ['/cafes', gitDate('src/routes/client/Cafes.tsx')],
  ['/bebidas', gitDate('src/routes/client/Bebidas.tsx')],
  ['/vinos', gitDate('src/routes/client/Vinos.tsx')],
])
const dateOnly = (value) => String(value || '').slice(0, 10)
const newest = (...dates) => dates.map(dateOnly).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort().at(-1) || gitDate('src/lib/routes.ts')
const lastModified = ({ bare, menu, legalPage }) => newest(
  editorialDates.get(bare),
  menu?.modified_at,
  legalPage?.updatedAt,
  bare === '/arroces-y-paellas' || bare === '/guia-arroces-valencianos'
    ? [41, 42, 1].map((id) => menus[String(id)]?.modified_at)
    : '',
)
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
    // Special menus also embed the other seasonal menus so special_menu_practical_v1 can link them.
    menus: menu ? (seasonalMenus.includes(menu) ? Object.fromEntries(seasonalMenus.map((item) => [item.id, item])) : { [menu.id]: menu }) : isGroup || bare === '/arroces-y-paellas' || bare === '/guia-arroces-valencianos' ? menus : {},
    homeMenus: bare === '/' ? homeMenus : undefined,
    groupMenus: isGroup ? groupMenus : undefined,
    postres: bare === '/postres' ? postres : undefined,
    cafes: bare === '/cafes' ? cafes : undefined,
    bebidas: bare === '/bebidas' ? bebidas : undefined,
    vinos: bare === '/vinos' ? vinos : undefined,
    legalPages: legalSlug ? { [legalSlug]: legalPages[legalSlug] } : undefined,
  }
  const body = ssr.renderPage(path, pageData)
  renderedBodies.set(path, body)
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
  // their private token from window.location during render. Render their public
  // layout separately so the footer and internal links still exist in the
  // served HTML; only the private route content waits for hydration.
  const route = ssr.PUBLIC_ROUTES.find((item) => item.path === bare)
  const body = route && !route.prerender
    ? route.path === '/backoffice' ? '' : ssr.renderPublicShell(route.localized ? path : route.path, pageData)
    : ssr.renderPage(path, pageData)
  const head = ssr.renderHead(path)
  if (ssr.publicMarkdownPaths().includes(path)) renderedBodies.set(path, body)
  const output = join(dist, `${path.replace(/^\//, '')}/index.html`)
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, htmlFor(path, body, head, pageData))
}
const indexablePaths = paths.filter((path) => !ssr.PUBLIC_ROUTES.some((route) => !route.indexable && (path === route.path || path === `/en${route.path}`)))
// Only pages actually rendered in this build plus the public booking start page.
// Inactive dishes and private/token-driven flows must never leak into llms.txt.
const markdownPaths = [...new Set([...paths, ...ssr.publicMarkdownPaths().filter((path) => barePath(path) === '/reservas')])]
const absolute = (value) => `${ssr.SITE_ORIGIN}${value}`
const geoEntries = geoManifest({
  paths: markdownPaths, pages: Object.fromEntries(renderedBodies), menus, legalPages,
  ssr: { ...ssr, barePath, legalSlugs }, lastModified,
})
const indexableGeoEntries = geoEntries.filter((entry) => indexablePaths.includes(entry.path))
for (const entry of geoEntries) {
  if (!entry.body) throw new Error(`[geo] ${entry.path} has no rendered Markdown body`)
  const output = join(dist, markdownPath(entry.path).replace(/^\//, ''))
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, markdownDocument(entry))
}
const llms = llmsFiles(geoEntries)
await writeFile(join(dist, 'llms.txt'), llms.summary)
const urlEntries = indexableGeoEntries.map((entry) => {
  const es = barePath(entry.path)
  const en = `/en${es === '/' ? '' : es}`
  // lastmod is optional; an empty element is an invalid W3C date for Google.
  const lastmod = entry.lastModified ? `<lastmod>${entry.lastModified}</lastmod>` : ''
  return `  <url><loc>${absolute(entry.path)}</loc>${lastmod}<xhtml:link rel="alternate" hreflang="es" href="${absolute(es)}"/><xhtml:link rel="alternate" hreflang="en" href="${absolute(en)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${absolute(es)}"/></url>`
}).join('\n')
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlEntries}\n</urlset>\n`)
// Public documentation is deliberately available to search and AI crawlers.
// Private/backoffice and noindex booking flows are not added to any index.
const aiCrawlers = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent']
const robots = [
  'User-agent: *', 'Allow: /', 'Disallow: /backoffice', 'Disallow: /downloads/', '',
  ...aiCrawlers.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', 'Disallow: /backoffice', 'Disallow: /downloads/', '']),
  `Sitemap: ${ssr.SITE_ORIGIN}/sitemap.xml`,
  `# Generative-engine index with canonical HTML and per-page Markdown links: ${ssr.SITE_ORIGIN}/llms.txt`,
  '',
].join('\n')
await writeFile(join(dist, 'robots.txt'), robots)
await writeFile(join(dist, 'seo-routes.json'), JSON.stringify({ lastModified: Object.fromEntries(geoEntries.map((entry) => [entry.path, entry.lastModified])), markdownPaths: Object.fromEntries(geoEntries.map((entry) => [entry.path, markdownPath(entry.path)])), redirects: withEnglish, gonePaths: [...new Set([...ssr.GONE_PATHS, ...retiredLegacyPaths])].flatMap((path) => [path, `/en${path}`]), menuPaths: Object.fromEntries(Object.values(menus).map((menu) => [menu.id, ssr.menuPath(menu)])), groupMenuPaths: Object.fromEntries(groupMenus.filter((menu) => menus[String(menu.id)]).map((menu) => [menu.id, ssr.menuPath(menu)])), appPaths }, null, 2))
console.log(`[prerender] rendered ${paths.length} pages, ${Object.keys(menus).length} menus, ${indexablePaths.length} sitemap URLs and ${geoEntries.length} Markdown alternatives`)

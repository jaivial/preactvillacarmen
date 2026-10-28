import { createServer } from 'node:http'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const dist = new URL('../dist/', import.meta.url).pathname
const origin = 'https://www.alqueriavillacarmen.com'
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
const one = (html, pattern) => (html.match(pattern) || []).length
const cleanPath = (path) => path.length > 1 ? path.replace(/\/+$/, '') : path
const text = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ').replace(/\s+/g, ' ').trim()
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([:\w-]+)=(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1], m[2] ?? m[3]]))
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => attrs(m[0]))
const localPath = (url) => cleanPath(new URL(url, origin).pathname)
async function filesBelow(directory) {
  const out = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...await filesBelow(path))
    else out.push(path)
  }
  return out
}
const files = await filesBelow(dist)
const htmlFiles = files.filter((file) => file.endsWith('.html') && !file.endsWith('/gone.html'))
const pages = new Map()
for (const file of htmlFiles) {
  const rel = relative(dist, file).replaceAll('\\', '/')
  const path = rel === 'index.html' ? '/' : rel === '404.html' ? '/404' : `/${rel.replace(/\/index\.html$/, '')}`
  pages.set(path, { file, html: await readFile(file, 'utf8') })
}
const routeManifest = JSON.parse(await readFile(join(dist, 'seo-routes.json'), 'utf8'))
const footerInternalPaths = [
  '/arroces-y-paellas', '/menusdegrupos', '/eventos', '/bodas', '/comuniones',
  '/eventos-empresa', '/guia-arroces-valencianos', '/checklist-celebraciones',
  '/contacto', '/reservas',
]
const redirectPaths = new Set(Object.keys(routeManifest.redirects).map((path) => cleanPath(path)))
const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8')
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => localPath(m[1]))
check(new Set(sitemapPaths).size === sitemapPaths.length, 'sitemap.xml: duplicate URLs')
const sitemapSet = new Set(sitemapPaths)
for (const [source, target] of [['/datos-busquedas-restaurante', '/'], ['/en/datos-busquedas-restaurante', '/en']]) {
  check(routeManifest.redirects[source] === target, `${source}: private Search Console report must redirect to ${target}`)
  check(!pages.has(source), `${source}: retired public report HTML is still generated`)
  check(!sitemapSet.has(source), `${source}: retired public report is still in sitemap`)
}
check(!files.includes(join(dist, 'downloads/villa-carmen-search-demand-2026-04-23_2026-10-22.csv')), 'private Search Console CSV is still publicly downloadable')
for (const source of ['/menudeldia.php', '/menusdegrupos.php', '/menuNavidad.php', '/menufindesemana.php', '/menudegrupos.php', '/menuNochevieja.php', '/index.php', '/reservas.php']) {
  check(!!routeManifest.redirects[source], `${source}: missing explicit legacy Preact destination`)
}
for (const source of ['/menusanvalentin.php', '/regala.php', '/configuracion.php', '/confpostres.php']) {
  check(routeManifest.gonePaths.includes(source) || !!routeManifest.redirects[source], `${source}: missing explicit 410 or equivalent destination`)
  check(!(routeManifest.gonePaths.includes(source) && routeManifest.redirects[source]), `${source}: cannot be both 410 and redirected`)
}
const titles = new Map()
const descriptions = new Map()
const alternateOwners = new Map()
for (const [path, { html }] of pages) {
  if (path === '/gone') continue
  const isPublicPage = !path.startsWith('/backoffice') && !path.startsWith('/downloads/')
  if (isPublicPage) {
    check(one(html, /<footer\b/gi) === 1, `${path}: expected exactly one footer in served HTML`)
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] || ''
    check(one(footer, /<nav\b[^>]*class="[^"]*footer-nav/gi) === 1, `${path}: footer navigation must be prerendered`)
    const langPrefix = path === '/en' || path.startsWith('/en/') ? '/en' : ''
    for (const target of footerInternalPaths) {
      check(tags(footer, 'a').some((anchor) => anchor.href === `${langPrefix}${target}`), `${path}: missing prerendered footer link ${langPrefix}${target}`)
    }
  }
  const lang = html.match(/<html\b[^>]*\blang="([^"]+)"/i)?.[1]
  const validLanguage = path.startsWith('/downloads/') ? lang === 'es' || lang === 'en' : lang === (path === '/en' || path.startsWith('/en/') ? 'en' : 'es')
  check(validLanguage, `${path}: wrong html lang (${lang})`)
  const titleCount = one(html, /<title\b/gi)
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || ''
  const descriptionTags = tags(html, 'meta').filter((a) => a.name === 'description')
  const robotTags = tags(html, 'meta').filter((a) => a.name === 'robots')
  const canonicalTags = tags(html, 'link').filter((a) => a.rel === 'canonical')
  const description = descriptionTags[0]?.content?.trim() || ''
  const robots = robotTags[0]?.content || ''
  const canonical = canonicalTags[0]?.href || ''
  const indexable = !robots.includes('noindex')
  check(titleCount === 1 && !!title, `${path}: expected one non-empty title, got ${titleCount}`)
  check(descriptionTags.length === 1 && !!description, `${path}: expected one non-empty description, got ${descriptionTags.length}`)
  check(robotTags.length === 1, `${path}: expected one robots directive, got ${robotTags.length}`)
  check(canonicalTags.length === 1, `${path}: expected one canonical, got ${canonicalTags.length}`)
  check(canonical === `${origin}${path === '/' ? '/' : path}`, `${path}: canonical mismatch (${canonical})`)
  if (indexable) {
    check(one(html, /<h1\b/gi) === 1, `${path}: expected exactly one H1 in source HTML`)
    check(sitemapSet.has(path), `${path}: indexable page missing from sitemap`)
    check(!!description && !!title, `${path}: indexable page has empty metadata`)
    if (title) {
      check(!titles.has(title), `${path}: duplicate indexable title also used by ${titles.get(title)}`)
      titles.set(title, path)
    }
    if (description) {
      check(!descriptions.has(description), `${path}: duplicate indexable description also used by ${descriptions.get(description)}`)
      descriptions.set(description, path)
    }
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || ''
    check(text(main).length >= 120, `${path}: insufficient main text in source HTML`)
  } else {
    check(!sitemapSet.has(path), `${path}: noindex page included in sitemap`)
  }
  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const value = JSON.parse(match[1])
      check(!!value && typeof value === 'object', `${path}: JSON-LD is not an object/graph`)
    } catch (error) { failures.push(`${path}: invalid JSON-LD: ${error.message}`) }
  }
  if (!indexable) check(!/application\/ld\+json/.test(html), `${path}: private/noindex page exposes public JSON-LD`)
  const alternates = tags(html, 'link').filter((a) => a.rel === 'alternate' && a.hreflang)
  if (indexable) {
    check(alternates.length === 3, `${path}: expected es/en/x-default alternates, got ${alternates.length}`)
    const byLang = Object.fromEntries(alternates.map((a) => [a.hreflang, a.href]))
    const bare = path === '/en' ? '/' : path.startsWith('/en/') ? path.slice(3) : path
    const en = `/en${bare === '/' ? '' : bare}`
    check(localPath(byLang.es) === bare, `${path}: incorrect es alternate`)
    check(localPath(byLang.en) === en, `${path}: incorrect en alternate`)
    check(localPath(byLang['x-default']) === bare, `${path}: incorrect x-default alternate`)
    for (const alternate of alternates) {
      const target = localPath(alternate.href)
      alternateOwners.set(`${path}:${alternate.hreflang}`, target)
      check(pages.has(target), `${path}: alternate ${alternate.hreflang} has no generated page (${target})`)
    }
  } else check(alternates.length === 0, `${path}: noindex page has hreflang alternates`)
  for (const anchor of tags(html, 'a')) {
    if (!anchor.href || /^(?:[a-z]+:|\/\/|#)/i.test(anchor.href)) continue
    const target = localPath(anchor.href)
    check(pages.has(target) || redirectPaths.has(target) || target === '/en/404' || files.includes(join(dist, target.replace(/^\//, ''))), `${path}: broken internal link ${anchor.href}`)
  }
}
for (const path of sitemapPaths) check(pages.has(path), `sitemap URL has no generated HTML: ${path}`)
for (const [owner, target] of alternateOwners) {
  if (owner.endsWith(':es')) {
    const source = owner.slice(0, owner.lastIndexOf(':'))
    const expectedEnglish = source === '/' ? '/en' : `/en${source}`
    if (target === expectedEnglish) check(alternateOwners.get(`${target}:en`) === source, `${source}: non-reciprocal hreflang with ${target}`)
  }
}
for (const [source, target] of Object.entries(routeManifest.redirects)) {
  check(source !== target, `${source}: redirect points to itself`)
  check(pages.has(localPath(target)), `${source}: redirect destination has no HTML (${target})`)
}
check(!!routeManifest.gonePaths?.length, 'seo-routes.json: no legacy 410 paths')
check(pages.has('/404'), 'missing generated 404.html')

const mime = { '.html': 'text/html; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }
const fileFor = (path) => {
  if (path === '/') return join(dist, 'index.html')
  const clean = cleanPath(decodeURIComponent(path))
  const direct = join(dist, clean.replace(/^\//, ''))
  if (files.includes(direct)) return direct
  const nested = join(dist, clean.replace(/^\//, ''), 'index.html')
  return files.includes(nested) ? nested : null
}
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://local').pathname
  if (routeManifest.redirects[path]) { res.writeHead(301, { Location: routeManifest.redirects[path] }); res.end(); return }
  const gone = routeManifest.gonePaths.includes(path)
  const file = gone ? join(dist, 'gone.html') : fileFor(path)
  if (!file) { res.writeHead(404, { 'Content-Type': mime['.html'] }); res.end(pages.get('/404').html); return }
  res.writeHead(gone ? 410 : 200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
  res.end(cache.get(file))
})
const cache = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file)])))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
async function request(originBase, path, expectedStatus, expectedType) {
  const response = await fetch(`${originBase}${path}`, { redirect: 'manual' })
  check(response.status === expectedStatus, `${originBase}${path}: HTTP ${response.status}, expected ${expectedStatus}`)
  if (expectedType) check((response.headers.get('content-type') || '').includes(expectedType), `${path}: Content-Type ${response.headers.get('content-type')}, expected ${expectedType}`)
  await response.arrayBuffer()
  return response
}
try {
  await request(base, '/robots.txt', 200, 'text/plain')
  await request(base, '/sitemap.xml', 200, 'application/xml')
  await request(base, '/__seo_missing_route__', 404, 'text/html')
  await request(base, routeManifest.gonePaths[0], 410, 'text/html')
  for (const [source, target] of Object.entries(routeManifest.redirects)) {
    const response = await request(base, source, 301)
    check(response.headers.get('location') === target, `${source}: Location ${response.headers.get('location')}, expected ${target}`)
  }
  for (const path of sitemapPaths) await request(base, path, 200, 'text/html')
  if (process.env.SEO_VERIFY_ORIGIN) {
    const live = process.env.SEO_VERIFY_ORIGIN.replace(/\/$/, '')
    await request(live, '/robots.txt', 200, 'text/plain')
    await request(live, '/sitemap.xml', 200, 'xml')
    await request(live, '/__seo_missing_route__', 404, 'text/html')
    for (const [source, target] of Object.entries(routeManifest.redirects)) {
      const response = await request(live, source, 301)
      check(response.headers.get('location') === target, `${live}${source}: incorrect production Location`)
    }
  }
} finally { await new Promise((resolve) => server.close(resolve)) }
if (failures.length) {
  console.error(`SEO checks failed (${failures.length}):\n${failures.map((item, index) => `${index + 1}. ${item}`).join('\n')}`)
  process.exit(1)
}
console.log(`SEO checks passed: ${pages.size} HTML routes, ${sitemapPaths.length} sitemap URLs, ${Object.keys(routeManifest.redirects).length} redirects, reciprocal hreflang, source content, JSON-LD, MIME, 404/410 and internal links.`)

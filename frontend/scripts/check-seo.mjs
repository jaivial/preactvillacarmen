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
  '/bautizos', '/eventos-empresa', '/guia-arroces-valencianos', '/checklist-celebraciones',
  '/contacto', '/reservas',
]
const redirectPaths = new Set(Object.keys(routeManifest.redirects).map((path) => cleanPath(path)))
const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8')
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => localPath(m[1]))
check(new Set(sitemapPaths).size === sitemapPaths.length, 'sitemap.xml: duplicate URLs')
const sitemapSet = new Set(sitemapPaths)
const sitemapEntries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1])
check(sitemapEntries.length === sitemapPaths.length, 'sitemap.xml: every URL must have one complete entry')
for (const entry of sitemapEntries) {
  const url = entry.match(/<loc>([^<]+)<\/loc>/)?.[1] || ''
  check(new URL(url).origin === origin, `sitemap.xml: non-canonical origin ${url}`)
  const lastmod = entry.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1]
  const validDate = lastmod && /^\d{4}-\d{2}-\d{2}$/.test(lastmod) && new Date(`${lastmod}T00:00:00Z`).toISOString().slice(0, 10) === lastmod
  check(!entry.includes('<lastmod') || validDate, `${url}: empty/invalid lastmod`)
  const languages = [...entry.matchAll(/<xhtml:link\b[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)]
  check(languages.length === 3, `${url}: expected three sitemap alternates`)
  check(languages.some((match) => match[1] === 'es' && new URL(match[2]).origin === origin), `${url}: missing www Spanish alternate`)
  check(languages.some((match) => match[1] === 'en' && new URL(match[2]).origin === origin), `${url}: missing www English alternate`)
  check(!/\.php(?:$|[?#])|\.md(?:$|[?#])/.test(url), `${url}: legacy or Markdown URL in HTML sitemap`)
}
const robots = await readFile(join(dist, 'robots.txt'), 'utf8')
for (const crawler of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent']) {
  check(new RegExp(`User-agent: ${crawler}\\nAllow: /`).test(robots), `robots.txt: ${crawler} is not explicitly allowed`)
}
check(robots.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt: missing canonical sitemap URL')
check(!/User-agent: [^\n]+\nDisallow: \/\n/.test(robots), 'robots.txt: an AI crawler is blocked')
const llms = await readFile(join(dist, 'llms.txt'), 'utf8')
check(!files.includes(join(dist, 'llms-full.txt')), 'llms-full.txt: remove the stale duplicate full-body index')
for (const path of Object.keys(routeManifest.markdownPaths)) {
  check(!path.startsWith('/reservas/') && !['/confirm', '/cancel', '/update-rice', '/baja-publicidad', '/backoffice'].includes(path), `${path}: private route has public Markdown`)
}
for (const path of ['/reservas', '/en/reservas']) check(!!routeManifest.markdownPaths[path], `${path}: public booking start page is missing Markdown`)
for (const path of sitemapPaths) {
  const markdownPath = routeManifest.markdownPaths[path]
  check(!!markdownPath, `${path}: missing Markdown manifest entry`)
  if (!markdownPath) continue
  const markdownFile = join(dist, markdownPath.replace(/^\//, ''))
  check(files.includes(markdownFile), `${path}: missing generated Markdown ${markdownPath}`)
  if (!files.includes(markdownFile)) continue
  const markdown = await readFile(markdownFile, 'utf8')
  check(markdown.includes(`canonical: ${origin}${path === '/' ? '/' : path}`), `${markdownPath}: incorrect HTML canonical`)
  check(markdown.includes('robots: noindex, follow'), `${markdownPath}: Markdown is not noindex`)
  const lastmod = markdown.match(/^lastmod: (.+)$/m)?.[1]
  check(!/^lastmod:\s*$/m.test(markdown) && (!lastmod || /^\d{4}-\d{2}-\d{2}$/.test(lastmod)), `${markdownPath}: empty/invalid lastmod`)
  check(text(markdown).length >= 120, `${markdownPath}: insufficient public content`)
  check(llms.includes(`${origin}${markdownPath}`), `${markdownPath}: not linked from llms.txt`)
  check((routeManifest.lastModified[path] || undefined) === lastmod, `${markdownPath}: lastmod differs from sitemap source`)
  if (['/arroces-y-paellas', '/guia-arroces-valencianos', '/en/arroces-y-paellas', '/en/guia-arroces-valencianos'].includes(path)) {
    check(markdown.includes('<!--vc-active-rice-markdown:start-->') && markdown.includes('<!--vc-active-rice-markdown:end-->'), `${markdownPath}: missing live menu refresh markers`)
    const prefix = path.startsWith('/en/') ? '/en' : ''
    for (const menu of ['menu-del-dia', 'menu-fin-de-semana', 'menu-arrocero']) check(markdown.includes(`${origin}${prefix}/menu/${menu}`), `${markdownPath}: missing active menu backlink ${menu}`)
  }
  if (path === '/en') check(/lang: en/.test(markdown), '/en/index.md: wrong language')
  if (path === '/') check(/lang: es/.test(markdown), '/index.md: wrong language')
}
for (const source of ['/datos-busquedas-restaurante', '/en/datos-busquedas-restaurante']) {
  check(routeManifest.gonePaths.includes(source), `${source}: retired public report must return 410`)
  check(!routeManifest.redirects[source], `${source}: retired public report must not redirect`)
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
const groupMenuPaths = routeManifest.groupMenuPaths || {}
check(Object.keys(groupMenuPaths).length > 0, 'menusdegrupos: no active group-menu SEO routes in manifest')
for (const [id, path] of Object.entries(groupMenuPaths)) {
  check(routeManifest.menuPaths[id] === path, `menusdegrupos?menu=${id}: destination differs from canonical menu path`)
  for (const localized of [path, `/en${path}`]) {
    check(sitemapSet.has(localized), `${localized}: active group-menu SEO URL missing from sitemap`)
    check(!!routeManifest.markdownPaths[localized], `${localized}: active group-menu Markdown missing`)
  }
}
const groupLanding = pages.get('/menusdegrupos')?.html || ''
check(!groupLanding.includes('menusdegrupos-picker'), 'menusdegrupos: obsolete numeric tab picker is still rendered')
for (const match of groupLanding.matchAll(/(?:src|srcset)="([^"]+)"/gi)) {
  for (const candidate of match[1].split(',')) {
    const url = candidate.trim().split(/\s+/)[0]
    if (url.startsWith('/images/group-menus/')) check(files.includes(join(dist, url.split('?')[0].slice(1))), `menusdegrupos: missing responsive image ${url}`)
  }
}
const titles = new Map()
const descriptions = new Map()
const alternateOwners = new Map()
const webManifest = JSON.parse(await readFile(join(dist, 'site.webmanifest'), 'utf8'))
check(webManifest.icons.some((icon) => icon.src === '/favicons/favicon-192x192.png' && icon.sizes === '192x192'), 'site.webmanifest: missing 192px icon')
check(webManifest.icons.some((icon) => icon.src === '/favicons/favicon-512x512.png' && icon.sizes === '512x512'), 'site.webmanifest: missing 512px icon')
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
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || html
  const links = tags(head, 'link')
  const favicons = links.filter((link) => link.rel?.split(/\s+/).includes('icon'))
  check(favicons.some((link) => link.href === '/favicon.ico'), `${path}: missing ICO favicon`)
  check(favicons.some((link) => link.type === 'image/svg+xml' && link.href === '/favicons/favicon.svg'), `${path}: missing SVG favicon`)
  for (const size of [16, 32, 192, 512]) {
    check(favicons.some((link) => link.type === 'image/png' && link.sizes === `${size}x${size}` && link.href === `/favicons/favicon-${size}x${size}.png`), `${path}: missing ${size}px PNG favicon`)
  }
  check(links.some((link) => link.rel === 'apple-touch-icon' && link.sizes === '180x180' && link.href === '/favicons/apple-touch-icon.png'), `${path}: missing apple-touch-icon`)
  check(links.filter((link) => link.rel === 'manifest').length === 1 && links.some((link) => link.rel === 'manifest' && link.href === '/site.webmanifest'), `${path}: expected one site.webmanifest link`)
  check(tags(head, 'meta').some((meta) => meta.name === 'theme-color' && meta.content === '#fffdf8'), `${path}: missing light favicon theme color`)
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
  const markdownAlternates = tags(html, 'link').filter((a) => a.rel === 'alternate' && a.type === 'text/markdown')
  if (indexable) {
    check(markdownAlternates.length === 1 && markdownAlternates[0].href === `${origin}${routeManifest.markdownPaths[path]}`, `${path}: expected one text/markdown alternate to its own Markdown`)
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
    check(!/\/menusdegrupos[?&]menu=\d/.test(anchor.href), `${path}: obsolete numeric group-menu link ${anchor.href}`)
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

const mime = { '.html': 'text/html; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }
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
  const headers = { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }
  if (file.endsWith('.md')) headers['X-Robots-Tag'] = 'noindex, follow'
  res.writeHead(gone ? 410 : 200, headers)
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
  await request(base, '/llms.txt', 200, 'text/plain')
  for (const path of ['/index.md', '/en/index.md', '/arroces-y-paellas/index.md', '/en/arroces-y-paellas/index.md', '/menu/menu-fin-de-semana/index.md']) {
    const response = await request(base, path, 200, 'text/markdown')
    check(response.headers.get('x-robots-tag') === 'noindex, follow', `${path}: missing noindex header`)
  }
  await request(base, '/__seo_missing_route__', 404, 'text/html')
  await request(base, routeManifest.gonePaths[0], 410, 'text/html')
  await request(base, '/datos-busquedas-restaurante', 410, 'text/html')
  await request(base, '/en/datos-busquedas-restaurante', 410, 'text/html')
  for (const [source, target] of Object.entries(routeManifest.redirects)) {
    const response = await request(base, source, 301)
    check(response.headers.get('location') === target, `${source}: Location ${response.headers.get('location')}, expected ${target}`)
  }
  for (const path of sitemapPaths) await request(base, path, 200, 'text/html')
  if (process.env.SEO_VERIFY_ORIGIN) {
    const live = process.env.SEO_VERIFY_ORIGIN.replace(/\/$/, '')
    await request(live, '/robots.txt', 200, 'text/plain')
    await request(live, '/sitemap.xml', 200, 'xml')
    await request(live, '/llms.txt', 200, 'text/plain')
    for (const path of ['/index.md', '/en/index.md', '/arroces-y-paellas/index.md', '/en/arroces-y-paellas/index.md', '/menu/menu-fin-de-semana/index.md']) {
      const response = await request(live, path, 200, 'text/markdown')
      check(response.headers.get('x-robots-tag') === 'noindex, follow', `${live}${path}: missing noindex header`)
    }
    await request(live, '/__seo_missing_route__', 404, 'text/html')
    await request(live, '/datos-busquedas-restaurante', 410, 'text/html')
    await request(live, '/en/datos-busquedas-restaurante', 410, 'text/html')
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

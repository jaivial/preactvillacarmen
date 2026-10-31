const DEFAULT_ORIGIN = 'https://www.alqueriavillacarmen.com'
export const ACTIVE_RICE_MARKDOWN_START = '<!--vc-active-rice-markdown:start-->'
export const ACTIVE_RICE_MARKDOWN_END = '<!--vc-active-rice-markdown:end-->'
const editorialRicePaths = new Set(['/arroces-y-paellas', '/guia-arroces-valencianos', '/en/arroces-y-paellas', '/en/guia-arroces-valencianos'])

export function markdownPath(path) {
  return path === '/' ? '/index.md' : `${path.replace(/\/+$/, '')}/index.md`
}

export function absoluteMarkdownUrl(path, origin = DEFAULT_ORIGIN) {
  return new URL(markdownPath(path), origin).href
}

export function plainText(value) {
  return String(value || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ').trim()
}

function safeUrl(value, origin) {
  try {
    const url = new URL(value, origin)
    if (url.origin !== origin) return null
    return url.pathname + url.search + url.hash
  } catch { return null }
}

export function htmlToMarkdown(html, { origin = DEFAULT_ORIGIN } = {}) {
  let value = String(html)
    .replace(/<!--\s*vc-active-rice-menus:start\s*-->/gi, '\n\n@@VC_ACTIVE_RICE_START@@\n\n')
    .replace(/<!--\s*vc-active-rice-menus:end\s*-->/gi, '\n\n@@VC_ACTIVE_RICE_END@@\n\n')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, '')
    .replace(/<header\b[^>]*class=(?:"[^"]*\bheader\b|'[^']*\bheader\b)[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<nav\b[^>]*class=(?:"[^"]*(?:breadcrumbs|navMenuBurger|footer-nav)|'[^']*(?:breadcrumbs|navMenuBurger|footer-nav))[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<(?:button|select|option|textarea|input)\b[^>]*>/gi, '')
    .replace(/<\/(?:button|select|option|textarea)>/gi, '')
  value = value
    .replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => `\n\n${'#'.repeat(Number(level))} ${plainText(content)}\n\n`)
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs, content) => {
      const label = plainText(content)
      const href = attrs.match(/\bhref=(?:"([^"]*)"|'([^']*)')/i)
      const url = href ? safeUrl(href[1] ?? href[2], origin) : null
      return label && url ? `[${label}](${new URL(url, origin).href}) ` : `${label} `
    })
    .replace(/<li\b[^>]*>/gi, '\n- ').replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|main|details|summary|ul|ol|table|tr|blockquote|form|fieldset|h[1-6])>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
  return value.split('\n').map((line) => plainText(line)).filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function geoManifest({ paths, pages, menus, legalPages, ssr, lastModified, origin = DEFAULT_ORIGIN }) {
  return paths.map((path) => {
    const bare = ssr.barePath(path)
    const lang = path === '/en' || path.startsWith('/en/') ? 'en' : 'es'
    const menu = Object.values(menus).find((item) => ssr.menuPath(item) === bare)
    const metadata = ssr.routeMetadata(path, ssr.catalogRoutesFor(menus))
    const legalSlug = ssr.legalSlugs[bare]
    return {
      path,
      lang,
      canonical: new URL(metadata.canonicalPath, origin).href,
      alternate: new URL(ssr.equivalentLanguagePath(metadata.canonicalPath, lang === 'es' ? 'en' : 'es'), origin).href,
      markdown: absoluteMarkdownUrl(path, origin),
      title: metadata.title[lang].split('|')[0].trim(),
      description: metadata.description[lang],
      lastModified: lastModified({ path, bare, menu, legalPage: legalSlug ? legalPages[legalSlug] : undefined }),
      body: path === '/reservas' || path === '/en/reservas' ? publicBookingBody(path) : htmlToMarkdown(pages[path], { origin }),
      menuId: menu?.id,
    }
  })
}

function publicBookingBody(path) {
  const lang = path.startsWith('/en') ? 'en' : 'es'
  return lang === 'es'
    ? '# Reservas en Alquería Villa Carmen\n\nSelecciona fecha, número de personas y completa tu reserva en la [página de reservas](https://www.alqueriavillacarmen.com/reservas). La disponibilidad se consulta en tiempo real; esta representación Markdown no comprueba ni confirma mesas.\n\nNo se admiten reservas por la web para el mismo día. Para mesas de más de 10 comensales se ofrece menú de grupo; consulta los [menús de grupos](https://www.alqueriavillacarmen.com/menusdegrupos) o [contacta con el restaurante](https://www.alqueriavillacarmen.com/contacto) para completar la solicitud. Revisa las condiciones mostradas durante el proceso antes de confirmar.\n\nLa gestión o modificación de una reserva requiere el enlace privado recibido por el cliente y no está incluida en este documento público.'
    : '# Reservations at Alqueria Villa Carmen\n\nSelect a date and number of guests, then complete your reservation on the [booking page](https://www.alqueriavillacarmen.com/en/reservas). Availability is checked live; this Markdown representation neither checks nor confirms tables.\n\nSame-day reservations cannot be made online. A group menu is offered for parties of more than 10 guests; view the [group menus](https://www.alqueriavillacarmen.com/en/menusdegrupos) or [contact the restaurant](https://www.alqueriavillacarmen.com/en/contacto) to complete the request. Review the conditions shown during the process before confirming.\n\nManaging or changing a reservation requires the private link received by the guest and is not included in this public document.'
}

export function markdownDocument(entry) {
  const alternateLanguage = entry.lang === 'es' ? 'en' : 'es'
  const body = editorialRicePaths.has(entry.path)
    ? entry.body.replace('@@VC_ACTIVE_RICE_START@@', ACTIVE_RICE_MARKDOWN_START).replace('@@VC_ACTIVE_RICE_END@@', ACTIVE_RICE_MARKDOWN_END)
    : entry.body
  const lastmod = entry.lastModified ? `lastmod: ${entry.lastModified}\n` : ''
  return `---\ntitle: "${entry.title.replace(/"/g, '\\"')}"\nlang: ${entry.lang}\ncanonical: ${entry.canonical}\nalternate_${alternateLanguage}: ${entry.alternate}\n${lastmod}robots: noindex, follow\n---\n\n> ${entry.lang === 'es' ? 'Representación Markdown; la versión canónica es la página HTML enlazada arriba.' : 'Markdown representation; the linked HTML page above is the canonical version.'}\n\n${body}\n`
}

export function llmsFiles(entries, { origin = DEFAULT_ORIGIN } = {}) {
  const byPath = new Map(entries.map((entry) => [entry.path, entry]))
  const preferred = ['/', '/arroces-y-paellas', '/menusdegrupos', '/eventos', '/bodas', '/comuniones', '/bautizos', '/eventos-empresa', '/guia-arroces-valencianos', '/checklist-celebraciones', '/restaurante-albufera-catarroja', '/contacto', '/reservas', '/avisolegal', '/protecciondatos']
  const list = (lang) => {
    const paths = [...preferred.map((path) => lang === 'en' ? `/en${path === '/' ? '' : path}` : path), ...entries.filter((entry) => entry.lang === lang).map((entry) => entry.path)]
    return [...new Set(paths)].map((path) => byPath.get(path)).filter(Boolean)
  }
  const header = (lang) => lang === 'es'
    ? '# Alquería Villa Carmen\n\n> Restaurante mediterráneo en Catarroja, Valencia. Información pública sobre menús, arroces, celebraciones, contacto y reservas. Los menús, precios, platos y disponibilidad pueden cambiar: consulta siempre la página enlazada antes de decidir. Una solicitud de información no es una reserva.\n\nLa versión canónica de cada contenido es su página HTML; los documentos Markdown son representaciones alternativas para lectores y motores generativos.'
    : '# Alqueria Villa Carmen\n\n> Mediterranean restaurant in Catarroja, Valencia. Public information about menus, rice dishes, celebrations, contact and bookings. Menus, prices, dishes and availability may change: always check the linked page before deciding. An information request is not a booking.\n\nThe canonical version of each item is its HTML page; Markdown documents are alternative representations for readers and generative engines.'
  const lines = (lang) => list(lang).flatMap((entry) => [
    `## ${entry.title}`,
    `- HTML: ${entry.canonical}`,
    `- Markdown: ${entry.markdown}`,
    `- ${entry.description}`,
  ])
  const summary = [header('es'), '## Contenido en español', ...lines('es'), header('en'), '## English content', ...lines('en')].join('\n\n') + '\n'
  return { summary }
}

import assert from 'node:assert/strict'
import test from 'node:test'
import { absoluteMarkdownUrl, geoManifest, htmlToMarkdown, llmsFiles, markdownDocument, markdownPath } from './public-geo.mjs'

test('Markdown URLs keep both language trees outside the HTML sitemap namespace', () => {
  assert.equal(markdownPath('/'), '/index.md')
  assert.equal(markdownPath('/en'), '/en/index.md')
  assert.equal(markdownPath('/menu/menu-fin-de-semana'), '/menu/menu-fin-de-semana/index.md')
  assert.equal(absoluteMarkdownUrl('/bodas'), 'https://www.alqueriavillacarmen.com/bodas/index.md')
})

test('HTML conversion preserves useful content and local links, not breadcrumbs or scripts', () => {
  const markdown = htmlToMarkdown(`<main><h1>Nuestros arroces</h1><nav class="breadcrumbs">Inicio</nav><nav class="editorial-rice-links"><a href="/menu/menu-fin-de-semana">Menú fin de semana</a></nav><section><h2>Arroces</h2><p>Paella valenciana</p><ul><li>Gluten</li><li><a href="/reservas">Reservar</a><a href="/contacto">Contacto</a></li></ul><a href="https://outside.example/no">Externo</a><script>secret()</script></section></main><footer>Legal</footer>`)
  assert.match(markdown, /# Nuestros arroces/)
  assert.match(markdown, /## Arroces/)
  assert.match(markdown, /- Gluten/)
  assert.match(markdown, /\[Reservar\]\(https:\/\/www.alqueriavillacarmen.com\/reservas\)/)
  assert.match(markdown, /\[Menú fin de semana\]\(https:\/\/www.alqueriavillacarmen.com\/menu\/menu-fin-de-semana\)/)
  assert.match(markdown, /\)\s+\[Contacto\]/)
  assert.doesNotMatch(markdown, /secret|Inicio|Legal|outside.example/)
})

test('llms index exposes every entry and its HTML canonical in both languages', () => {
  const ssr = {
    barePath: (path) => path === '/en' ? '/' : path.startsWith('/en/') ? path.slice(3) : path,
    legalSlugs: {}, menuPath: () => '', equivalentLanguagePath: (path, lang) => lang === 'en' ? `/en${path === '/' ? '' : path}` : path,
    catalogRoutesFor: () => [],
    routeMetadata: (path) => ({ canonicalPath: path, title: { es: 'Inicio | Villa Carmen', en: 'Home | Villa Carmen' }, description: { es: 'Descripción', en: 'Description' } }),
  }
  const entries = geoManifest({ paths: ['/', '/en'], pages: { '/': '<h1>Inicio</h1><p>Restaurante</p>', '/en': '<h1>Home</h1><p>Restaurant</p>' }, menus: {}, legalPages: {}, ssr, lastModified: () => '2026-10-28' })
  const files = llmsFiles(entries)
  for (const path of ['/', '/en']) assert.ok(files.summary.includes(`https://www.alqueriavillacarmen.com${path === '/' ? '/index.md' : '/en/index.md'}`))
  assert.equal(entries[0].lastModified, '2026-10-28')
  assert.ok(files.summary.includes('- HTML: https://www.alqueriavillacarmen.com/'))
  assert.equal(files.full, undefined)
})

test('editorial Markdown has live-menu markers and other documents do not', () => {
  const body = htmlToMarkdown('<h1>Arroces</h1><p>Editorial permanente</p><!--vc-active-rice-menus:start--><h2>Nuestros arroces</h2><!--vc-active-rice-menus:end--><h2>Preguntas frecuentes</h2>')
  const base = { title: 'Arroces', lang: 'es', canonical: 'https://www.alqueriavillacarmen.com/arroces-y-paellas', alternate: 'https://www.alqueriavillacarmen.com/en/arroces-y-paellas', lastModified: '2026-10-28', body }
  const editorial = markdownDocument({ ...base, path: '/arroces-y-paellas' })
  assert.match(editorial, /<!--vc-active-rice-markdown:start-->\n\n## Nuestros arroces\n\n<!--vc-active-rice-markdown:end-->/)
  assert.match(editorial, /Editorial permanente[\s\S]*<!--vc-active-rice-markdown:start-->/)
  assert.match(editorial, /<!--vc-active-rice-markdown:end-->[\s\S]*## Preguntas frecuentes/)
  assert.match(editorial, /robots: noindex, follow/)
  assert.doesNotMatch(markdownDocument({ ...base, path: '/eventos', canonical: 'https://www.alqueriavillacarmen.com/eventos' }), /vc-active-rice-markdown/)
})

import { useEffect, useState } from 'preact/hooks'
import { useLocation } from 'wouter-preact'
import { useI18n } from '../lib/i18n'
import { localized, localizedArray } from '../lib/i18n'
import { prerenderData } from '../lib/prerenderData'
import { equivalentLanguagePath, menuPath, PUBLIC_ROUTES, routeMetadata, SITE_ORIGIN, SOCIAL_IMAGE, type MenuRouteEntry } from '../lib/routes'
import { structuredData } from '../lib/structuredData'
import type { PublicMenu } from '../lib/types'
import { menuSEOContent } from '../lib/menuSeoContent'
import { absoluteMarkdownUrl } from '../../scripts/lib/public-geo.mjs'

export function catalogRoutesFor(menus: Record<string, PublicMenu>): MenuRouteEntry[] {
  return Object.values(menus).filter((menu) => menu.active && menu.menu_public_active !== false).map((menu) => {
    return {
      id: menu.id,
      slug: menu.slug || '',
      seo_slug: menu.seo_slug,
      path: menuPath(menu),
      price: menu.price,
      faq: { es: menuSEOContent(menu, 'es').faq, en: menuSEOContent(menu, 'en').faq },
      title: {
        es: menu.seo_title?.trim() || `${menu.menu_title} | Alquería Villa Carmen`,
        en: menu.seo_title_english?.trim() || `${localized(menu.menu_title, menu.menu_title_english, 'en')} | Alqueria Villa Carmen`,
      },
      description: {
        es: menu.seo_description?.trim() || `${menu.menu_title}: ${localizedArray(menu.menu_subtitle, menu.menu_subtitle_english, 'es').filter((line) => line.trim()).join('. ') || 'consulta platos, precios y condiciones'} en Alquería Villa Carmen, Catarroja.`,
        en: menu.seo_description_english?.trim() || `${localized(menu.menu_title, menu.menu_title_english, 'en')}: ${menu.menu_subtitle_english?.filter((line) => line.trim()).join('. ') || 'view dishes, prices and booking conditions'} at Alqueria Villa Carmen in Catarroja.`,
      },
    }
  })
}

export function catalogRoutes(): MenuRouteEntry[] {
  return catalogRoutesFor(prerenderData().menus)
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector)
  if (!element) {
    element = document.createElement(selector.startsWith('link') ? 'link' : 'meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value))
}

export function RouteHead() {
  const [location] = useLocation()
  const [catalogVersion, setCatalogVersion] = useState(0)
  useEffect(() => {
    const update = () => setCatalogVersion((value) => value + 1)
    window.addEventListener('villacarmen:menus-updated', update)
    return () => window.removeEventListener('villacarmen:menus-updated', update)
  }, [])
  const { lang } = useI18n()
  const pathname = lang === 'en' && !location.startsWith('/en') ? `/en${location === '/' ? '' : location}` : location
  const metadata = routeMetadata(pathname, catalogRoutes())
  const canonical = new URL(metadata.canonicalPath, SITE_ORIGIN).href
  const hasPublicMarkdown = metadata.indexable || metadata.canonicalPath === '/reservas'
  const jsonLd = JSON.stringify(structuredData(pathname, catalogRoutes()))

  useEffect(() => {
    document.title = metadata.title[lang]
    document.documentElement.lang = lang
    const values: Record<string, string> = {
      description: metadata.description[lang],
      robots: metadata.indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow',
      'og:title': metadata.title[lang],
      'og:description': metadata.description[lang],
      'og:url': canonical,
      'og:locale': lang === 'es' ? 'es_ES' : 'en_GB',
      'twitter:title': metadata.title[lang],
      'twitter:description': metadata.description[lang],
      'og:type': 'website',
      'og:site_name': 'Alquería Villa Carmen',
      'og:image': SOCIAL_IMAGE,
      'og:image:alt': metadata.title[lang],
      'og:locale:alternate': lang === 'es' ? 'en_GB' : 'es_ES',
      'twitter:card': 'summary_large_image',
      'twitter:image': SOCIAL_IMAGE,
    }
    Object.entries(values).forEach(([name, content]) => {
      const property = name.startsWith('og:')
      upsertMeta(`${property ? 'meta[property' : 'meta[name'}="${name}"]`, { [property ? 'property' : 'name']: name, content })
    })
    upsertMeta('link[rel="canonical"]', { rel: 'canonical', href: canonical })
    if (hasPublicMarkdown) upsertMeta('link[rel="alternate"][type="text/markdown"]', {
      rel: 'alternate', type: 'text/markdown', href: absoluteMarkdownUrl(metadata.canonicalPath, SITE_ORIGIN),
    })
    else document.head.querySelector('link[rel="alternate"][type="text/markdown"]')?.remove()
    let schema = document.head.querySelector<HTMLScriptElement>('script[data-public-schema]')
    if (!metadata.indexable) schema?.remove()
    else {
      if (!schema) {
        schema = document.createElement('script')
        schema.type = 'application/ld+json'
        schema.dataset.publicSchema = 'true'
        document.head.appendChild(schema)
      }
      schema.text = jsonLd
    }
    const alternates = metadata.localized && metadata.indexable
      ? [['es', equivalentLanguagePath(metadata.canonicalPath, 'es')], ['en', equivalentLanguagePath(metadata.canonicalPath, 'en')], ['x-default', equivalentLanguagePath(metadata.canonicalPath, 'es')]]
      : []
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((element) => element.remove())
    for (const [hreflang, path] of alternates) {
      upsertMeta(`link[rel="alternate"][hreflang="${hreflang}"]`, { rel: 'alternate', hreflang, href: new URL(path, SITE_ORIGIN).href })
    }
  }, [canonical, catalogVersion, hasPublicMarkdown, jsonLd, lang, location, metadata.description, metadata.indexable, metadata.localized, metadata.title])

  return null
}

export function renderHead(pathname: string): string {
  const { lang } = languageForHead(pathname)
  const metadata = routeMetadata(pathname, catalogRoutes())
  const canonical = new URL(metadata.canonicalPath, SITE_ORIGIN).href
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const localizedRoutes = metadata.localized && metadata.indexable
  const esPath = equivalentLanguagePath(metadata.canonicalPath, 'es')
  const enPath = equivalentLanguagePath(metadata.canonicalPath, 'en')
  const alternate = lang === 'es' ? 'en_GB' : 'es_ES'
  const hasPublicMarkdown = metadata.indexable || metadata.canonicalPath === '/reservas'
  const tags = [
    `<title>${escape(metadata.title[lang])}</title>`,
    `<meta name="description" content="${escape(metadata.description[lang])}" data-seo="description" />`,
    `<meta name="robots" content="${metadata.indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow'}" data-seo="robots" />`,
    `<link rel="canonical" href="${canonical}" data-seo="canonical" />`,
    ...(hasPublicMarkdown ? [`<link rel="alternate" type="text/markdown" href="${absoluteMarkdownUrl(metadata.canonicalPath, SITE_ORIGIN)}" />`] : []),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Alquería Villa Carmen" />`,
    `<meta property="og:title" content="${escape(metadata.title[lang])}" />`,
    `<meta property="og:description" content="${escape(metadata.description[lang])}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${SOCIAL_IMAGE}" />`,
    `<meta property="og:image:alt" content="${escape(metadata.title[lang])}" />`,
    `<meta property="og:locale" content="${lang === 'es' ? 'es_ES' : 'en_GB'}" />`,
    `<meta property="og:locale:alternate" content="${alternate}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(metadata.title[lang])}" />`,
    `<meta name="twitter:description" content="${escape(metadata.description[lang])}" />`,
    `<meta name="twitter:image" content="${SOCIAL_IMAGE}" />`,
  ]
  for (const data of structuredData(pathname, catalogRoutes())) {
    tags.push(`<script type="application/ld+json" data-public-schema="true">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)
  }
  if (localizedRoutes) {
    tags.push(
      `<link rel="alternate" hreflang="es" href="${new URL(esPath, SITE_ORIGIN).href}" />`,
      `<link rel="alternate" hreflang="en" href="${new URL(enPath, SITE_ORIGIN).href}" />`,
      `<link rel="alternate" hreflang="x-default" href="${new URL(esPath, SITE_ORIGIN).href}" />`,
    )
  }
  return tags.join('\n    ')
}

function languageForHead(pathname: string) {
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/')
  return { lang: (isEnglish ? 'en' : 'es') as 'es' | 'en', path: pathname }
}

function localizedPathForHead(pathname: string, lang: 'es' | 'en') {
  const withoutPrefix = pathname === '/en' ? '/' : pathname.startsWith('/en/') ? pathname.slice(3) : pathname
  if (lang === 'es') return withoutPrefix || '/'
  return `/en${withoutPrefix === '/' ? '' : withoutPrefix}`
}

export function publicPrerenderPaths(): string[] {
  return PUBLIC_ROUTES.filter((route) => route.prerender).flatMap((route) => route.localized ? [route.path, localizedPathForHead(route.path, 'en')] : [route.path])
}

// The booking start page is public even though its conversion flow is noindex.
// Token-driven booking management and administration never get public Markdown.
export function publicMarkdownPaths(): string[] {
  return PUBLIC_ROUTES.filter((route) => route.prerender || route.path === '/reservas').flatMap((route) => route.localized ? [route.path, localizedPathForHead(route.path, 'en')] : [route.path])
}

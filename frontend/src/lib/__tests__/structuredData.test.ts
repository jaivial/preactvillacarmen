import { describe, expect, it } from 'vitest'
import { breadcrumbItems, structuredData } from '../structuredData'
import { PUBLIC_ROUTES } from '../routes'

const reservation = structuredData('/reservas')
const weddingData = structuredData('/en/bodas')
const weddingGraph = weddingData[0]['@graph'] as Array<Record<string, unknown>>
const breadcrumb = weddingGraph.find((node) => node['@type'] === 'BreadcrumbList')
const breadcrumbLinks = breadcrumb?.itemListElement as Array<{ item: string; name: string }>

describe('public structured data', () => {
  it('does not emit a schema graph for the noindex reservation shell', () => {
    expect(reservation).toEqual([])
  })

  it('keeps the localized events parent in celebration breadcrumbs', () => {
    expect(breadcrumbItems('/en/bodas', 'en').map((item) => item.name)).toEqual([
      'Home', 'Events and celebrations', 'Weddings in Catarroja',
    ])
    expect(breadcrumbLinks?.map((item) => item.item)).toEqual([
      'https://www.alqueriavillacarmen.com/en',
      'https://www.alqueriavillacarmen.com/en/eventos',
      'https://www.alqueriavillacarmen.com/en/bodas',
    ])
  })

  it('does not publish the Search Console report moved to private analytics', () => {
    expect(PUBLIC_ROUTES.some((route) => route.path === '/datos-busquedas-restaurante')).toBe(false)
    expect(structuredData('/datos-busquedas-restaurante')).toEqual([])
    expect(structuredData('/en/datos-busquedas-restaurante')).toEqual([])
  })

  it('uses the SEO menu title instead of a not-found label after client navigation', () => {
    const menu = { id: 42, slug: 'menu-fin-de-semana-42', seo_slug: 'menu-fin-de-semana', path: '/menu/menu-fin-de-semana', title: { es: 'Menú de fin de semana | Villa Carmen', en: 'Weekend menu | Villa Carmen' }, description: { es: 'Menú', en: 'Menu' } }
    expect(breadcrumbItems('/menu/42/menu-fin-de-semana-42', 'es', [menu]).at(-1)?.name).toBe('Menú de fin de semana')
    expect(breadcrumbItems('/en/menu/menu-fin-de-semana', 'en', [menu]).at(-1)?.name).toBe('Weekend menu')
  })

  it('provides the restaurant entity and breadcrumb list in one parseable graph', () => {
    expect(JSON.parse(JSON.stringify(weddingData))).toEqual(weddingData)
    expect(weddingGraph.some((node) => node['@type'] === 'Restaurant')).toBe(true)
    expect(breadcrumb).toBeDefined()
  })
})

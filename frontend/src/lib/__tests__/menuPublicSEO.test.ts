import { afterEach, describe, expect, it } from 'vitest'
import { menuPath, routeMetadata } from '../routes'
import { publicMenuH1 } from '../../routes/client/menuPublicHelpers'
import { initialMenuBySlug, setPrerenderData } from '../prerenderData'
import { catalogRoutes, renderHead } from '../../components/RouteHead'
import type { PublicMenu } from '../types'

const menu = {
  id: 42,
  active: true,
  menu_public_active: true,
  menu_title: 'Menú arrocero',
  menu_title_english: 'Rice menu',
  menu_subtitle: ['Arroces y producto local'],
  menu_subtitle_english: ['Rice and local produce'],
  slug: 'menu-arrocero-42',
  seo_slug: 'menu-arrocero-catarroja',
  seo_title: 'Menú arrocero en Catarroja | Villa Carmen',
  seo_title_english: 'Rice menu in Catarroja | Villa Carmen',
  seo_description: 'Descubre nuestro menú arrocero y reserva en Catarroja.',
  seo_description_english: 'Discover our rice menu and book in Catarroja.',
  seo_h1: 'Menú arrocero en Villa Carmen',
  seo_h1_english: 'Rice menu at Villa Carmen',
} as PublicMenu

afterEach(() => setPrerenderData({ menus: {}, redirects: {} }))

describe('configurable public menu SEO', () => {
  it('uses the independent SEO slug instead of the title-derived legacy slug', () => {
    expect(menuPath(menu)).toBe('/menu/menu-arrocero-catarroja')
    expect(menuPath({ ...menu, seo_slug: '' })).toBe('/menu/42/menu-arrocero-42')
    expect(initialMenuBySlug('menu-arrocero-catarroja')).toBeUndefined()
    setPrerenderData({ menus: { '42': menu }, redirects: {} })
    expect(initialMenuBySlug('menu-arrocero-catarroja')).toBe(menu)
  })

  it('uses bilingual title, description and H1 overrides with legacy fallbacks', () => {
    setPrerenderData({ menus: { '42': menu }, redirects: {} })
    const metadata = routeMetadata('/menu/menu-arrocero-catarroja', catalogRoutes())
    expect(metadata.title.es).toBe(menu.seo_title)
    expect(metadata.description.en).toBe(menu.seo_description_english)
    expect(publicMenuH1(menu, 'es')).toBe(menu.seo_h1)
    expect(publicMenuH1(menu, 'en')).toBe(menu.seo_h1_english)
    expect(publicMenuH1({ ...menu, seo_h1_english: '' }, 'en')).toBe('Rice menu')
    const html = renderHead('/en/menu/menu-arrocero-catarroja')
    expect(html).toContain('<title>Rice menu in Catarroja | Villa Carmen</title>')
    expect(html).toContain('content="Discover our rice menu and book in Catarroja."')
    expect(html).toContain('rel="canonical" href="https://www.alqueriavillacarmen.com/en/menu/menu-arrocero-catarroja"')
  })
})

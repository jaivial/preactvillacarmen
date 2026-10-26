import type { ComidaItem, Dish, GroupMenuDisplay, HomeMenu, LegalPage, LegalPageSlug, PublicMenu, Vino } from './types'
import type { MenuSidebarData } from './menuApi'

export type PrerenderData = {
  menus: Record<string, PublicMenu>
  homeMenus?: HomeMenu[]
  groupMenus?: GroupMenuDisplay[]
  sidebar?: MenuSidebarData
  postres?: Dish[]
  vinos?: Record<string, Vino[]>
  cafes?: ComidaItem[]
  bebidas?: ComidaItem[]
  legalPages?: Partial<Record<LegalPageSlug, LegalPage>>
  redirects: Record<string, string>
}

const EMPTY_DATA: PrerenderData = { menus: {}, redirects: {} }
const runtime = globalThis as typeof globalThis & { __VILLACARMEN_DATA__?: PrerenderData }

export function setPrerenderData(data: PrerenderData) { runtime.__VILLACARMEN_DATA__ = data }
export function prerenderData(): PrerenderData { return runtime.__VILLACARMEN_DATA__ || EMPTY_DATA }
export function initialMenu(id: number): PublicMenu | undefined { return prerenderData().menus[String(id)] }
export function initialMenuBySlug(slug: string): PublicMenu | undefined {
  let decoded = slug
  try { decoded = decodeURIComponent(slug) } catch { return undefined }
  return Object.values(prerenderData().menus).find((menu) => menu.seo_slug === decoded)
}

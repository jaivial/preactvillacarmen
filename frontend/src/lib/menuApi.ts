import { apiGetJson } from './api'
import { normalizePublicMenu } from './backendAdapters'
import type { PublicMenu, PublicVisibleSection, SidebarMenu, HomeMenu, MenuByIDResponse, MenuSidebarResponse, MenuHomeResponse, ComidaItem, ComidaItemsResponse } from './types'

export type MenuSidebarData = {
  menus: SidebarMenu[]
  // Coordination id: menu_section_public_placement_v1
  visible_sections: PublicVisibleSection[]
  // Coordination id: foodtype_page_visibility_v1
  cafe_page_active: boolean
  bebidas_page_active: boolean
  postres_page_active: boolean
  vinos_page_active: boolean
  postres_web_placement: string
  cafes_web_placement: string
  vinos_web_placement: string
  bebidas_web_placement: string
}

export async function fetchMenuSidebar(): Promise<MenuSidebarData> {
  const data = await apiGetJson<MenuSidebarResponse>('/api/menus/sidebar')
  return {
    menus: data.menus,
    visible_sections: data.visible_sections || [],
    cafe_page_active: Boolean(data.cafe_page_active),
    bebidas_page_active: Boolean(data.bebidas_page_active),
    postres_page_active: Boolean(data.postres_page_active),
    vinos_page_active: data.vinos_page_active !== false,
    postres_web_placement: data.postres_web_placement || 'inside_menus',
    cafes_web_placement: data.cafes_web_placement || 'inside_menus',
    vinos_web_placement: data.vinos_web_placement || 'inside_menus',
    bebidas_web_placement: data.bebidas_web_placement || 'inside_menus',
  }
}

export async function fetchMenuHome(): Promise<HomeMenu[]> {
  const data = await apiGetJson<MenuHomeResponse>('/api/menus/home')
  return data.menus
}

export async function fetchMenuByID(id: number): Promise<PublicMenu> {
  // network-first: menu content is edited in the backoffice and must never
  // be served stale from the in-memory cache
  const data = await apiGetJson<MenuByIDResponse>(`/api/menus/${id}`, { noStore: true })
  // Coordination id: special_menu_minimal_payload_v1
  // Special menus answer with a reduced payload (no menu_type/principales), so
  // normalize before returning: the template router and the menu helpers only
  // ever receive a complete PublicMenu.
  return normalizePublicMenu(data.menu)
}

export async function fetchComidaItems(tipo: 'cafes' | 'bebidas'): Promise<ComidaItem[]> {
  const data = await apiGetJson<ComidaItemsResponse>(`/api/comida/${tipo}?active=1`)
  return Array.isArray(data.items) ? data.items : []
}

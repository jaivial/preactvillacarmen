import { apiGetJson } from './api'
import type { PublicMenu, SidebarMenu, HomeMenu, MenuByIDResponse, MenuSidebarResponse, MenuHomeResponse, ComidaItem, ComidaItemsResponse } from './types'

export type MenuSidebarData = {
  menus: SidebarMenu[]
  cafe_page_active: boolean
  bebidas_page_active: boolean
}

export async function fetchMenuSidebar(): Promise<MenuSidebarData> {
  const data = await apiGetJson<MenuSidebarResponse>('/api/menus/sidebar')
  return {
    menus: data.menus,
    cafe_page_active: Boolean(data.cafe_page_active),
    bebidas_page_active: Boolean(data.bebidas_page_active),
  }
}

export async function fetchMenuHome(): Promise<HomeMenu[]> {
  const data = await apiGetJson<MenuHomeResponse>('/api/menus/home')
  return data.menus
}

export async function fetchMenuByID(id: number): Promise<PublicMenu> {
  const data = await apiGetJson<MenuByIDResponse>(`/api/menus/${id}`)
  return data.menu
}

export async function fetchComidaItems(tipo: 'cafes' | 'bebidas'): Promise<ComidaItem[]> {
  const data = await apiGetJson<ComidaItemsResponse>(`/api/comida/${tipo}?active=1`)
  return Array.isArray(data.items) ? data.items : []
}

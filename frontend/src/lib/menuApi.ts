import { apiGetJson } from './api'
import type { PublicMenu, SidebarMenu, HomeMenu, MenuByIDResponse, MenuSidebarResponse, MenuHomeResponse } from './types'

export async function fetchMenuByID(id: number): Promise<PublicMenu> {
  const data = await apiGetJson<MenuByIDResponse>(`/api/menus/${id}`)
  return data.menu
}

export async function fetchMenuSidebar(): Promise<SidebarMenu[]> {
  const data = await apiGetJson<MenuSidebarResponse>('/api/menus/sidebar')
  return data.menus
}

export async function fetchMenuHome(): Promise<HomeMenu[]> {
  const data = await apiGetJson<MenuHomeResponse>('/api/menus/home')
  return data.menus
}

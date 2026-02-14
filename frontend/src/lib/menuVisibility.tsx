import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { MenuVisibility } from './types'

export const MenuVisibilityContext = createContext<MenuVisibility | null>(null)

export function useMenuVisibility() {
  return useContext(MenuVisibilityContext)
}


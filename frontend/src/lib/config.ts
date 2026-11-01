import { atom } from 'jotai'

/**
 * Global atoms for page visibility flags fetched once from the backend.
 * These are written by ClientHeader after the initial config fetch and
 * consumed by page-level guards to prevent rendering of deactivated pages.
 */
export const bebidasPageActiveAtom = atom<boolean | null>(null)
export const cafePageActiveAtom = atom<boolean | null>(null)
// Coordination id: foodtype_page_visibility_v1
export const vinosPageActiveAtom = atom<boolean | null>(null)
export const postresPageActiveAtom = atom<boolean | null>(null)
// Coordination id: foodtype_show_prices_v1 - null until ClientHeader loads the sidebar.
export type FoodShowPrices = { cafes: boolean; bebidas: boolean; vinos: boolean }
export const foodShowPricesAtom = atom<FoodShowPrices | null>(null)

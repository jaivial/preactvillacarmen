import { useAtomValue } from 'jotai'
import { foodShowPricesAtom, type FoodShowPrices } from './config'
import { prerenderData } from './prerenderData'

// Coordination id: foodtype_show_prices_v1 - backoffice switch "Mostrar precios
// en la web" per food page. Live sidebar value first, then the prerender
// snapshot; prices stay visible when neither is known.
export function useFoodShowPrices(kind: keyof FoodShowPrices): boolean {
  const live = useAtomValue(foodShowPricesAtom)
  if (live) return live[kind]
  return prerenderData().sidebar?.[`${kind}_show_prices`] !== false
}

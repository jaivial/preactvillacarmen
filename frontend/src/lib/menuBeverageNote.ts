import type { PublicMenu, PublicBeverageOption } from './types'

/**
 * Pure helper that renders the parenthetical beverage line shown on
 * the public menu routes (MenusDeGruposCarta + MenuCartaConvencional).
 *
 * Previously each route carried its own copy of this logic; the
 * parenthetical list of allowed beverages was hard to keep in sync and
 * the per-route duplication hid the live `beverage_options` wiring
 * from unit tests.
 *
 * Contract (Spanish):
 *   - `beverage.type === 'ilimitada'`           -> `Bebida ilimitada`
 *   - `beverage.type === 'opcion' | 'option'`   -> `Opción de bebida ilimitada`
 *   - otherwise (incl. `no_incluida`)           -> `Bebida no incluida`
 * When `settings.beverage_options` is non-empty, every selected
 * beverage name is appended inside `(...)`. Both defaults and custom
 * (operator-created) beverages are rendered.
 */

export type BeverageNoteLang = 'es' | 'en'

const LABELS: Record<string, Record<BeverageNoteLang, string>> = {
  ilimitada: {
    es: 'Bebida ilimitada',
    en: 'Unlimited drinks',
  },
  opcion: {
    es: 'Opción de bebida ilimitada',
    en: 'Optional unlimited drinks',
  },
  no_incluida: {
    es: 'Bebida no incluida',
    en: 'Drinks not included',
  },
}

function normalizeBeverageType(raw: unknown): 'ilimitada' | 'opcion' | 'no_incluida' {
  const t = String(raw || 'no_incluida').toLowerCase().trim()
  if (t === 'ilimitada') return 'ilimitada'
  if (t === 'opcion' || t === 'option') return 'opcion'
  return 'no_incluida'
}

function selectedBeverageNames(options: PublicBeverageOption[] | undefined): string[] {
  if (!Array.isArray(options)) return []
  return options
    .filter((option) => option && option.selected !== false)
    .map((option) => String(option?.name || '').trim())
    .filter(Boolean)
}

export function menuBeverageNote(menu: PublicMenu, lang: BeverageNoteLang = 'es'): string {
  const type = normalizeBeverageType(menu.settings?.beverage?.type)
  const names = selectedBeverageNames(menu.settings?.beverage_options)
  const label = LABELS[type][lang] || LABELS.no_incluida[lang]
  if (type === 'no_incluida') return label
  if (names.length === 0) return label
  return `${label} (${names.join(', ')})`
}

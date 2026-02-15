import type { Dish } from '../../lib/types'
import { useI18n } from '../../lib/i18n'

const ALLERGEN_LABELS: Record<string, { es: string; en: string }> = {
  Gluten: { es: 'Gluten', en: 'Gluten' },
  Crustaceos: { es: 'Crustáceos', en: 'Crustaceans' },
  Huevos: { es: 'Huevos', en: 'Eggs' },
  Pescado: { es: 'Pescado', en: 'Fish' },
  Cacahuetes: { es: 'Cacahuetes', en: 'Peanuts' },
  Soja: { es: 'Soja', en: 'Soy' },
  Leche: { es: 'Leche', en: 'Milk' },
  'Frutos de cascara': { es: 'Frutos de cáscara', en: 'Tree nuts' },
  Apio: { es: 'Apio', en: 'Celery' },
  Mostaza: { es: 'Mostaza', en: 'Mustard' },
  Sesamo: { es: 'Sésamo', en: 'Sesame' },
  Sulfitos: { es: 'Sulfitos', en: 'Sulfites' },
  Altramuces: { es: 'Altramuces', en: 'Lupin' },
  Moluscos: { es: 'Moluscos', en: 'Molluscs' },
}

function allergenLabel(raw: string, lang: 'es' | 'en') {
  const key = raw.trim()
  if (!key) return ''
  const entry = ALLERGEN_LABELS[key]
  if (!entry) return key
  return entry[lang] || entry.es
}

export function AllergenChips(props: { alergenos: string[] }) {
  const { lang } = useI18n()
  const items = (props.alergenos || [])
    .map((a) => allergenLabel(a, lang))
    .map((s) => s.trim())
    .filter(Boolean)

  if (items.length === 0) return null

  return (
    <div class="allergenRow" aria-label="Allergens">
      {items.map((label, idx) => (
        <span class="allergenChip" key={`${label}-${idx}`}>
          {label}
        </span>
      ))}
    </div>
  )
}

export function DishList(props: { dishes: Dish[] }) {
  const items = props.dishes || []
  if (items.length === 0) return null

  return (
    <ul class="menuDishList">
      {items.map((dish, idx) => (
        <li class="menuDish" key={`${dish.descripcion}-${idx}`}>
          <div class="menuDishText">{dish.descripcion}</div>
          <AllergenChips alergenos={dish.alergenos} />
        </li>
      ))}
    </ul>
  )
}

export function formatEuro(value: number) {
  if (!Number.isFinite(value)) return ''
  const rounded = Math.round(value * 100) / 100
  const out = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)
  return `${out}€`
}

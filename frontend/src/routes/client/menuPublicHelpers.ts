import type { Dish, PublicMenu, PublicMenuSection } from '../../lib/types'

export type PublicMenuViewSection = {
  id: number
  kind: string
  title: string
  dishes: Dish[]
}

function toDishList(section: PublicMenuSection): Dish[] {
  return (section.dishes || [])
    .map((item) => ({
      descripcion: String(item.title || '').trim(),
      alergenos: item.allergens || [],
    }))
    .filter((dish) => Boolean(dish.descripcion))
}

export function isRiceSection(section: Pick<PublicMenuSection, 'kind' | 'title'>): boolean {
  const kind = String(section.kind || '').toLowerCase().trim()
  if (kind === 'arroces') return true
  const title = String(section.title || '').toLowerCase().trim()
  return title.includes('arroz')
}

export function getMenuViewSections(menu: PublicMenu): PublicMenuViewSection[] {
  const rows = Array.isArray(menu.sections) ? menu.sections : []
  const out: PublicMenuViewSection[] = []

  for (const row of rows) {
    const title = String(row.title || '').trim()
    if (!title) continue
    const dishes = toDishList(row)
    if (dishes.length === 0) continue
    out.push({
      id: Number.isFinite(row.id) ? row.id : 0,
      kind: String(row.kind || '').toLowerCase().trim() || 'custom',
      title,
      dishes,
    })
  }

  return out
}

export function splitClosedConventionalSections(menu: PublicMenu): {
  starters: Dish[]
  mains: Dish[]
  mainsTitle: string
  rice: Dish[]
  others: PublicMenuViewSection[]
} {
  const sections = getMenuViewSections(menu)
  const starters: Dish[] = []
  const mains: Dish[] = []
  const rice: Dish[] = []
  const others: PublicMenuViewSection[] = []
  let mainsTitle = menu.principales.titulo_principales || 'Principales'

  for (const section of sections) {
    if (section.kind === 'entrantes') {
      starters.push(...section.dishes)
      continue
    }

    if (isRiceSection(section)) {
      rice.push(...section.dishes)
      continue
    }

    if (section.kind === 'principales') {
      mains.push(...section.dishes)
      if (section.title) mainsTitle = section.title
      continue
    }

    others.push(section)
  }

  return { starters, mains, mainsTitle, rice, others }
}

export function formatMenuPrice(priceRaw: string): string {
  const parsed = Number(String(priceRaw || '').replace(',', '.').trim())
  if (!Number.isFinite(parsed)) return String(priceRaw || '').trim()
  return parsed % 1 === 0 ? String(parsed.toFixed(0)) : parsed.toFixed(2)
}

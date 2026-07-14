import type { Dish, PublicMenu, PublicMenuSection } from '../../lib/types'

export type PublicMenuViewSection = {
  id: number
  kind: string
  title: string
  title_english?: string
  annotations: string[]
  annotations_english?: string[]
  dishes: Dish[]
}

function toDishList(section: PublicMenuSection): Dish[] {
  return (section.dishes || [])
    .map((item) => ({
      descripcion: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      description_enabled: item.description_enabled === true,
      alergenos: item.allergens || [],
      supplement_enabled: item.supplement_enabled === true,
      supplement_price: item.supplement_price ?? null,
      price: item.price ?? null,
      active: item.active !== false,
      foto_url: item.foto_url || item.image_url || null,
      image_url: item.image_url || item.foto_url || null,
      descripcion_english: String(item.title_english || '').trim() || null,
      description_english: String(item.description_english || '').trim() || null,
    }))
    .filter((dish) => Boolean(dish.descripcion) && dish.active !== false)
}

function normalizeSectionAnnotations(section: PublicMenuSection): string[] {
  return (section.annotations || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
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
      title_english: String(row.title_english || '').trim() || undefined,
      annotations: normalizeSectionAnnotations(row),
      annotations_english: Array.isArray(row.annotations_english)
        ? row.annotations_english.map((item) => String(item || '').trim()).filter(Boolean)
        : undefined,
      dishes,
    })
  }

  return out
}

export function splitClosedConventionalSections(menu: PublicMenu): {
  starters: Dish[]
  starterAnnotations: string[]
  starterAnnotationsEnglish?: string[]
  mains: Dish[]
  mainsTitle: string
  mainsTitleEnglish?: string
  mainsAnnotations: string[]
  mainsAnnotationsEnglish?: string[]
  rice: Dish[]
  riceTitle: string
  riceTitleEnglish?: string
  riceAnnotations: string[]
  riceAnnotationsEnglish?: string[]
  others: PublicMenuViewSection[]
} {
  const sections = getMenuViewSections(menu)
  const starters: Dish[] = []
  const starterAnnotations: string[] = []
  const starterAnnotationsEnglish: string[] = []
  const mains: Dish[] = []
  const mainsAnnotations: string[] = []
  const mainsAnnotationsEnglish: string[] = []
  const rice: Dish[] = []
  let riceTitle = ''
  let riceTitleEnglish: string | undefined
  const riceAnnotations: string[] = []
  const riceAnnotationsEnglish: string[] = []
  const others: PublicMenuViewSection[] = []
  let mainsTitle = menu.principales.titulo_principales || 'Principales'
  let mainsTitleEnglish: string | undefined

  for (const section of sections) {
    if (section.kind === 'entrantes') {
      starters.push(...section.dishes)
      starterAnnotations.push(...section.annotations)
      starterAnnotationsEnglish.push(...(section.annotations_english || []))
      continue
    }

    if (isRiceSection(section)) {
      rice.push(...section.dishes)
      if (section.title) riceTitle = section.title
      if (section.title_english) riceTitleEnglish = section.title_english
      riceAnnotations.push(...section.annotations)
      riceAnnotationsEnglish.push(...(section.annotations_english || []))
      continue
    }

    if (section.kind === 'principales') {
      mains.push(...section.dishes)
      mainsAnnotations.push(...section.annotations)
      mainsAnnotationsEnglish.push(...(section.annotations_english || []))
      if (section.title) mainsTitle = section.title
      if (section.title_english) mainsTitleEnglish = section.title_english
      continue
    }

    others.push(section)
  }

  return {
    starters,
    starterAnnotations,
    starterAnnotationsEnglish,
    mains,
    mainsTitle,
    mainsTitleEnglish,
    mainsAnnotations,
    mainsAnnotationsEnglish,
    rice,
    riceTitle,
    riceTitleEnglish,
    riceAnnotations,
    riceAnnotationsEnglish,
    others,
  }
}

export function formatMenuPrice(priceRaw: string): string {
  const parsed = Number(String(priceRaw || '').replace(',', '.').trim())
  if (!Number.isFinite(parsed)) return String(priceRaw || '').trim()
  return parsed % 1 === 0 ? String(parsed.toFixed(0)) : parsed.toFixed(2)
}

import type {
  Dish,
  MenuResponse,
  MenuVisibility,
  PublicMenu,
  PublicMenuDish,
  PublicMenuSection,
  PublicMenuSettings,
  PublicMenuType,
} from './types'

function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function toBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true
    if (normalized === '0' || normalized === 'false' || normalized === 'no') return false
  }
  return null
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean)
  }
  if (typeof value === 'string') {
    const single = value.trim()
    return single ? [single] : []
  }
  return []
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.'))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = toNumberOrNull(value)
  return parsed === null ? fallback : parsed
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

function normalizePublicMenuType(value: unknown): PublicMenuType {
  const normalized = toText(value)
    .toLowerCase()
    .replace(/[.\s-]+/g, '_')

  if (normalized === 'a_la_carte') return 'a_la_carte'
  if (normalized === 'special') return 'special'

  const isGroupType = normalized === 'group' || normalized.endsWith('_group') || normalized.includes('_group_')
  if (isGroupType) {
    if (normalized.includes('a_la_carte') || normalized.includes('carta')) return 'a_la_carte_group'
    return 'closed_group'
  }

  if (normalized.includes('a_la_carte')) return 'a_la_carte'
  if (normalized.includes('special')) return 'special'
  return 'closed_conventional'
}

function normalizePublicMenuDish(value: unknown): PublicMenuDish | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const title = toText(record.title)
  if (!title) return null
  const fotoUrl = toText(record.foto_url)
  const imageUrl = toText(record.image_url)
  const resolvedImage = fotoUrl || imageUrl

  return {
    id: Math.max(0, Math.trunc(toNumber(record.id, 0))),
    title,
    description: toText(record.description),
    description_enabled: toBool(record.description_enabled) === true,
    foto_url: resolvedImage,
    image_url: resolvedImage,
    allergens: toStringArray(record.allergens),
    supplement_enabled: toBool(record.supplement_enabled) === true,
    supplement_price: toNumberOrNull(record.supplement_price),
    price: toNumberOrNull(record.price),
    active: toBool(record.active) !== false,
    position: Math.max(0, Math.trunc(toNumber(record.position, 0))),
  }
}

function normalizePublicMenuSection(value: unknown): PublicMenuSection | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const title = toText(record.title)
  if (!title) return null

  const dishesRaw = Array.isArray(record.dishes) ? record.dishes : []
  const dishes: PublicMenuDish[] = []
  for (const dish of dishesRaw) {
    const normalizedDish = normalizePublicMenuDish(dish)
    if (normalizedDish) dishes.push(normalizedDish)
  }

  return {
    id: Math.max(0, Math.trunc(toNumber(record.id, 0))),
    title,
    kind: toText(record.kind) || 'custom',
    position: Math.max(0, Math.trunc(toNumber(record.position, 0))),
    annotations: toStringArray(record.annotations),
    dishes,
  }
}

function normalizePublicMenuSettings(value: unknown): PublicMenuSettings {
  const record = toRecord(value)
  return {
    included_coffee: toBool(record.included_coffee) === true,
    beverage: toRecord(record.beverage),
    comments: toStringArray(record.comments),
    min_party_size: Math.max(1, Math.trunc(toNumber(record.min_party_size, 1))),
    main_dishes_limit: toBool(record.main_dishes_limit) === true,
    main_dishes_limit_number: Math.max(1, Math.trunc(toNumber(record.main_dishes_limit_number, 1))),
  }
}

function normalizePublicMenu(value: unknown): PublicMenu | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>

  const id = Math.trunc(toNumber(record.id, 0))
  if (id <= 0) return null

  const title = toText(record.menu_title)
  if (!title) return null

  const slug = toText(record.slug)
  const sectionsRaw = Array.isArray(record.sections) ? record.sections : []
  const sections: PublicMenuSection[] = []
  for (const section of sectionsRaw) {
    const normalizedSection = normalizePublicMenuSection(section)
    if (normalizedSection) sections.push(normalizedSection)
  }

  const principalesRecord = toRecord(record.principales)
  const legacySource = toText(record.legacy_source_table)

  return {
    id,
    slug,
    menu_title: title,
    menu_type: normalizePublicMenuType(record.menu_type),
    price: toText(record.price),
    active: toBool(record.active) !== false,
    menu_subtitle: toStringArray(record.menu_subtitle),
    entrantes: toStringArray(record.entrantes),
    principales: {
      titulo_principales: toText(principalesRecord.titulo_principales) || 'Principal a elegir',
      items: toStringArray(principalesRecord.items),
    },
    postre: toStringArray(record.postre),
    settings: normalizePublicMenuSettings(record.settings),
    sections,
    show_dish_images: toBool(record.show_dish_images) === true,
    special_menu_image_url: toText(record.special_menu_image_url),
    show_menu_preview_image: toBool(record.show_menu_preview_image) === true,
    menu_preview_image_url: toText(record.menu_preview_image_url),
    legacy_source_table: legacySource || undefined,
    created_at: toText(record.created_at),
    modified_at: toText(record.modified_at),
  }
}

function normalizeDish(value: unknown): Dish | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const descripcion = toText(record.descripcion)
  if (!descripcion) return null
  return {
    descripcion,
    alergenos: toStringArray(record.alergenos),
    description: toText(record.description),
    description_enabled: toBool(record.description_enabled) === true,
    supplement_enabled: toBool(record.supplement_enabled) === true,
    supplement_price: toNumberOrNull(record.supplement_price),
    price: toNumberOrNull(record.price),
    active: toBool(record.active) !== false,
    foto_url: toText(record.foto_url) || null,
    image_url: toText(record.image_url) || null,
  }
}

function normalizeDishes(value: unknown): Dish[] {
  if (!Array.isArray(value)) return []
  const dishes: Dish[] = []
  for (const item of value) {
    const normalized = normalizeDish(item)
    if (normalized) dishes.push(normalized)
  }
  return dishes
}

export function normalizeMenuResponse(data: unknown): MenuResponse {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  return {
    success: true,
    entrantes: normalizeDishes(record.entrantes),
    principales: normalizeDishes(record.principales),
    arroces: normalizeDishes(record.arroces),
    precio: toText(record.precio),
  }
}

export function normalizeMenuVisibilityResponse(data: unknown): MenuVisibility {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const next: MenuVisibility = {}

  const modern = record.menuVisibility
  if (modern && typeof modern === 'object' && !Array.isArray(modern)) {
    for (const [rawKey, rawValue] of Object.entries(modern as Record<string, unknown>)) {
      const key = rawKey.trim().toLowerCase()
      if (!key) continue
      const value = toBool(rawValue)
      if (value === null) continue
      next[key] = value
    }
  }

  const legacy = record.menus
  if (Array.isArray(legacy)) {
    for (const row of legacy) {
      if (!row || typeof row !== 'object') continue
      const menuKey = toText((row as Record<string, unknown>).menu_key).toLowerCase()
      if (!menuKey) continue
      const isActive = toBool((row as Record<string, unknown>).is_active)
      if (isActive === null) continue
      next[menuKey] = isActive
    }
  }

  return next
}

export function normalizePublicMenusResponse(data: unknown): PublicMenu[] {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const rows = Array.isArray(record.menus) ? record.menus : []
  const menus: PublicMenu[] = []

  for (const row of rows) {
    const normalized = normalizePublicMenu(row)
    if (!normalized) continue
    menus.push(normalized)
  }

  return menus
}

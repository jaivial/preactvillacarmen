export type MenuVisibility = Record<string, boolean>

export type Dish = {
  descripcion: string
  alergenos: string[]
  description?: string | null
  description_enabled?: boolean
  supplement_enabled?: boolean
  supplement_price?: number | null
  price?: number | null
  active?: boolean
  foto_url?: string | null
  image_url?: string | null
}

export type MenuResponse = {
  success: true
  entrantes: Dish[]
  principales: Dish[]
  arroces: Dish[]
  precio: string
}

export type MenuVisibilityResponse = {
  success: true
  menuVisibility: MenuVisibility
}

export type PostresResponse = {
  success: true
  postres: Dish[]
}

export type GroupMenuDisplay = {
  id: number
  menu_title: string
  price: number
  included_coffee: boolean
  menu_subtitle: unknown
  entrantes: unknown
  principales: unknown
  postre: unknown
  beverage: unknown
  comments: unknown
  min_party_size: number
  main_dishes_limit: boolean
  main_dishes_limit_number: number
  created_at: string
}

export type GroupMenusDisplayResponse = {
  success: true
  count: number
  menus: GroupMenuDisplay[]
}

export type PublicMenuType =
  | 'closed_conventional'
  | 'closed_group'
  | 'a_la_carte'
  | 'a_la_carte_group'
  | 'special'

export type PublicMenuDish = {
  id: number
  title: string
  description: string
  description_enabled?: boolean
  foto_url?: string
  image_url?: string
  allergens: string[]
  supplement_enabled: boolean
  supplement_price: number | null
  price: number | null
  active?: boolean
  position: number
}

export type PublicMenuSection = {
  id: number
  title: string
  kind: string
  position: number
  dishes: PublicMenuDish[]
}

export type PublicMenuSettings = {
  included_coffee: boolean
  beverage: Record<string, unknown>
  comments: string[]
  min_party_size: number
  main_dishes_limit: boolean
  main_dishes_limit_number: number
}

export type PublicMenu = {
  id: number
  slug: string
  menu_title: string
  menu_type: PublicMenuType
  price: string
  active: boolean
  menu_subtitle: string[]
  entrantes: string[]
  principales: {
    titulo_principales: string
    items: string[]
  }
  postre: string[]
  settings: PublicMenuSettings
  sections: PublicMenuSection[]
  special_menu_image_url: string
  legacy_source_table?: string
  show_dish_images: boolean
  created_at: string
  modified_at: string
}

export type PublicMenusResponse = {
  success: true
  count: number
  menus: PublicMenu[]
}

export type Vino = {
  num: number
  nombre: string
  precio: number
  descripcion: string
  bodega: string
  denominacion_origen: string
  tipo: string
  graduacion: number
  anyo: string
  active: 0 | 1
  has_foto: boolean
  foto_url?: string
}

export type VinosResponse = {
  success: true
  vinos: Vino[]
}

export type ApiError = {
  success: false
  message: string
}

export type ClosedDaysResponse = {
  success: true
  closed_days: string[]
  opened_days: string[]
}

export type MonthAvailabilityDay = {
  dailyLimit: number
  totalPeople: number
  freeBookingSeats: number
}

export type MonthAvailabilityResponse = {
  success: true
  month: number
  year: number
  availability: Record<string, MonthAvailabilityDay>
}

export type DailyLimitResponse = {
  success: true
  date: string
  dailyLimit: number
  totalPeople: number
  freeBookingSeats: number
}

export type MesasDeDosResponse = {
  success: true
  disponibilidadDeDos: boolean
  limiteMesasDeDos: number
  mesasDeDosReservadas: number
}

export type HourSlot = {
  status: 'available' | 'limited' | 'full' | 'closed' | string
  capacity: number
  totalCapacity?: number
  bookings: number
  percentage: number
  completion: number
  isClosed: boolean
}

export type HourDataResponse = {
  success: true
  hourData: Record<string, HourSlot>
  activeHours: string[]
  isDefaultData?: boolean
  dailyLimit?: number
  totalPeople?: number
  date?: string
}

export type SalonCondesaResponse = {
  success: true
  state: number
}

export type ValidGroupMenusForPartySizeResponse = {
  success: true
  hasValidMenus: boolean
  count: number
  menus: GroupMenuDisplay[]
}

export type InsertBookingResponse = {
  success: boolean
  message?: string
  booking_id?: number
  error_code?: string
}

export type MenuVisibility = Record<string, boolean>

export type Dish = {
  descripcion: string
  alergenos: string[]
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

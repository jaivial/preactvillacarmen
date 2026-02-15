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

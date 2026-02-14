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

export type ApiError = {
  success: false
  message: string
}


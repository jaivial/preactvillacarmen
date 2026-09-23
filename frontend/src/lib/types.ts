export type MenuVisibility = Record<string, boolean>

export type Dish = {
  id?: number
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
  descripcion_english?: string | null
  description_english?: string | null
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
  menu_title_english?: string
  price: number
  included_coffee: boolean
  menu_subtitle: unknown
  entrantes: unknown
  entrantes_english?: string[]
  principales: unknown
  principales_english?: { items?: string[]; titulo_principales?: string }
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
  title_english?: string
  description_english?: string
}

export type PublicMenuSection = {
  id: number
  title: string
  display_title?: string
  subtitle?: string
  tab_label?: string
  kind: string
  // Coordination id: dessert_section_source_v1
  // "general" -> the dishes are mirrored from the general desserts carta
  // (edited only in the backoffice at /app/comida/postres); "custom" -> the
  // section owns its own list. The payload already carries the resolved dishes,
  // so this field is informational for the public UI.
  dessert_source?: string
  position: number
  annotations: string[]
  dishes: PublicMenuDish[]
  title_english?: string
  display_title_english?: string
  subtitle_english?: string
  tab_label_english?: string
  annotations_english?: string[]
}

export type PublicBeverageOption = {
  id?: number
  slug: string
  name: string
  is_custom?: boolean
  selected?: boolean
}

export type PublicMenuSettings = {
  included_coffee: boolean
  beverage: Record<string, unknown>
  beverage_options: PublicBeverageOption[]
  comments: string[]
  important_info: string[]
  min_party_size: number
  main_dishes_limit: boolean
  main_dishes_limit_number: number
  comments_english?: string[]
  important_info_english?: string[]
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
  // Coordination id: special_menu_sections_v1
  // Ordered list of image sections rendered below the hero on a special
  // menu. Each section has an optional title and an image URL.
  special_menu_sections: PublicMenuSpecialSection[]
  // Coordination id: special_menu_price_date_v1
  special_date?: PublicMenuSpecialDate | null
  // Coordination id: special_menu_cta_v1 - only present when enabled.
  special_cta?: PublicMenuSpecialCta | null
  // Coordination id: special_menu_visibility_v1
  // Per-menu placement / visibility, parallel to the food-type settings
  // exposed in the sidebar payload.
  web_placement: string
  menu_public_active: boolean
  show_menu_preview_image: boolean
  menu_preview_image_url: string
  legacy_source_table?: string
  show_dish_images: boolean
  // Coordination id: menu_section_tabs_flag
  show_section_tabs?: boolean
  created_at: string
  modified_at: string
  menu_title_english?: string
  menu_subtitle_english?: string[]
  slider_mode?: 'default' | 'custom' | 'both' | 'hidden'
  slider_images?: string[]
  // Coordination id: menu_weekday_availability_v1
  // Weekly availability calendar persisted per menu in the backend. The client
  // SDK uses it to know which weekday a booking falls on and which menu is
  // served by default that day.
  weekdays?: Record<string, boolean>
  weekdays_available?: string[]
}

// Coordination id: special_menu_sections_v1
// Public, read-only shape of one special-menu image section.
export type PublicMenuSpecialSection = {
  id: number
  title: string
  image_url: string
  position: number
  // Coordination id: special_menu_price_date_v1 - null when not priced.
  price: number | null
}

// Coordination id: special_menu_cta_v1 - button below the special sections.
// `href` is absolute on the restaurant website (or a wa.me link), resolved by
// the backend from the restaurant contact config.
export type PublicMenuSpecialCta = {
  enabled: boolean
  label: string
  action: 'menu' | 'whatsapp' | 'reservas'
  href: string
  opens_new_tab: boolean
  target_date?: string
}

// Coordination id: special_menu_price_date_v1 - special day of a special menu.
export type PublicMenuSpecialDate = {
  id: number
  date: string
  title: string
  is_active: boolean
  prereserva_enabled: boolean
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
  nombre_english?: string
  descripcion_english?: string
  bodega_english?: string
  denominacion_origen_english?: string
  tipo_english?: string
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

export type RiceTypesResponse = {
  success: true
  riceTypes: string[]
  riceTypesEnglish?: string[]
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
  /** When false, there is no per-hour capacity cap: clients may book any active hour
   *  as long as the daily limit still has room. Defaults to true (backward compat). */
  hourSplitEnabled?: boolean
  percentages?: Record<string, number>
}

export type SalonCondesaResponse = {
  success: true
  state: number
}

export type ReservationDayContextFloor = {
  id: number
  floorNumber: number
  name: string
  isGround: boolean
  active: boolean
  maxAforo?: number
  occupancy?: number
  remaining?: number
}

export type ReservationDayContextSalon = {
  id: number
  name: string
  capacityLimit?: number
  occupancy?: number
  remaining?: number
}

export type ReservationDayContextLocationFloor = {
  id: number
  floorNumber: number
  name: string
  isGround: boolean
  salons: ReservationDayContextSalon[]
}

export type ReservationDayContextLocationBooking = {
  allowFloorReservation: boolean
  allowSalonReservation: boolean
  floors: ReservationDayContextLocationFloor[]
}

export type ReservationDayContextResponse = {
  success: true
  date: string
  openingMode: 'both' | 'morning' | 'night'
  morningHours: string[]
  nightHours: string[]
  floors: ReservationDayContextFloor[]
  activeFloors: ReservationDayContextFloor[]
  locationBooking?: ReservationDayContextLocationBooking
  /** Resolved mobility setting for this date (global default with the per-day
   *  override applied; the concrete day wins). Coordination id: mobility_day_override_v1 */
  mobility_enabled?: boolean
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
  whatsapp_warning?: string
  whatsapp_sent?: boolean
}

// Lightweight menu data for the sidebar burger nav.
export type SidebarMenu = {
  id: number
  slug: string
  menu_title: string
  menu_type: PublicMenuType
  active: boolean
  // Coordination id: special_menu_visibility_v1
  web_placement?: string
  legacy_source_table?: string
}

// Lightweight menu data for the homepage cards section.
export type HomeMenu = {
  id: number
  slug: string
  menu_title: string
  menu_title_english?: string
  menu_type: PublicMenuType
  active: boolean
  menu_subtitle: string[]
  menu_subtitle_english?: string[]
  show_menu_preview_image: boolean
  menu_preview_image_url: string
}

// Response shape for GET /api/menus/{id}.
// Coordination id: special_menu_minimal_payload_v1
// Special menus answer with a reduced payload (no `menu_type`/`principales`),
// so consumers must go through fetchMenuByID(), which normalizes the body into
// a complete PublicMenu before it reaches the template router.
export type MenuByIDResponse = {
  success: true
  menu: PublicMenu
}

// Response shape for GET /api/menus/sidebar
// Coordination id: menu_section_public_placement_v1
// (backoffice section visibility -> DB group_menu_sections_v2 -> this payload -> nav)
export type PublicVisibleSection = {
  id: number
  menu_id: number
  title: string
  kind: string
  web_placement: string
  href: string
}

export type MenuSidebarResponse = {
  success: true
  count: number
  menus: SidebarMenu[]
  visible_sections?: PublicVisibleSection[]
  // Coordination id: foodtype_page_visibility_v1
  cafe_page_active: boolean
  bebidas_page_active: boolean
  postres_page_active?: boolean
  vinos_page_active?: boolean
  postres_web_placement?: string
  cafes_web_placement?: string
  vinos_web_placement?: string
  bebidas_web_placement?: string
}

export type ComidaItem = {
  num: number
  source_type: string
  tipo?: string
  nombre: string
  precio: number
  descripcion: string
  titulo?: string
  suplemento?: number
  alergenos?: string[]
  active: boolean
  has_foto: boolean
  foto_url?: string
  categoria?: string
  category_id?: number
  category_slug?: string
  nombre_english?: string
  descripcion_english?: string
  titulo_english?: string
  tipo_english?: string
  categoria_english?: string
}

export type ComidaItemsResponse = {
  success: true
  items: ComidaItem[]
  total: number
}

// Response shape for GET /api/menus/home
export type MenuHomeResponse = {
  success: true
  count: number
  menus: HomeMenu[]
}

// Mandatory Menu Types

export type MandatoryMenuDisplay = {
  menuId: number
  menuTitle: string
  menuTitleEnglish?: string
  menuSubtitle: string
  menuType: string
  entrantes: string[]
  entrantesEnglish?: string[]
  principales: { items: string[]; titulo_principales?: string }
  principalesEnglish?: { items?: string[]; titulo_principales?: string }
  minPartySize: number
  mainDishesLimit: boolean
  mainDishesLimitNumber: number
  price: number
  menuChooseMain: boolean
}

export type MandatoryMenuResponse = {
  date: string
  status: boolean
  mandatory?: boolean
  menus?: MandatoryMenuDisplay[]
}

// Coordination id: special_booking_v1
// Public special-date types. Light shape for the calendar marking / availability
// bypass (SpecialDateSummary) and full shape returned by
// GET /reservations/special-date?date= (SpecialDatePublic).
export type PaymentMethodKey = 'card' | 'bizum' | 'transferencia' | 'efectivo'

export type SpecialDateSummary = {
  date: string
  is_active: boolean
  prereserva_enabled: boolean
  title: string
  max_per_table_enabled: boolean
  max_per_table?: number | null
  /** Ask the mobility question in the wizard. Coordination id: mobility_issues_v1 */
  mobility_enabled?: boolean
}

export type SpecialDatesResponse = {
  success: true
  special_dates: SpecialDateSummary[]
}

export type SpecialDateMenuPublic = {
  id: number
  menu_id?: number | null
  label: string
  price?: number | null
  is_custom: boolean
  custom_title?: string | null
  custom_image_url?: string | null
  adelanto_amount?: number | null
}

export type SpecialDatePublic = {
  date: string
  title: string
  description?: string | null
  /** The handler only returns active rows, but it does send the flag. */
  is_active?: boolean
  prereserva_enabled: boolean
  max_per_table_enabled: boolean
  max_per_table?: number | null
  /** Coordination id: mobility_issues_v1 */
  mobility_enabled?: boolean
  requires_adelanto: boolean
  adelanto_payment_methods: PaymentMethodKey[]
  adelanto_unified: boolean
  menus: SpecialDateMenuPublic[]
}

/**
 * GET /api/reservations/special-date?date=
 *
 * The handler writes the row FLAT at the top level (no `success`, no
 * `special_date` wrapper) — see reservation_special_dates_public.go. The
 * optional wrapper is kept so an older/wrapped payload still parses.
 *
 * Coordination id: special_booking_v1
 */
export type SpecialDateResponse = SpecialDatePublic & {
  success?: boolean
  special_date?: SpecialDatePublic | null
}

// Coordination id: special_booking_politics_v1
export type LegalPageSlug = 'aviso-legal' | 'booking-policies' | 'proteccion-datos' | 'special-booking-politics'

export type LegalPage = {
  slug: LegalPageSlug
  title: string
  contentJson: string
  contentHtml: string
  updatedAt: string
}

export type LegalPageResponse = {
  success: true
  slug: LegalPageSlug
  title: string
  contentHtml: string
  contentJson: string
  updatedAt: string
}

# Backend Endpoints (Go)

The Go server mounts the API router under `/api/*` (primary).

For migration compatibility, a set of legacy endpoints are also exposed at the root path without the `/api` prefix (see `preactvillacarmen/backend/cmd/server/main.go`). This is limited to legacy-style endpoints (mostly `*.php` and legacy backend folders) to avoid colliding with SPA routes like `/vinos`.

## Auth (Admin)

Admin endpoints are protected by `ADMIN_TOKEN`:

- If `ADMIN_TOKEN` is set (non-empty), requests must include:
  - `X-Admin-Token: <token>` or
  - `Authorization: Bearer <token>`
- If `ADMIN_TOKEN` is empty, admin endpoints are not gated (dev convenience).

## Conventions

- Most endpoints return JSON with either:
  - `{ "success": true, ... }` / `{ "success": false, "message": "..." }`, or
  - legacy `{ "status": "success|error|warning", ... }` for some admin UIs.
- Legacy form endpoints usually accept `multipart/form-data` (FormData) and also `application/x-www-form-urlencoded`.
- Some endpoints accept `application/json` bodies where the legacy JS sends JSON.

## Auth (Internal / n8n)

Some internal automation endpoints (ported from the legacy PHP automation scripts) require `INTERNAL_API_TOKEN`:

- Header: `X-Api-Token: <token>`
- If `INTERNAL_API_TOKEN` is empty/unset, access is denied (mirrors legacy PHP security behavior).

---

## Public Menu / Navigation

### `GET /api/menu-visibility` (alias: `GET /menu-visibility`)
Returns the current visibility flags used by navigation.

Response:
- `{ success: true, menuVisibility: { menudeldia: boolean, menufindesemana: boolean, ... } }`

### `GET /api/menus/dia`
Response:
- `{ success: true, entrantes: Dish[], principales: Dish[], arroces: Dish[], precio: string }`

### `GET /api/menus/finde`
Same shape as `/api/menus/dia`.

`Dish`:
- `{ descripcion: string, alergenos: string[] }`

### `GET /api/postres`
Response:
- `{ success: true, postres: Dish[] }`

---

## Wines (Public + Admin)

### `GET /api/vinos`
Query params:
- `tipo` (required unless `num` is provided): `TINTO|BLANCO|CAVA`
- `active` (optional, default `1`)
- `include_image` (optional, default `true`; includes `foto_url` when `1`)
- `num` (optional): returns a single wine by id (overrides `tipo`)

Response:
- `{ success: true, vinos: Vino[] }`
- Sets `ETag`; supports `If-None-Match` (returns `304`).

`Vino`:
- `num` (int), `nombre` (string), `precio` (number), `descripcion` (string), `bodega` (string)
- `denominacion_origen` (string), `tipo` (string), `graduacion` (number), `anyo` (string)
- `active` (0|1), `has_foto` (bool)
- If `include_image=1`: `foto_url` (string, BunnyCDN URL)

### `GET /api/api_vinos.php` (legacy GET alias)
Same behavior as `GET /api/vinos`.

### `POST /api/vinos` (admin)
Same behavior as `POST /api/api_vinos.php`.

### `POST /api/api_vinos.php` (admin)
Form fields:
- `action`: `update_status|delete|update|add`

Actions:
- `update_status`: `wineId`, `status` (0|1) -> `{ success: true }`
- `delete`: `wineId` -> `{ success: true }`
- `update`: `wineId`, `nombre`, `precio`, plus optional fields `descripcion`, `bodega`, `denominacion_origen`, `graduacion`, `anyo`,
  - optional image: `imageBase64` (preferred) or file upload `image`
  - -> `{ success: true }` or `{ success: true, warning: string }`
- `add`: `tipo`, `nombre`, `precio`, `bodega` (required), plus optional fields above,
  - optional image: `imageBase64` or file `image`
  - -> `{ success: true, wineId: number }` or `{ success: true, wineId: number, warning: string }`

---

## Menu Visibility (Legacy Admin)

### `GET /api/menuVisibilityBackend/getMenuVisibility.php`
Query params:
- `menu_key` (optional). If absent, returns all menus.

Response:
- `{ success: true, menu: {...} }` or `{ success: true, menus: [...] }`

### `POST /api/menuVisibilityBackend/toggleMenuVisibility.php` (admin)
Body:
- JSON or form: `menu_key` and `is_active` (bool-ish: `true|false|1|0|yes|no`)

Response:
- `{ success: true, message: string, menu: {...} }`

---

## Menu Admin (DIA / FINDE)

### `POST /api/updateDishDia.php` (admin)
Legacy form endpoint for `DIA` table:
- Add dish: `anyadeEntrante|anyadePrincipal|anyadeArroz` + `inputText` + `selectedAlergenos[]`/`selectedAlergenos2[]`/`selectedAlergenos3[]`
- Update dish: `update` + `formID` + `inputText` + `selectedAlergenos[]`
- Delete dish: `eliminaplato` + `formID`
- Toggle active (legacy): `toggleActive` + `dishId` + `newStatus`

Response:
- `{ status: "success|error", success: boolean, message: string, newId?: number }`

### `POST /api/toggleDishStatusDia.php` (admin)
Form:
- `dishId` (int), `isActive` (bool-ish)

Response:
- `{ status: "success", success: true, dishId: number, newStatus: 0|1 }`

### `GET /api/searchDishesDia.php`
Query:
- `searchTerm` (string)

Response:
- `{ status: "success|error", success: boolean, matchingIds: number[] }`

### `POST /api/updateDish.php` (admin)
Same behavior as `updateDishDia.php` but for `FINDE` table.

### `POST /api/toggleDishStatus.php` (admin)
Form:
- `dishId` (int), `isActive` (bool-ish)
- `table` (optional): defaults to `FINDE`; supports `POSTRES`

Response:
- `{ status: "success", success: true, dishId: number, newStatus: 0|1 }`

### `GET /api/searchDishesFinde.php`
Same behavior as `searchDishesDia.php` but searches `FINDE`.

---

## Postres Admin

### `GET|POST /api/updatePostre.php` (admin)
Actions (JSON or form):
- `getPostres` -> returns `{ status: "success", active: [...], inactive: [...] }`
- `addPostre`: `descripcion`, `alergenos` -> `{ status: "success", newId: number }`
- `updatePostre`: `num`, `descripcion`, `alergenos`
- `deletePostre`: `num`
- `toggleActive`: `num`, `active`

### `GET /api/searchPostres.php` (admin)
Query:
- `searchTerm`

Response:
- `{ status: "success|error", matchingIds: number[] }`

---

## Group Menus (menusDeGrupos)

### `GET /api/menuDeGruposBackend/getAllMenus.php`
Response:
- `{ success: true, menus: MenuDeGrupo[] }`

### `GET /api/menuDeGruposBackend/getMenu.php?id=<id>`
Response:
- `{ success: true, menu: MenuDeGrupo }`

### `GET /api/menuDeGruposBackend/getActiveMenusForDisplay.php`
Response:
- `{ success: true, menus: MenuDeGrupoDisplay[] }`

### `POST /api/menuDeGruposBackend/addMenu.php` (admin)
Accepts JSON or `multipart/form-data` (from legacy axios).

### `POST|PUT /api/menuDeGruposBackend/updateMenu.php` (admin)
Accepts JSON or `multipart/form-data`.

### `POST /api/menuDeGruposBackend/toggleActive.php` (admin)
Body:
- `id`, `active`

### `POST|DELETE /api/menuDeGruposBackend/deleteMenu.php` (admin)
Body:
- `id`

---

## Reservations Availability Helpers

### `GET /api/fetch_arroz.php`
Returns a bare JSON array of rice dish descriptions:
- `string[]`

### `POST /api/fetch_daily_limit.php`
Form:
- `date` (`YYYY-MM-DD`)

Response:
- `{ success: true, date, dailyLimit, totalPeople, freeBookingSeats }`

### `POST /api/fetch_month_availability.php`
Form:
- `month` (int `1-12`)
- `year` (int)

Response:
- `{ success: true, month: number, year: number, availability: { [YYYY-MM-DD]: { dailyLimit: number, totalPeople: number, freeBookingSeats: number } } }`

---

## Opening Hours (Legacy Admin UI)

### `GET /api/getopeninghours.php`
Returns the opening hours configuration from `openinghours`.

### `POST /api/editopeninghours.php` (admin)
Upserts `openinghours` and removes `hour_configuration` legacy rows (mirrors PHP behavior).

---

## Hour Percentages

### `GET /api/gethourpercentages.php`
Returns hour-percentage configuration used by reservation capacity logic.

### `POST /api/updatehourpercentages.php` (admin)
Updates hour-percentage configuration.

---

## Calendar Data

### `GET /api/get_calendar_data.php`
Returns monthly/day availability data for legacy admin UIs (cached + `ETag`).

---

## Group Menus Helpers

### `GET /api/getValidMenusForPartySize.php`
Query:
- `partySize` (int)

Response:
- `{ success: true, menus: [...] }`

---

## Automation / Modification Endpoints (n8n)

### `GET|POST /api/get_booking_availability_context.php`
Returns booking availability context used by n8n flows (month availability, limits, closed days, etc.).

### `GET /api/get_available_rice_types.php`
Returns available rice types for automation.

### `POST /api/check_date_availability.php`
Checks if a booking date change is possible (capacity/closed day).

### `POST /api/check_party_size_availability.php`
Checks if a party size change is possible (capacity).

### `POST /api/validate_booking_modifiable.php`
Validates whether a booking can be modified.

### `POST /api/update_reservation.php` (alias: `POST /update_reservation.php`)
Updates an existing booking from automation flows.

### `POST /api/save_modification_history.php`
Stores booking modification history (creates `modification_history` table if missing).

### `POST /api/notify_restaurant_modification.php`
Best-effort notification to restaurant staff (WhatsApp via UAZAPI if configured).

---

## n8n Reminders

### `GET /api/n8nReminder.php` (alias: `GET /n8nReminder.php`)
Internal endpoint that sends WhatsApp reminder buttons (confirm + optional rice) for bookings in the next 48 hours.

Auth:
- Requires `X-Api-Token` matching `INTERNAL_API_TOKEN`.

Response:
- `{ success, total, confirmation_sent, rice_sent, failed, details: [...] }`

---

## Public WhatsApp Pages (HTML)

These are legacy PHP pages ported to Go (served as HTML). They are used from WhatsApp links and must exist at the root path.

### `GET|POST /confirm_reservation.php`
Confirms a booking (`bookings.status='confirmed'`).

### `GET|POST /cancel_reservation.php`
Cancels a booking (moves to `cancelled_bookings`, deletes from `bookings`).

### `GET|POST /book_rice.php`
Allows clients to select a rice type and servings for an existing booking (writes JSON arrays to `bookings.arroz_type` and `bookings.arroz_servings`).

---

## Navidad Booking

### `POST /api/navidad_booking.php`
Legacy Navidad contact form handler (rate-limited; WhatsApp best-effort via UAZAPI if configured).

---

## Marketing (Legacy Tool)

### `POST /api/emailAdvertising/sendEmailAndWhastappAd.php` (alias: `POST /emailAdvertising/sendEmailAndWhastappAd.php`) (admin)
Query params:
- `action=send`
- `type=all|email|whatsapp`

Notes:
- Email sending is stubbed (no SMTP configured in Go).
- WhatsApp is sent via UAZAPI if `UAZAPI_URL` + `UAZAPI_TOKEN` are configured.

### `GET /api/fetch_closed_days.php`
Response:
- `{ success: true, closed_days: string[], opened_days: string[] }`

### `POST /api/fetch_mesas_de_dos.php`
Form:
- `date` (`YYYY-MM-DD`)

Response:
- `{ success: true, disponibilidadDeDos: boolean, limiteMesasDeDos: number, mesasDeDosReservadas: number }`

### `POST /api/update_daily_limit.php` (admin)
Form:
- `date` (`YYYY-MM-DD`), `daily_limit` (int)

Response:
- `{ success: true, message: string, date: string, dailyLimit: number }`

### `POST /api/limitemesasdedos.php` (admin)
Form:
- `date` (`YYYY-MM-DD`, optional), `daily_limit` (`0-40|999|sin_limite`)

Response:
- `{ success: true, message: string }`

### `POST /api/get_mesasdedos_limit.php` (admin)
Form:
- `date` (`YYYY-MM-DD`, optional)

Response:
- `{ success: true, daily_limit: string, message: string }`

### `POST /api/check_day_status.php` (admin)
Form:
- `date` (`YYYY-MM-DD`)

Response:
- `{ success: true, date: string, weekday: string, is_open: boolean, is_default_closed_day: boolean }`

### `POST /api/open_day.php` (admin)
Form:
- `date` (`YYYY-MM-DD`)

Response:
- `{ success: true, message: string, date: string, is_open: true }`

### `POST /api/close_day.php` (admin)
Form:
- `date` (`YYYY-MM-DD`)

Response:
- `{ success: true, message: string, date: string, is_open: false }`

### `POST /api/fetch_occupancy.php` (admin)
Form:
- `date` (`YYYY-MM-DD`)

Response:
- `{ success: true, totalPeople: number, dailyLimit: number, date: string, status: "OK" }`

---

## Hours Configuration (Legacy `/api/*` in PHP)

### `GET /api/gethourdata.php?date=YYYY-MM-DD`
Returns hour slots for a date combining:
- `openinghours.hoursarray` defaults
- any per-date overrides from `hour_configuration`
- occupancy-derived capacity and status fields

### `POST /api/savehourdata.php` (admin)
JSON body:
- `{ date: "YYYY-MM-DD", data: [...] }`

Upserts into `hour_configuration`.

---

## Booking Creation

### `POST /api/insert_booking_front.php`
Form:
- Standard reservation fields (name/email/date/time/party_size/phone, etc.)
- Optional arroz selection JSON fields (as in legacy JS)
- Optional group menu fields:
  - `special_menu=1`
  - `menu_de_grupo_id`
  - `principales_enabled`
  - `principales_json` (JSON array)

Response:
- `{ success: true, booking_id: number, notifications_sent: false, email_sent: false, whatsapp_sent: false }`

### `POST /api/insert_booking.php` (admin)
Form:
- `date`, `time`, `nombre`, `phone`, `special_menu`, etc.

Response:
- `{ success: true, booking_id: number, whatsapp_sent: false }`

---

## Booking Admin (confreservas.php)

### `POST /api/fetch_bookings.php` (admin)
Form:
- `date` (required `YYYY-MM-DD`)
- `page` (optional), `page_size` (optional)
- `all` (optional bool-ish)
- `time_sort` / `date_added_sort` (`asc|desc|none`)

Response:
- `{ success: true, bookings: [...], totalPeople: number, total_count: number, page, page_size, total_pages, is_all }`

### `POST /api/get_booking.php` (admin)
Form:
- `id`

Response:
- `{ success: true, booking: {...} }`

### `POST /api/edit_booking.php` (admin)
URL-encoded form (legacy):
- Expects the same keys used by the legacy UI (see `confreservas.php` JS mapping).

Response:
- `{ success: true }` or `{ success: false, message }`

### `POST /api/delete_booking.php` (admin)
Form:
- `id`

### `POST /api/update_table_number.php` (admin)
JSON body:
- `{ id, table_number }`

### `POST /api/get_reservations.php` (admin)
Form:
- `start_date`, `end_date`

### `POST /api/fetch_cancelled_bookings.php` (admin)
Form:
- `date` (`YYYY-MM-DD`, optional)

### `POST /api/reactivate_booking.php` (admin)
Form:
- `id`

---

## Salón Condesa

### `GET /api/salon_condesa_api.php?date=YYYY-MM-DD`
Response:
- `{ success: true, date, state: 0|1 }`

### `POST /api/salon_condesa_api.php` (admin)
JSON or form:
- `date`, `state`

Response:
- `{ success: true }`

import { apiFetch, apiGetJson } from './api'

/**
 * Customer self-service flow shared by the booking wizard (duplicate guard on
 * the personal-details step) and the modify route (/reservas/modificar).
 *
 * Coordination id: reservation_self_modification_v1
 * Backend: internal/api/reservation_self_service.go
 */
export type SelfServiceBooking = {
  id: number
  reservationDate: string
  reservationTime: string
  partySize: number
  children: number
  customerName: string
  contactEmail: string
  contactPhone: string
  contactPhoneCountryCode: string
  highChairs: number
  babyStrollers: number
  specialDateTitle?: string
}

export type DuplicateCheckResponse = {
  success: boolean
  duplicate: boolean
  /** Only present when `duplicate` is true. */
  modifiable?: boolean
  reason?: string
  message?: string
  modifyUrl?: string
  booking?: SelfServiceBooking
}

export type ModifyContextResponse = {
  success: boolean
  modifiable: boolean
  /** Special-menu bookings freeze their menu snapshot, so their date is pinned. */
  date_locked?: boolean
  reason?: string
  message?: string
  booking?: SelfServiceBooking
}

export type ModifyBookingResponse = {
  success: boolean
  message?: string
  reason?: string
  booking_id?: number
}

export type ModifyBookingPayload = {
  booking_id: number
  reservation_date: string
  reservation_time: string
  party_size: number
  children: number
  customer_name: string
  contact_email: string
  country_code: string
  contact_phone: string
  high_chairs: number
  baby_strollers: number
}

/** POST /api/reservations/contact-lookup */
export function lookupDuplicateReservation(input: {
  reservationDate: string
  contactEmail: string
  countryCode: string
  contactPhone: string
}): Promise<DuplicateCheckResponse> {
  return apiGetJson<DuplicateCheckResponse>('/api/reservations/contact-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reservation_date: input.reservationDate,
      contact_email: input.contactEmail,
      country_code: input.countryCode,
      contact_phone: input.contactPhone,
    }),
    noStore: true,
  })
}

/** GET /api/reservations/modify-context?id= */
export async function fetchModifyContext(id: number): Promise<ModifyContextResponse> {
  const res = await apiFetch(`/api/reservations/modify-context?id=${encodeURIComponent(String(id))}`)
  const data = (await res.json().catch(() => null)) as ModifyContextResponse | null
  if (!data) throw new Error(`HTTP ${res.status}`)
  return data
}

/** POST /api/reservations/modify */
export async function submitBookingModification(payload: ModifyBookingPayload): Promise<ModifyBookingResponse> {
  const res = await apiFetch('/api/reservations/modify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => null)) as ModifyBookingResponse | null
  if (!data) throw new Error(`HTTP ${res.status}`)
  return data
}

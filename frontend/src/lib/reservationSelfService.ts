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
  /** Inherited rice order (leading entry of the stored arrays). */
  arrozType?: string
  arrozServings?: number
  /** Inherited mobility answer. Coordination id: mobility_issues_v1 */
  hasMobilityIssues?: boolean
  mobilityPeople?: number
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
  /** Resolved mobility setting for the booked date (mobility_day_override_v1). */
  mobilityEnabled?: boolean
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
  /** Rice order. `toggle_arroz` false clears it server-side. */
  toggle_arroz: boolean
  arroz_type: string
  arroz_servings: number
  /** Mobility answer; omit to leave the stored value untouched. */
  has_mobility_issues?: boolean
  mobility_people: number
  /** Ownership proof: the contact captured in the wizard. */
  verify_email: string
  verify_country_code: string
  verify_phone: string
}

/**
 * Ownership proof for the self-service endpoints. Booking ids are sequential,
 * so reading or writing a booking requires the contact the wizard already
 * captured. It is kept in sessionStorage (not in the URL) so it never leaks
 * into history, referrers or server logs.
 *
 * Coordination id: reservation_self_modification_v1
 */
export type SelfServiceProof = {
  id: number
  email: string
  countryCode: string
  phone: string
}

const SELF_SERVICE_PROOF_KEY = 'villacarmen_reserva_self_service_proof'

export function storeSelfServiceProof(proof: SelfServiceProof): void {
  try {
    sessionStorage.setItem(SELF_SERVICE_PROOF_KEY, JSON.stringify(proof))
  } catch {
    // Storage unavailable (private mode): verification simply fails and the
    // guest is pointed at the restaurant.
  }
}

export function readSelfServiceProof(): SelfServiceProof | null {
  try {
    const raw = sessionStorage.getItem(SELF_SERVICE_PROOF_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SelfServiceProof>
    if (!parsed || typeof parsed.id !== 'number') return null
    return {
      id: parsed.id,
      email: parsed.email || '',
      countryCode: parsed.countryCode || '',
      phone: parsed.phone || '',
    }
  } catch {
    return null
  }
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

/** POST /api/reservations/modify-context */
export async function fetchModifyContext(
  id: number,
  proof: { email: string; countryCode: string; phone: string },
): Promise<ModifyContextResponse> {
  const res = await apiFetch('/api/reservations/modify-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      email: proof.email,
      country_code: proof.countryCode,
      phone: proof.phone,
    }),
  })
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

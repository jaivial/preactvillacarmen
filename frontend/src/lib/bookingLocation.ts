export type BookingLocationInput = { floorDisplay?: string; salonDisplay?: string }
export type BookingLocationField = { label: 'Planta' | 'Salón'; value: string; slot: 'field-floor' | 'field-salon' }

export function bookingLocationFields(booking: BookingLocationInput): BookingLocationField[] {
  const fields: BookingLocationField[] = []
  const floor = String(booking.floorDisplay || '').trim()
  const salon = String(booking.salonDisplay || '').trim()
  if (floor) fields.push({ label: 'Planta', value: floor, slot: 'field-floor' })
  if (salon) fields.push({ label: 'Salón', value: salon, slot: 'field-salon' })
  return fields
}

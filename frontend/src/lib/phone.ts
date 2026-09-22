/**
 * Phone input helper shared by the booking wizard and the self-service
 * modification page.
 *
 * Coordination id: reservation_self_modification_v1
 */
export function onlyDigits(s: string): string {
  return s.replace(/[^0-9]/g, '')
}

import { describe, expect, it } from 'vitest'
import { bookingLocationFields } from '../bookingLocation'

describe('bookingLocationFields', () => {
  it('returns floor and salon as separate fields', () => {
    expect(bookingLocationFields({ floorDisplay: 'Planta 1', salonDisplay: 'La Condesa' })).toEqual([
      { label: 'Planta', value: 'Planta 1', slot: 'field-floor' },
      { label: 'Salón', value: 'La Condesa', slot: 'field-salon' },
    ])
  })

  it('omits location fields that were not reserved', () => {
    expect(bookingLocationFields({ floorDisplay: '', salonDisplay: 'La Condesa' })).toEqual([
      { label: 'Salón', value: 'La Condesa', slot: 'field-salon' },
    ])
  })
})

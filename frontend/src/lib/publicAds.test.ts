import { describe, expect, it } from 'vitest'

import { activeAdsForDate, type PublicAd } from './publicAds'

const ad = (overrides: Partial<PublicAd> = {}): PublicAd => ({
  id: 1,
  name: 'Anuncio',
  active: true,
  content: [],
  ctas: [],
  starts_at: '2026-08-29',
  ends_at: '2026-08-31',
  ...overrides,
})

describe('activeAdsForDate', () => {
  it('keeps only active ads whose inclusive range contains the current ISO date', () => {
    expect(activeAdsForDate([
      ad({ id: 1 }),
      ad({ id: 2, active: false }),
      ad({ id: 3, starts_at: '2026-08-30', ends_at: '2026-09-01' }),
    ], '2026-08-29').map((item) => item.id)).toEqual([1])
  })

  it('treats an active ad without dates as always visible', () => {
    expect(activeAdsForDate([ad({ starts_at: null, ends_at: null })], '2026-08-29')).toHaveLength(1)
  })
})

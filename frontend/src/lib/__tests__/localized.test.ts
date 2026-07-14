import { describe, it, expect } from 'vitest'
import { localized, localizedArray } from '../i18n'
import { normalizeMenuResponse } from '../backendAdapters'

describe('localized', () => {
  it('returns Spanish when lang is es', () => {
    expect(localized('Pan', 'Bread', 'es')).toBe('Pan')
  })
  it('returns English when lang is en and translation present', () => {
    expect(localized('Pan', 'Bread', 'en')).toBe('Bread')
  })
  it('falls back to Spanish when English missing', () => {
    expect(localized('Pan', '', 'en')).toBe('Pan')
    expect(localized('Pan', null, 'en')).toBe('Pan')
    expect(localized('Pan', undefined, 'en')).toBe('Pan')
  })
})

describe('localizedArray', () => {
  it('returns Spanish array for es', () => {
    expect(localizedArray(['a', 'b'], ['A', 'B'], 'es')).toEqual(['a', 'b'])
  })
  it('returns English for en with element-wise fallback', () => {
    expect(localizedArray(['a', 'b', 'c'], ['A', '', 'C'], 'en')).toEqual(['A', 'b', 'C'])
  })
  it('returns Spanish when English empty', () => {
    expect(localizedArray(['a'], [], 'en')).toEqual(['a'])
    expect(localizedArray(['a'], undefined, 'en')).toEqual(['a'])
  })
})

describe('normalizeMenuResponse preserves english', () => {
  it('keeps descripcion_english on dishes', () => {
    const res = normalizeMenuResponse({
      entrantes: [{ descripcion: 'Croquetas', descripcion_english: 'Croquettes' }],
      principales: [],
      arroces: [],
      precio: '20',
    })
    expect(res.entrantes[0].descripcion_english).toBe('Croquettes')
  })
})

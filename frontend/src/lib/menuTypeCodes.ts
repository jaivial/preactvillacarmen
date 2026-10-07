// Single source of truth for the public menu type domain.
//
// The backend (Go) is migrating `menus.menu_type` from string values to
// NUMERIC codes. This module is the one place that knows what every number
// means, so no consumer has to guess from a string heuristic.
//
// Coordination id: menu_type_numeric_codes_v1
//
// WHAT EACH NUMERIC VALUE MEANS (authoritative mapping shared with the
// backend migration and the backoffice):
//
//   0 = UNKNOWN / no type. Missing, blank or unrecognised data. Never used by
//       a real menu; it is the safe fallback so nothing is silently dropped.
//   1 = closed_conventional - closed conventional set menu (the default).
//   2 = closed_group         - closed group set menu.
//   3 = a_la_carte           - conventional a la carte carta.
//   4 = a_la_carte_group     - group a la carta carta.
//   5 = a_la_carte_time      - a la carte by time (carta por tiempo).
//   6 = special              - special menu (season / event).
//
// The backend keeps ACCEPTING legacy strings during a transition window, so
// `normalizeMenuType` tolerates both a code and a legacy string.

import type { PublicMenuType } from './types'

export const MENU_TYPE_UNKNOWN = 0
export const MENU_TYPE_CLOSED_CONVENTIONAL = 1
export const MENU_TYPE_CLOSED_GROUP = 2
export const MENU_TYPE_A_LA_CARTE = 3
export const MENU_TYPE_A_LA_CARTE_GROUP = 4
export const MENU_TYPE_A_LA_CARTE_TIME = 5
export const MENU_TYPE_SPECIAL = 6

/** Every known menu type code, in canonical order. */
export const MENU_TYPE_CODES = [
  MENU_TYPE_UNKNOWN,
  MENU_TYPE_CLOSED_CONVENTIONAL,
  MENU_TYPE_CLOSED_GROUP,
  MENU_TYPE_A_LA_CARTE,
  MENU_TYPE_A_LA_CARTE_GROUP,
  MENU_TYPE_A_LA_CARTE_TIME,
  MENU_TYPE_SPECIAL,
] as const

// Explicit code -> group flag map. With numeric codes a substring heuristic
// (`endsWith('_group')`) silently returns false for every menu, so the group
// concept is now a map instead of a pattern.
const GROUP_MENU_TYPE_CODES: ReadonlySet<number> = new Set([
  MENU_TYPE_CLOSED_GROUP, // 2
  MENU_TYPE_A_LA_CARTE_GROUP, // 4
])

// Legacy string tokens still emitted by the backend during the transition
// window, mapped to their code. Everything else is UNKNOWN (0).
const LEGACY_MENU_TYPE_TOKENS: Readonly<Record<string, PublicMenuType>> = {
  closed_conventional: MENU_TYPE_CLOSED_CONVENTIONAL,
  closed_group: MENU_TYPE_CLOSED_GROUP,
  a_la_carte: MENU_TYPE_A_LA_CARTE,
  a_la_carte_group: MENU_TYPE_A_LA_CARTE_GROUP,
  a_la_carte_time: MENU_TYPE_A_LA_CARTE_TIME,
  special: MENU_TYPE_SPECIAL,
}

/** True for the two group menu codes: 2 (closed group) and 4 (group carta). */
export function isGroupMenuTypeCode(menuType: unknown): boolean {
  return GROUP_MENU_TYPE_CODES.has(Number(menuType))
}

/**
 * Normalizes a raw backend value into a numeric menu type code.
 * Accepts a code (number or numeric string) and every legacy string token.
 * Anything unrecognised becomes MENU_TYPE_UNKNOWN (0).
 */
export function normalizeMenuType(value: unknown): PublicMenuType {
  if (value === null || value === undefined) return MENU_TYPE_UNKNOWN
  if (typeof value === 'number') return normalizeNumericCode(value)
  const token = String(value).trim().toLowerCase().replace(/[.\s-]+/g, '_')
  if (!token) return MENU_TYPE_UNKNOWN
  const legacy = LEGACY_MENU_TYPE_TOKENS[token]
  if (legacy !== undefined) return legacy
  return normalizeNumericCode(Number(token))
}

function normalizeNumericCode(value: number): PublicMenuType {
  if (!Number.isFinite(value)) return MENU_TYPE_UNKNOWN
  const code = Math.trunc(value)
  return (MENU_TYPE_CODES as readonly number[]).includes(code) ? (code as PublicMenuType) : MENU_TYPE_UNKNOWN
}

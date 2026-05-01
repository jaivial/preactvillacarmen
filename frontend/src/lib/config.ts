import { atom } from 'jotai'

/**
 * Global atoms for page visibility flags fetched once from the backend.
 * These are written by ClientHeader after the initial config fetch and
 * consumed by page-level guards to prevent rendering of deactivated pages.
 */
export const bebidasPageActiveAtom = atom<boolean | null>(null)
export const cafePageActiveAtom = atom<boolean | null>(null)

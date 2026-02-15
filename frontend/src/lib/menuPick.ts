import { useEffect, useMemo, useState } from 'preact/hooks'

export type MenuPickCategory = 'entrantes' | 'principales' | 'arroces'

export type MenuPickItem = {
  category: MenuPickCategory
  name: string
  qty: number
}

type MenuPickStateV1 = {
  v: 1
  items: MenuPickItem[]
}

const STORAGE_KEY = 'villacarmen_menu_pick_v1'

let loaded = false
let state: MenuPickStateV1 = { v: 1, items: [] }
const listeners = new Set<() => void>()

function normalizeName(raw: string) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeReadStorage(): MenuPickStateV1 {
  if (typeof window === 'undefined') return { v: 1, items: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { v: 1, items: [] }
    const parsed = JSON.parse(raw) as Partial<MenuPickStateV1>
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) return { v: 1, items: [] }

    const out: MenuPickItem[] = []
    for (const it of parsed.items) {
      const cat = (it as any)?.category
      const name = normalizeName((it as any)?.name)
      const qty = Number((it as any)?.qty)
      if (cat !== 'entrantes' && cat !== 'principales' && cat !== 'arroces') continue
      if (!name) continue
      if (!Number.isFinite(qty) || qty <= 0) continue
      out.push({ category: cat, name, qty: Math.floor(qty) })
    }

    return { v: 1, items: out }
  } catch {
    return { v: 1, items: [] }
  }
}

function safeWriteStorage(next: MenuPickStateV1) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore quota / privacy errors.
  }
}

function ensureLoaded() {
  if (loaded) return
  loaded = true
  state = safeReadStorage()
}

function notify() {
  for (const fn of listeners) fn()
}

function replaceState(next: MenuPickStateV1, opts?: { persist?: boolean }) {
  ensureLoaded()
  state = next
  if (opts?.persist) safeWriteStorage(state)
  notify()
}

function itemKey(cat: MenuPickCategory, name: string) {
  return `${cat}::${name}`
}

export function subscribeMenuPick(listener: () => void) {
  ensureLoaded()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getMenuPickState() {
  ensureLoaded()
  return state
}

export function addMenuPickItem(category: MenuPickCategory, rawName: string) {
  ensureLoaded()
  const name = normalizeName(rawName)
  if (!name) return

  const key = itemKey(category, name)
  const nextItems = state.items.map((x) => ({ ...x }))
  const idx = nextItems.findIndex((x) => itemKey(x.category, x.name) === key)
  if (idx >= 0) {
    nextItems[idx] = { ...nextItems[idx], qty: nextItems[idx].qty + 1 }
  } else {
    nextItems.push({ category, name, qty: 1 })
  }

  replaceState({ v: 1, items: nextItems }, { persist: true })
}

export function setMenuPickQty(category: MenuPickCategory, rawName: string, qty: number) {
  ensureLoaded()
  const name = normalizeName(rawName)
  if (!name) return

  const nextQty = Math.floor(Number(qty))
  const key = itemKey(category, name)
  const nextItems = state.items.map((x) => ({ ...x }))
  const idx = nextItems.findIndex((x) => itemKey(x.category, x.name) === key)
  if (idx >= 0) {
    if (Number.isFinite(nextQty) && nextQty > 0) nextItems[idx] = { ...nextItems[idx], qty: nextQty }
    else nextItems.splice(idx, 1)
  } else {
    if (Number.isFinite(nextQty) && nextQty > 0) nextItems.push({ category, name, qty: nextQty })
  }

  replaceState({ v: 1, items: nextItems }, { persist: true })
}

export function clearMenuPick() {
  replaceState({ v: 1, items: [] }, { persist: true })
}

export function useMenuPickSnapshot() {
  const [snap, setSnap] = useState(() => getMenuPickState())

  useEffect(() => {
    const unsub = subscribeMenuPick(() => setSnap(getMenuPickState()))

    if (typeof window === 'undefined') return unsub
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      replaceState(safeReadStorage(), { persist: false })
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      unsub()
    }
  }, [])

  const totals = useMemo(() => {
    const byCat: Record<MenuPickCategory, number> = { entrantes: 0, principales: 0, arroces: 0 }
    let total = 0
    for (const it of snap.items) {
      const q = Number(it.qty) || 0
      total += q
      byCat[it.category] += q
    }
    return { total, byCat }
  }, [snap.items])

  return { state: snap, totals }
}

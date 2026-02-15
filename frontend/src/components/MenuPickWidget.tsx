import { createPortal } from 'preact/compat'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { ChefHat } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import {
  clearMenuPick,
  setMenuPickQty,
  useMenuPickSnapshot,
  type MenuPickCategory,
  type MenuPickItem,
} from '../lib/menuPick'

function QtyStepper(props: {
  value: number
  onChange: (next: number) => void
  decAria: string
  incAria: string
}) {
  const decDisabled = props.value <= 0
  return (
    <div class="pickQty">
      <button
        type="button"
        class="pickQtyBtn"
        disabled={decDisabled}
        aria-label={props.decAria}
        onClick={() => props.onChange(props.value - 1)}
      >
        −
      </button>
      <div class="pickQtyValue" aria-live="polite">
        {props.value}
      </div>
      <button type="button" class="pickQtyBtn" aria-label={props.incAria} onClick={() => props.onChange(props.value + 1)}>
        +
      </button>
    </div>
  )
}

function groupItems(items: MenuPickItem[]) {
  const by: Record<MenuPickCategory, MenuPickItem[]> = { entrantes: [], principales: [], arroces: [] }
  for (const it of items) by[it.category].push(it)
  return by
}

export function MenuPickWidget() {
  const reduceMotion = useReducedMotion()
  const { t } = useI18n()
  const { state, totals } = useMenuPickSnapshot()
  const total = totals.total
  const byCat = totals.byCat
  const grouped = useMemo(() => groupItems(state.items), [state.items])

  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const prevTotalRef = useRef(total)
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    const prev = prevTotalRef.current
    // Avoid double animation on first mount (0 -> >0 already animates via button entrance).
    if (prev > 0 && total > prev) setPulse((p) => p + 1)
    prevTotalRef.current = total
  }, [total])

  useEffect(() => {
    if (!open) return
    const cls = 'vc-modal-open'
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const modal = open ? (
    <div class="resvModal pickModal" role="dialog" aria-modal="true" aria-label={t('menu.pick.title')}>
      <div class="resvModal__backdrop" onClick={() => setOpen(false)} />
      <motion.div
        class="resvModal__card pickModal__card"
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="pickModalTop">
          <div class="resvModal__title">{t('menu.pick.title')}</div>
          <div class="pickModalTotal" aria-label={t('menu.pick.total.aria')}>
            {total}
          </div>
        </div>

        <div class="resvModal__body">
          {total <= 0 ? (
            <div class="pickEmpty">{t('menu.pick.empty')}</div>
          ) : (
            <div class="pickSections">
              {(['entrantes', 'principales', 'arroces'] as const).map((cat) => {
                const items = grouped[cat]
                if (!items || items.length === 0) return null
                const titleKey =
                  cat === 'entrantes'
                    ? 'menus.preview.starters'
                    : cat === 'principales'
                      ? 'menus.preview.mains'
                      : 'menu.section.rice'

                return (
                  <section class="pickSection" key={cat}>
                    <div class="pickSectionHead">
                      <div class="pickSectionTitle">{t(titleKey)}</div>
                      <div class="pickSectionCount">{byCat[cat]}</div>
                    </div>

                    <ul class="pickList" role="list">
                      {items.map((it) => (
                        <li class="pickRow" key={`${it.category}::${it.name}`}>
                          <div class="pickName">{it.name}</div>
                          <QtyStepper
                            value={it.qty}
                            decAria={t('menu.pick.qty.decrease')}
                            incAria={t('menu.pick.qty.increase')}
                            onChange={(next) => setMenuPickQty(it.category, it.name, next)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>

        <div class="resvModal__actions pickModalActions">
          <button type="button" class="btn" onClick={() => clearMenuPick()} disabled={total <= 0}>
            {t('menu.pick.clear')}
          </button>
          <button type="button" class="btn primary" onClick={() => setOpen(false)}>
            {t('menu.pick.close')}
          </button>
        </div>
      </motion.div>
    </div>
  ) : null

  return (
    <>
      {total > 0 ? (
        <motion.button
          type="button"
          class="menuPickBtn"
          aria-label={t('menu.pick.open')}
          title={t('menu.pick.open')}
          onClick={() => setOpen(true)}
          initial={
            reduceMotion || !mounted ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.94, y: -2 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
          >
            <motion.span
              key={pulse}
              class="menuPickBtnInner"
              initial={reduceMotion ? { scale: 1 } : { scale: 0.96 }}
              animate={reduceMotion ? { scale: 1 } : pulse > 0 ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
            >
              <ChefHat className="menuPickIcon" aria-hidden="true" />
              <span class="menuPickBadge" aria-hidden="true">
                {total}
              </span>
            </motion.span>
          </motion.button>
      ) : null}

      {open ? (typeof document === 'undefined' ? modal : createPortal(modal, document.body)) : null}
    </>
  )
}

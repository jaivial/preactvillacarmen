import { motion, useReducedMotion } from 'motion/react'

export type StickyTabItem = {
  key: string
  label: string
}

/**
 * Presentational sticky tab bar shared by the wine, beverage and menu pages.
 *
 * Owns no data: the caller keeps the active key and reacts to `onSelect`, so the
 * same bar drives type filtering (wines, beverages) and menu section switching.
 *
 * Coordination id: menu_section_tabs_flag (menu pages render it when the
 * backoffice `show_section_tabs` flag arrives on the public menu payload).
 */
export function StickyTabBar(props: {
  items: StickyTabItem[]
  activeKey: string
  onSelect: (key: string) => void
  ariaLabel: string
  bubbleId: string
  testId: string
}) {
  const reduceMotion = useReducedMotion()
  if (props.items.length < 2) return null

  return (
    <div class="stickyTabsSticky" role="tablist" aria-label={props.ariaLabel} data-testid={props.testId}>
      <div class="stickyTabs">
        {props.items.map((item) => {
          const active = item.key === props.activeKey
          return (
            <button
              key={item.key}
              type="button"
              class={active ? 'stickyTab is-active' : 'stickyTab'}
              onClick={() => props.onSelect(item.key)}
              role="tab"
              aria-selected={active}
              data-testid={`${props.testId}-tab-${item.key}`}
            >
              {active ? (
                <motion.span
                  class="stickyTabBubble"
                  layoutId={props.bubbleId}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 260, damping: 30, mass: 1.15 }
                  }
                />
              ) : null}
              <span class="stickyTabLabel">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'

export type PopoverSelectOption = {
  value: string
  label: string
  keywords?: string
  left?: string
  right?: string
  disabled?: boolean
}

export function PopoverSelect(props: {
  ariaLabel: string
  value: string | null
  options: PopoverSelectOption[]
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
  searchable?: boolean
  autoFocusSearch?: boolean
  autoScrollPageOnOpen?: boolean
  viewportBottomPadding?: number
  searchPlaceholder?: string
  footer?: ComponentChildren
}) {
  const maxPopoverHeight = 320
  const popoverGap = 8
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [popoverMaxHeight, setPopoverMaxHeight] = useState<number | null>(null)
  const [reservedBottomSpace, setReservedBottomSpace] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const openLayoutTimeoutsRef = useRef<number[]>([])

  const selected = useMemo(
    () => (props.value ? props.options.find((o) => o.value === props.value) || null : null),
    [props.options, props.value]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!props.searchable || q === '') return props.options
    return props.options.filter((o) => {
      const hay = (o.label + ' ' + (o.keywords || '')).toLowerCase()
      return hay.includes(q)
    })
  }, [props.options, props.searchable, query])

  const clearOpenLayoutTimers = () => {
    for (const timeoutId of openLayoutTimeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    openLayoutTimeoutsRef.current = []
  }

  const getDesiredPopoverHeight = () => {
    const popover = popoverRef.current
    const list = listRef.current
    if (!popover || !list) return maxPopoverHeight
    const search = popover.querySelector<HTMLElement>('.resvSelectSearch')
    const footer = popover.querySelector<HTMLElement>('.resvSelectFooter')
    const chromeHeight = (search?.offsetHeight || 0) + (footer?.offsetHeight || 0)
    return Math.min(maxPopoverHeight, chromeHeight + list.scrollHeight)
  }

  const syncOpenLayout = () => {
    if (typeof window === 'undefined') return
    const popover = popoverRef.current
    const list = listRef.current
    if (!popover || !list) return

    const padding = props.viewportBottomPadding ?? 10
    const reservedSpace = props.autoScrollPageOnOpen ? getDesiredPopoverHeight() + popoverGap : 0
    setReservedBottomSpace((prev) => (prev === reservedSpace ? prev : reservedSpace))
    let viewportBottom = window.visualViewport
      ? window.visualViewport.offsetTop + window.visualViewport.height
      : window.innerHeight
    let rect = popover.getBoundingClientRect()

    const availableHeight = Math.max(1, Math.min(maxPopoverHeight, Math.floor(viewportBottom - rect.top - padding)))
    setPopoverMaxHeight((prev) => (prev === availableHeight ? prev : availableHeight))

    const selectedOpt = list.querySelector<HTMLElement>('.resvSelectOpt.selected')
    if (!selectedOpt) return

    const itemTop = selectedOpt.offsetTop
    const itemBottom = itemTop + selectedOpt.offsetHeight
    const visibleTop = list.scrollTop + padding
    const visibleBottom = list.scrollTop + list.clientHeight - padding

    if (itemTop < visibleTop) {
      list.scrollTop = Math.max(0, itemTop - padding)
      return
    }

    if (itemBottom > visibleBottom) {
      list.scrollTop = Math.max(0, itemBottom - list.clientHeight + padding)
    }
  }

  const scheduleOpenLayoutSync = () => {
    clearOpenLayoutTimers()
    openLayoutTimeoutsRef.current = [0, 120, 280, 480, 760].map((delay) => window.setTimeout(syncOpenLayout, delay))
  }

  const prepositionButtonForOpen = () => {
    if (typeof window === 'undefined' || !props.autoScrollPageOnOpen) return
    const button = buttonRef.current
    if (!button) return

    const padding = props.viewportBottomPadding ?? 10
    const viewportBottom = window.visualViewport
      ? window.visualViewport.offsetTop + window.visualViewport.height
      : window.innerHeight
    const desiredButtonBottom = viewportBottom - padding - popoverGap - maxPopoverHeight
    const overflowBottom = button.getBoundingClientRect().bottom - desiredButtonBottom
    if (overflowBottom <= 0) return

    const scrollTarget = Math.min(
      Math.max(0, window.scrollY + overflowBottom),
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    )
    if (scrollTarget === window.scrollY) return
    window.scrollTo({ top: scrollTarget, behavior: 'auto' })
  }

  const scrollPopoverIntoViewport = () => {
    if (typeof window === 'undefined' || !props.autoScrollPageOnOpen) return
    const button = buttonRef.current
    if (!button) return

    const padding = props.viewportBottomPadding ?? 10
    const viewportBottom = window.visualViewport
      ? window.visualViewport.offsetTop + window.visualViewport.height
      : window.innerHeight
    const buttonRect = button.getBoundingClientRect()
    const desiredPopoverHeight = getDesiredPopoverHeight()
    const estimatedBottom = buttonRect.bottom + popoverGap + desiredPopoverHeight
    const overflowBottom = estimatedBottom - (viewportBottom - padding)
    if (overflowBottom <= 0) return

    const scrollTarget = Math.min(
      Math.max(0, window.scrollY + overflowBottom),
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    )
    if (scrollTarget === window.scrollY) return
    window.scrollTo({ top: scrollTarget, behavior: 'auto' })
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        clearOpenLayoutTimers()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const root = rootRef.current
      if (!root) return
      if (e.target instanceof Node && root.contains(e.target)) return
      clearOpenLayoutTimers()
      setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('touchstart', onPointerDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (props.searchable) {
      setQuery('')
      if (props.autoFocusSearch !== false) {
        // Focus on next tick so the node exists.
        setTimeout(() => searchRef.current?.focus(), 0)
      }
    }
  }, [open, props.autoFocusSearch, props.searchable])

  useEffect(() => {
    if (!open) {
      clearOpenLayoutTimers()
      setPopoverMaxHeight(null)
      setReservedBottomSpace(0)
      return
    }

    if (props.autoScrollPageOnOpen) {
      setReservedBottomSpace(maxPopoverHeight + popoverGap)
    }
    scheduleOpenLayoutSync()

    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', scheduleOpenLayoutSync)
    visualViewport?.addEventListener('scroll', scheduleOpenLayoutSync)
    window.addEventListener('resize', scheduleOpenLayoutSync)

    return () => {
      clearOpenLayoutTimers()
      visualViewport?.removeEventListener('resize', scheduleOpenLayoutSync)
      visualViewport?.removeEventListener('scroll', scheduleOpenLayoutSync)
      window.removeEventListener('resize', scheduleOpenLayoutSync)
    }
  }, [filtered.length, open, props.autoScrollPageOnOpen])

  useEffect(() => {
    if (!open || reservedBottomSpace <= 0) return
    scheduleOpenLayoutSync()
  }, [open, reservedBottomSpace])

  useEffect(() => {
    if (!open || !props.autoScrollPageOnOpen) return
    const timeoutIds = [0, 120, 280, 480, 760].map((delay) => window.setTimeout(scrollPopoverIntoViewport, delay))
    return () => {
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [open, props.autoScrollPageOnOpen, props.viewportBottomPadding, reservedBottomSpace])

  useEffect(() => {
    if (!open || !props.autoScrollPageOnOpen || typeof ResizeObserver === 'undefined') return
    const root = rootRef.current
    const popover = popoverRef.current
    if (!root || !popover) return

    const observer = new ResizeObserver(() => {
      scrollPopoverIntoViewport()
    })
    observer.observe(root)
    observer.observe(popover)
    return () => observer.disconnect()
  }, [open, props.autoScrollPageOnOpen, reservedBottomSpace])

  const displayNode = selected ? (
    <span class="resvSelectBtn__opt">
      {selected.left ? <span class="resvSelectBtn__left">{selected.left}</span> : null}
      <span class="resvSelectBtn__label">{selected.label}</span>
      {selected.right ? <span class="resvSelectBtn__right">{selected.right}</span> : null}
    </span>
  ) : (
    <span class="resvSelectBtn__placeholder">{props.placeholder}</span>
  )

  return (
    <div class="resvSelect" ref={rootRef}>
      <div class="resvSelectAnchor">
        <button
          ref={buttonRef}
          type="button"
          class="resvSelectBtn"
          aria-label={props.ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={props.disabled}
          onClick={() => {
            const nextOpen = !open
            if (nextOpen) {
              window.setTimeout(prepositionButtonForOpen, 0)
              window.setTimeout(prepositionButtonForOpen, 120)
            }
            setOpen(nextOpen)
            if (nextOpen) scheduleOpenLayoutSync()
            else clearOpenLayoutTimers()
          }}
        >
          <span class="resvSelectBtn__value">{displayNode}</span>
          <span class="resvSelectBtn__chev" aria-hidden="true">
            ▾
          </span>
        </button>

        {open ? (
          <div
            class="resvSelectPopover"
            role="listbox"
            aria-label={props.ariaLabel}
            ref={popoverRef}
            style={popoverMaxHeight != null ? { maxHeight: `${popoverMaxHeight}px` } : undefined}
          >
            {props.searchable ? (
              <div class="resvSelectSearch">
                <input
                  ref={searchRef}
                  class="resvSelectSearch__input"
                  type="search"
                  value={query}
                  onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                  onFocus={() => scheduleOpenLayoutSync()}
                  placeholder={props.searchPlaceholder || 'Buscar'}
                  aria-label={props.searchPlaceholder || 'Buscar'}
                />
              </div>
            ) : null}

            <div class="resvSelectList" ref={listRef}>
              {filtered.length === 0 ? <div class="resvSelectEmpty">Sin resultados</div> : null}
              {filtered.map((o) => {
                const isSelected = selected?.value === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    class={isSelected ? 'resvSelectOpt selected' : 'resvSelectOpt'}
                    role="option"
                    aria-selected={isSelected}
                    disabled={o.disabled}
                    onClick={() => {
                      props.onChange(o.value)
                      clearOpenLayoutTimers()
                      setOpen(false)
                      buttonRef.current?.focus()
                    }}
                  >
                    {o.left ? <span class="resvSelectOpt__left">{o.left}</span> : null}
                    <span class="resvSelectOpt__label">{o.label}</span>
                    {o.right ? <span class="resvSelectOpt__right">{o.right}</span> : null}
                  </button>
                )
              })}
            </div>

            {props.footer ? <div class="resvSelectFooter">{props.footer}</div> : null}
          </div>
        ) : null}
      </div>

      {reservedBottomSpace > 0 ? <div aria-hidden="true" style={{ height: `${reservedBottomSpace}px` }} /> : null}
    </div>
  )
}

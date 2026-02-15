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
  searchPlaceholder?: string
  footer?: ComponentChildren
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const root = rootRef.current
      if (!root) return
      if (e.target instanceof Node && root.contains(e.target)) return
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
      // Focus on next tick so the node exists.
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open, props.searchable])

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
      <button
        ref={buttonRef}
        type="button"
        class="resvSelectBtn"
        aria-label={props.ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={props.disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span class="resvSelectBtn__value">{displayNode}</span>
        <span class="resvSelectBtn__chev" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div class="resvSelectPopover" role="listbox" aria-label={props.ariaLabel}>
          {props.searchable ? (
            <div class="resvSelectSearch">
              <input
                ref={searchRef}
                class="resvSelectSearch__input"
                type="search"
                value={query}
                onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                placeholder={props.searchPlaceholder || 'Buscar'}
                aria-label={props.searchPlaceholder || 'Buscar'}
              />
            </div>
          ) : null}

          <div class="resvSelectList">
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
  )
}

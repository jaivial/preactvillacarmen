import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

interface SelectorOption {
  value: string
  label: string
}

interface SelectorProps {
  options: SelectorOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  id?: string
}

export function Selector({ options, value, onChange, placeholder = 'Seleccione', label, id }: SelectorProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(o => o.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  const handleSelect = useCallback((val: string) => {
    onChange(val)
    setOpen(false)
  }, [onChange])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div class="baSelector" data-ui="selector" ref={containerRef}>
      {label && (
        <label class="baSelectorLabel" data-slot="label" htmlFor={id}>{label}</label>
      )}
      <button
        type="button"
        class={`baSelectorTrigger ${open ? 'is-open' : ''} ${!value ? 'is-placeholder' : ''}`}
        data-slot="trigger"
        data-role="dropdown-trigger"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(prev => !prev)}
      >
        <span data-slot="display">{displayLabel}</span>
        <svg class="baSelectorChevron" viewBox="0 0 20 20" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>
      {open && (
        <ul class="baSelectorList" data-slot="options" role="listbox" aria-label={label || 'Opciones'}>
          {options.map(opt => (
            <li
              key={opt.value}
              class={`baSelectorOption ${opt.value === value ? 'is-selected' : ''}`}
              data-slot="option"
              data-value={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

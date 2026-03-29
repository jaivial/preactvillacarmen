import { useCallback } from 'preact/hooks'

interface CounterProps {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  label?: string
}

export function Counter({ value, min = 1, max = 99, onChange, label }: CounterProps) {
  const decrement = useCallback(() => {
    if (value > min) onChange(value - 1)
  }, [value, min, onChange])

  const increment = useCallback(() => {
    if (value < max) onChange(value + 1)
  }, [value, max, onChange])

  return (
    <div class="baCounter" data-ui="counter" data-role="stepper">
      {label && (
        <span class="baCounterLabel" data-slot="label">{label}</span>
      )}
      <div class="baCounterControls" data-slot="controls">
        <button
          type="button"
          class="baCounterBtn baCounterBtn--minus"
          data-slot="decrement"
          aria-label="Disminuir"
          onClick={decrement}
          disabled={value <= min}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><line x1="4" y1="10" x2="16" y2="10" /></svg>
        </button>
        <span class="baCounterValue" data-slot="value" aria-live="polite">{value}</span>
        <button
          type="button"
          class="baCounterBtn baCounterBtn--plus"
          data-slot="increment"
          aria-label="Aumentar"
          onClick={increment}
          disabled={value >= max}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><line x1="10" y1="4" x2="10" y2="16" /><line x1="4" y1="10" x2="16" y2="10" /></svg>
        </button>
      </div>
    </div>
  )
}

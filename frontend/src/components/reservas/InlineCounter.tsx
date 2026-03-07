export function InlineCounter(props: {
  value: number
  min: number
  max: number
  onChange: (next: number) => void
  ariaLabel: string
  disabled?: boolean
}) {
  const decDisabled = props.disabled || props.value <= props.min
  const incDisabled = props.disabled || props.value >= props.max

  return (
    <div class="resvInlineCounter" data-ui="inline-counter">
      <button
        type="button"
        class="resvInlineCounter__btn resvInlineCounter__btn--dec"
        disabled={decDisabled}
        aria-label={`Disminuir ${props.ariaLabel}`}
        onClick={() => props.onChange(Math.max(props.min, props.value - 1))}
      >
        −
      </button>
      <div class="resvInlineCounter__value" aria-live="polite" aria-label={props.ariaLabel}>
        {props.value}
      </div>
      <button
        type="button"
        class="resvInlineCounter__btn resvInlineCounter__btn--inc"
        disabled={incDisabled}
        aria-label={`Aumentar ${props.ariaLabel}`}
        onClick={() => props.onChange(Math.min(props.max, props.value + 1))}
      >
        +
      </button>
    </div>
  )
}

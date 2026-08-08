export function InlineCounter(props: {
  value: number
  min: number
  max: number
  onChange: (next: number) => void
  ariaLabel: string
  disabled?: boolean
  testId?: string
}) {
  const decDisabled = props.disabled || props.value <= props.min
  const incDisabled = props.disabled || props.value >= props.max
  const tid = props.testId || 'inline-counter'

  return (
    <div class="resvInlineCounter" data-ui="inline-counter" data-testid={tid}>
      <button
        type="button"
        class="resvInlineCounter__btn resvInlineCounter__btn--dec"
        data-testid={`${tid}-decrement`}
        disabled={decDisabled}
        aria-label={`Disminuir ${props.ariaLabel}`}
        onClick={() => props.onChange(Math.max(props.min, props.value - 1))}
      >
        −
      </button>
      <div class="resvInlineCounter__value" aria-live="polite" aria-label={props.ariaLabel} data-testid={`${tid}-value`}>
        {props.value}
      </div>
      <button
        type="button"
        class="resvInlineCounter__btn resvInlineCounter__btn--inc"
        data-testid={`${tid}-increment`}
        disabled={incDisabled}
        aria-label={`Aumentar ${props.ariaLabel}`}
        onClick={() => props.onChange(Math.min(props.max, props.value + 1))}
      >
        +
      </button>
    </div>
  )
}

export function Counter(props: {
  value: number
  min: number
  max: number
  onChange: (next: number) => void
  ariaLabel: string
  subtitle?: string
  className?: string
  testId?: string
}) {
  const decDisabled = props.value <= props.min
  const incDisabled = props.value >= props.max
  const rootClass = props.className ? `resvCounter ${props.className}` : 'resvCounter'
  const tid = props.testId || 'counter'

  return (
    <div class={rootClass} data-testid={tid}>
      <div class="resvCounter__head" data-testid={`${tid}-head`}>
        <div class="resvCounter__title" data-testid={`${tid}-title`}>{props.ariaLabel}</div>
        {props.subtitle ? <div class="resvCounter__sub" data-testid={`${tid}-subtitle`}>{props.subtitle}</div> : null}
      </div>

      <div class="resvCounter__body" data-testid={`${tid}-body`}>
        <button
          type="button"
          class="resvCounterBtn"
          data-testid={`${tid}-decrement`}
          disabled={decDisabled}
          aria-label="Disminuir"
          onClick={() => props.onChange(Math.max(props.min, props.value - 1))}
        >
          −
        </button>
        <div class="resvCounterValue" aria-live="polite" data-testid={`${tid}-value`}>
          {props.value}
        </div>
        <button
          type="button"
          class="resvCounterBtn"
          data-testid={`${tid}-increment`}
          disabled={incDisabled}
          aria-label="Aumentar"
          onClick={() => props.onChange(Math.min(props.max, props.value + 1))}
        >
          +
        </button>
      </div>
    </div>
  )
}

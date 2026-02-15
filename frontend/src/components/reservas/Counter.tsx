export function Counter(props: {
  value: number
  min: number
  max: number
  onChange: (next: number) => void
  ariaLabel: string
  subtitle?: string
}) {
  const decDisabled = props.value <= props.min
  const incDisabled = props.value >= props.max

  return (
    <div class="resvCounter">
      <div class="resvCounter__head">
        <div class="resvCounter__title">{props.ariaLabel}</div>
        {props.subtitle ? <div class="resvCounter__sub">{props.subtitle}</div> : null}
      </div>

      <div class="resvCounter__body">
        <button
          type="button"
          class="resvCounterBtn"
          disabled={decDisabled}
          aria-label="Disminuir"
          onClick={() => props.onChange(Math.max(props.min, props.value - 1))}
        >
          −
        </button>
        <div class="resvCounterValue" aria-live="polite">
          {props.value}
        </div>
        <button
          type="button"
          class="resvCounterBtn"
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


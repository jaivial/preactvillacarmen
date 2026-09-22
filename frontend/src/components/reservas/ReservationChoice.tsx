/**
 * Yes / no pair used by the rice and mobility questions, extracted from the
 * booking wizard so both wizards ask them the same way.
 *
 * Coordination id: reservation_choice_v1
 */
export function ReservationChoice(props: {
  /** Prefix for the derived data-testids, e.g. `reservas-rice`. */
  testId: string
  value: boolean | null
  onChange: (next: boolean) => void
  yesLabel: string
  noLabel: string
}) {
  const t = props.testId
  return (
    <div class="resvYesNo" data-testid={`${t}-choices`}>
      <button
        type="button"
        data-testid={`${t}-yes`}
        class={props.value === true ? 'resvChoice selected' : 'resvChoice'}
        onClick={() => props.onChange(true)}
      >
        {props.yesLabel}
      </button>
      <button
        type="button"
        data-testid={`${t}-no`}
        class={props.value === false ? 'resvChoice selected' : 'resvChoice'}
        onClick={() => props.onChange(false)}
      >
        {props.noLabel}
      </button>
    </div>
  )
}

/**
 * Service-time picker, extracted from the booking wizard so the self-service
 * modify wizard offers the same buttons, status colours and confirmation chip.
 *
 * Coordination id: reservation_hour_picker_v1
 */
export function ReservationHourPicker(props: {
  /** Prefix for the derived data-testids, e.g. `reservas`. */
  testId: string
  label: string
  hours: { hour: string; status: string }[]
  value: string | null
  onChange: (hour: string) => void
  emptyLabel: string
  text: (es: string, en: string) => string
}) {
  const t = props.testId
  const selected = props.hours.find((h) => h.hour === props.value) || null

  return (
    <div class="resvField" data-testid={`${t}-hours-field`}>
      <div class="resvLabel" data-testid={`${t}-hours-label`}>{props.label}</div>
      {props.hours.length > 0 ? (
        <>
          <div class="resvHours" data-testid={`${t}-hours-list`}>
            {props.hours.map((h) => (
              <button
                type="button"
                key={h.hour}
                data-testid={`${t}-hour-option-${h.hour.replace(/[^0-9]/g, '-')}`}
                class={
                  props.value === h.hour
                    ? h.status === 'limited'
                      ? 'resvHourBtn selected limited'
                      : 'resvHourBtn selected'
                    : h.status === 'limited'
                      ? 'resvHourBtn limited'
                      : 'resvHourBtn'
                }
                onClick={() => props.onChange(h.hour)}
              >
                {h.hour}
              </button>
            ))}
          </div>
          {selected ? (
            <div
              data-testid={`${t}-selected-hour`}
              class={selected.status === 'limited' ? 'resvSelectedTime limited' : 'resvSelectedTime'}
            >
              {props.text('Hora seleccionada:', 'Selected time:')} {selected.hour}
            </div>
          ) : null}
        </>
      ) : (
        <div class="resvEmpty" data-testid={`${t}-hours-empty`}>{props.emptyLabel}</div>
      )}
    </div>
  )
}

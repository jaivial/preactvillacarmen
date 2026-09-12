import { Counter } from './Counter'

export type CounterField = {
  key: string
  label: string
  value: number
  min: number
  max: number
  onChange: (next: number) => void
  subtitle?: string
  testId: string
}

export function CounterGroup(props: { fields: CounterField[]; testId: string }) {
  return (
    <div class="resvCounterGroup" data-testid={props.testId}>
      {props.fields.map((f) => (
        <Counter
          key={f.key}
          testId={f.testId}
          ariaLabel={f.label}
          value={f.value}
          min={f.min}
          max={f.max}
          onChange={f.onChange}
          subtitle={f.subtitle}
          className="resvCounter--plain"
        />
      ))}
    </div>
  )
}

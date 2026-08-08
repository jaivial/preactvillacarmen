import * as CheckboxPrimitive from '@radix-ui/react-checkbox'

type CheckboxVariant = 'default' | 'accent'
type CheckboxSize = 'default' | 'sm' | 'lg'

export function Checkbox(props: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  variant?: CheckboxVariant
  size?: CheckboxSize
  disabled?: boolean
  className?: string
  id?: string
  testId?: string
  'aria-label'?: string
}) {
  const {
    checked,
    onCheckedChange,
    variant = 'default',
    size = 'default',
    disabled,
    className,
    id,
    testId,
    'aria-label': ariaLabel,
  } = props
  const tid = testId || 'checkbox'

  const classes = [
    'resvCheckbox',
    variant === 'accent' ? 'is-accent' : '',
    size === 'sm' ? 'is-sm' : '',
    size === 'lg' ? 'is-lg' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <CheckboxPrimitive.Root
      type="button"
      id={id}
      className={classes}
      data-testid={tid}
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onCheckedChange={(v) => onCheckedChange(v === true)}
    >
      <CheckboxPrimitive.Indicator className="resvCheckboxIndicator" forceMount data-testid={`${tid}-indicator`}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          data-testid={`${tid}-icon`}
        >
          <path
            data-testid={`${tid}-icon-path`}
            d="M20 7L10.5 16.5L4 10"
            stroke="currentColor"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}


import type { ComponentChildren } from 'preact'

/**
 * Generic call-to-action link rendered as a button.
 *
 * Single responsibility: presentation of one link. Callers decide the label,
 * destination and tracking ids, so the same component serves the special-menu
 * "RESERVAR" button and any future CTA (WhatsApp, menu page, reservas...).
 */
export type CtaButtonProps = {
  href: string
  label: ComponentChildren
  testId: string
  newTab?: boolean
  /** Uses the site's `.btn.primary` look unless set to false. */
  primary?: boolean
  className?: string
  coordinationId?: string
}

export function CtaButton(props: CtaButtonProps) {
  if (!props.href) return null
  return (
    <a
      class={`btn${props.primary === false ? '' : ' primary'}${props.className ? ` ${props.className}` : ''}`}
      href={props.href}
      target={props.newTab ? '_blank' : undefined}
      rel={props.newTab ? 'noreferrer' : undefined}
      data-testid={props.testId}
      data-coordination-id={props.coordinationId}
    >
      {props.label}
    </a>
  )
}

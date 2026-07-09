import { useEffect, useState } from 'preact/hooks'

export type PopoverPlacement = 'down' | 'up'

export type PopoverPlacementOptions = {
  /** Gap between trigger and popover, in CSS pixels. Defaults to 8. */
  gap?: number
  /**
   * Reserve a few pixels of breathing room at the viewport edge so the
   * popover never hugs the screen border. Defaults to 8.
   */
  margin?: number
  /**
   * Hard cap on the popover's height in CSS pixels. Defaults to 360,
   * matching the design (search input + scrollable list + footer).
   */
  maxHeight?: number
  /**
   * Force a placement regardless of available space. Useful for tests
   * and for callers that know better than the heuristic.
   */
  force?: PopoverPlacement
  /**
   * Vertical space (CSS pixels) reserved for non-list content inside
   * the popover — search input, footer, paddings. The list's max-height
   * is computed as `maxHeight - chromeSize` so it never pushes the
   * popover past its cap. Defaults to 56.
   */
  chromeSize?: number
}

export type PopoverPlacementResult = {
  placement: PopoverPlacement
  /** Recommended popover max-height, already accounting for both edges. */
  maxHeight: number
  /**
   * Recommended inner list max-height. The popover's chrome (optional
   * search input + optional footer) is subtracted from `maxHeight` so
   * the scrollable list fits inside the popover without overflow.
   */
  listMaxHeight: number
}

/**
 * Decide whether a popover anchored to `ref` should render below or above
 * the trigger, so it always fits inside the viewport. Re-measures on
 * resize and on every scroll event (capture phase) so nested scrollers
 * (e.g. inside the reservation form) update placement live.
 */
export function usePopoverPlacement(
  ref: { current: HTMLElement | null },
  open: boolean,
  options: PopoverPlacementOptions = {}
): PopoverPlacementResult {
  const gap = options.gap ?? 8
  const margin = options.margin ?? 8
  const cap = options.maxHeight ?? 360
  const force = options.force
  const chromeSize = options.chromeSize ?? 56

  const [result, setResult] = useState<PopoverPlacementResult>(() => ({
    placement: force ?? 'down',
    maxHeight: cap,
    listMaxHeight: Math.max(80, cap - chromeSize),
  }))

  useEffect(() => {
    if (!open || typeof window === 'undefined') return

    const measure = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      const spaceBelow = vh - rect.bottom - margin
      const spaceAbove = rect.top - margin
      const need = cap + gap
      const placement: PopoverPlacement =
        force ?? (spaceBelow >= need || spaceBelow >= spaceAbove ? 'down' : 'up')
      const available = placement === 'down' ? spaceBelow - gap : spaceAbove - gap
      const maxHeight = Math.max(80, Math.min(cap, available))
      const listMaxHeight = Math.max(80, maxHeight - chromeSize)
      setResult((prev) =>
        prev.placement === placement &&
        prev.maxHeight === maxHeight &&
        prev.listMaxHeight === listMaxHeight
          ? prev
          : { placement, maxHeight, listMaxHeight }
      )
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true, capture: true })
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, { capture: true } as EventListenerOptions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, force, gap, margin, cap, chromeSize])

  return result
}

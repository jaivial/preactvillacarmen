import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { adVariantForWidth, type PublicAd, type PublicAdDesign } from '../lib/publicAds'

/*
 * Coordination id: ads_html_editor_v1 - popover of an HTML ad (built with the
 * backoffice HTML editor). Each page (the ad, or the cards page and the detail
 * of each card of a multiple ad) renders in an iframe from the backend render
 * endpoint; the page posts its height (the iframe follows it) and the card a
 * visitor opens. "Volver" goes back to the cards. The window chrome (width,
 * corners, background, overlay) comes from the design; the backoffice editor
 * draws the same window over this site (20px margin, 80vh tall at most).
 */

type Message = { type?: string; ad?: number; step?: string; event?: string; height?: number; target?: string }

const FOCUSABLE = 'button, a[href], iframe'
const SENTINEL = { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' } as const

export function PublicHtmlAdPopover(props: { ad: PublicAd & { design: PublicAdDesign }; onClose: () => void }) {
  const { ad, onClose } = props
  const design = ad.design
  const steps = design.kind === 'multiple' ? design.steps ?? [] : []
  const [stepId, setStepId] = useState<string | null>(null)
  const [height, setHeight] = useState(0)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  const step = steps.find((s) => s.id === stepId) ?? null

  // Backoffice "Ver en la web" may open a given step (?vc_preview=1&vc_step=).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    setStepId(q.get('vc_preview') === '1' ? q.get('vc_step') : null)
  }, [ad.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('vc-modal-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('vc-modal-open')
    }
  }, [onClose])

  // Height and card clicks reported by the page inside the iframe. A layout
  // effect: it listens before the iframe can load, and the iframe onLoad asks
  // for the height again in case the first report came earlier.
  useLayoutEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return
      const m = event.data as Message | null
      if (!m || m.type !== 'vc-ad' || m.ad !== ad.id) return
      if (m.event === 'height' && typeof m.height === 'number' && m.height > 0 && (m.step || '') === (step?.id || '')) setHeight(m.height)
      if (m.event === 'step' && m.target && steps.some((s) => s.id === m.target)) {
        setHeight(0)
        setStepId(m.target)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [ad.id, step, steps])

  // Focus trap (a11y): Tab stays inside the dialog; focus returns on close.
  // Tab presses inside the ad iframe never reach this document: the
  // sentinels at both ends of the dialog are the exit that brings focus back.
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!(active instanceof HTMLElement && modal.contains(active))) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [])

  useEffect(() => {
    modalRef.current?.querySelector<HTMLElement>(step ? '.publicAdBack' : '.publicAdClose')?.focus()
  }, [step])

  const focusEdge = (edge: 'first' | 'last') => {
    const items = modalRef.current ? Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
    ;(edge === 'first' ? items[0] : items[items.length - 1])?.focus()
  }

  const chrome = design.container ?? {}
  const modalStyle = {
    ['--vc-ad-modal-max' as string]: `${chrome.max_width || 560}px`,
    borderRadius: chrome.radius !== undefined ? `${chrome.radius}px` : undefined,
    background: chrome.background || undefined,
  } as const
  // The device of the visitor (mobile / tablet / desktop): the design can lay
  // out per device, and the ad window is as wide on a tablet as on a desktop.
  const device = typeof window === 'undefined' ? 'desktop' : adVariantForWidth(window.innerWidth)
  const src = `/api/public/ads/${ad.id}/render?src=villacarmen-home&vp=${device}${step ? `&step=${encodeURIComponent(step.id)}` : ''}`

  const modal = (
    <div
      class="publicAdOverlay"
      role="presentation"
      style={chrome.overlay ? { background: chrome.overlay } : undefined}
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <section ref={modalRef} class="publicAdModal publicAdModal--html" role="dialog" aria-modal="true" aria-label={step?.title || ad.name || 'Anuncio'} style={modalStyle}>
        <span tabindex={0} style={SENTINEL} onFocus={() => focusEdge('last')} />
        <button type="button" class="publicAdClose" aria-label="Cerrar anuncio" onClick={onClose}>×</button>
        {step ? (
          <button
            type="button"
            class="publicAdBack publicAdBack--overlay"
            onClick={() => {
              setHeight(0)
              setStepId(null)
            }}
          >
            Volver
          </button>
        ) : null}
        <div class="publicAdScroll">
          <iframe
            key={src}
            ref={frameRef}
            src={src}
            title={step?.title || ad.name || 'Anuncio'}
            loading="eager"
            onLoad={() => frameRef.current?.contentWindow?.postMessage({ type: 'vc-ad-measure' }, '*')}
            style={{ height: `${height || 320}px` }}
          />
        </div>
        <span tabindex={0} style={SENTINEL} onFocus={() => focusEdge('first')} />
      </section>
    </div>
  )

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}

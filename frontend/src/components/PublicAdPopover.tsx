import { useEffect, useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import type { PublicAd } from '../lib/publicAds'
import { adCanvasDimsForWidth } from '../lib/publicAds'
import { safeUrl } from '../lib/safeUrl'
import { PublicHtmlAdPopover } from './PublicHtmlAdPopover'

/** HTML ads (ads_html_editor_v1) and ads still in the previous format. */
export function PublicAdPopover(props: { ad: PublicAd; onClose: () => void }) {
  const { design } = props.ad
  return design ? <PublicHtmlAdPopover ad={{ ...props.ad, design }} onClose={props.onClose} /> : <LegacyAdPopover {...props} />
}

function LegacyAdPopover(props: { ad: PublicAd; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('vc-modal-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('vc-modal-open')
    }
  }, [props])

  // Coordination id: ads_canvas_breakpoints_v1 - the popover renders the same
  // responsive variant a visitor's viewport maps to, and re-picks it when a
  // resize crosses a breakpoint (768 / 1024, shared with the backend + studio).
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth))
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [stepId, setStepId] = useState<string | null>(null)
  useEffect(() => { const q = new URLSearchParams(window.location.search); setStepId(q.get('vc_preview') === '1' ? q.get('vc_step') : null) }, [props.ad.id])

  // Focus management (a11y): the dialog traps Tab/Shift+Tab while open and
  // returns focus to whatever was focused before it opened. Invisible
  // sentinels at both ends are the real exit for focus coming back out of
  // the canvas iframes, whose inner documents fire no keydown here. An
  // iframe as the last focusable is NEVER a wrap boundary: Tab on it must
  // enter its interactive content, and the end sentinel catches the exit.
  // Declared after the stepId state (TDZ crash if placed earlier) and before
  // the focus-placement effect, so previouslyFocused is captured first.
  const modalRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusables = () =>
      Array.from(modal.querySelectorAll<HTMLElement>('button, a[href], iframe')).filter((el) => !el.hasAttribute('disabled'))
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const inside = active instanceof HTMLElement && modal.contains(active)
      if (!inside) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (!event.shiftKey && active === last && last.tagName !== 'IFRAME') {
        event.preventDefault()
        first.focus()
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

  // Keep focus inside the dialog across view changes (list <-> step detail):
  // the previously focused button unmounts, so re-place it explicitly.
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return
    const target = modal.querySelector<HTMLElement>(stepId ? '.publicAdBack' : '.publicAdClose')
    target?.focus()
  }, [stepId])
  const steps = props.ad.layout?.mode === 'multiple' ? props.ad.layout.steps : []
  const step = steps.find((s) => s.id === stepId)
  const content = step?.content ?? props.ad.content
  const slotted = props.ad.ctas.filter((cta) => typeof cta.slot === 'number')
  const trailing = props.ad.ctas.filter((cta) => typeof cta.slot !== 'number')
  const renderCta = (cta: PublicAd['ctas'][number]) => {
    const href = safeUrl(cta.navigation_mode === 'custom' ? cta.custom_url : cta.route)
    return href ? <a key={cta.id} href={href} class="publicAdAction" style={{ backgroundColor: cta.color || undefined }}>{cta.text}</a> : null
  }

  const canvas = steps.length ? step?.canvas : props.ad.canvas
  const dims = canvas ? adCanvasDimsForWidth(canvas, viewportWidth) : null

  // Container chrome overrides (ads_canvas_container_v1) edited in the
  // backoffice studio: popover max width, overlay color and modal radius.
  // Default: the modal hugs the edited canvas (1 canvas px = 1 screen px);
  // an explicit maxWidth caps it. Mirrored in AdVisualStudio (backoffice).
  const MODAL_PAD_X = 0
  const container = { ...canvas?.container, ...(dims?.variant === "mobile" || dims?.variant === "tablet" ? canvas?.variants?.[dims.variant]?.container : undefined) }
  const modalStyle = {
    ['--vc-ad-modal-max' as string]: container?.maxWidth
      ? `${container.maxWidth}px`
      : dims ? `${dims.width + 2 * MODAL_PAD_X}px` : undefined,
    borderRadius: container?.radius !== undefined ? `${container.radius}px` : undefined,
  } as const
  const detailBg = step?.detail_background_mode || step?.background_mode
  const detailImage = step?.detail_background_image || step?.background_image
  const detailStyle = !canvas && step ? {
    backgroundColor: detailBg === 'color' ? (step.detail_background_color || step.background_color) : detailBg === 'transparent' ? 'transparent' : undefined,
    backgroundImage: detailBg === 'image' && safeUrl(detailImage) ? `url(${safeUrl(detailImage)})` : undefined,
    backgroundSize: 'cover',
  } : undefined
  const overlayStyle = container?.overlay ? { background: container.overlay } as const : undefined

  const modal = (
    <div class="publicAdOverlay" role="presentation" style={overlayStyle} onClick={(event) => {
      if (event.currentTarget === event.target) props.onClose()
    }}>
      <section ref={modalRef} class={`publicAdModal${canvas ? " publicAdModal--canvas" : ""}`} role="dialog" aria-modal="true" aria-label={props.ad.name || 'Anuncio'} style={{ ...modalStyle, ...detailStyle }}>
        <span tabindex={0} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} onFocus={() => { const items = modalRef.current ? Array.from(modalRef.current.querySelectorAll<HTMLElement>('button, a[href], iframe')).filter((el) => !el.hasAttribute('disabled')) : []; items[items.length - 1]?.focus() }} />
        <button type="button" class="publicAdClose" aria-label="Cerrar anuncio" onClick={props.onClose}>×</button>
        {steps.length && !step ? (
          <div class="publicAdContent publicAdContent--steps">
            {steps.map((item) => <div key={item.id} style={{ backgroundColor: item.background_mode === 'color' ? item.background_color : undefined, backgroundImage: item.background_mode === 'image' && safeUrl(item.background_image) ? `url(${safeUrl(item.background_image)})` : undefined, padding: '16px', borderRadius: '12px' }}>
              {item.card_canvas ? (() => {
                const cardDims = adCanvasDimsForWidth(item.card_canvas, viewportWidth)
                return <div class="publicAdCanvasFrame" style={{ aspectRatio: `${cardDims.width} / ${cardDims.height}`, width: '100%' }}>
                  <iframe src={`/api/public/ads/${props.ad.id}/render?src=villacarmen-home&variant=${cardDims.variant}&step=${encodeURIComponent(item.id)}&card=1`} title={item.title || 'Anuncio'} style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
                </div>
              })() : <><h2>{item.title}</h2><p>{item.description}</p></>}
              {item.buttons.map(renderCta)}
              <button type="button" class="publicAdAction" onClick={() => setStepId(item.id)} aria-label={`Abrir ${item.title}`}>{item.see_more === false ? 'Abrir' : 'Ver más'}</button>
            </div>)}
          </div>
        ) : <>
        {step ? <button type="button" class={canvas ? "publicAdBack publicAdBack--overlay" : "publicAdBack"} onClick={() => setStepId(null)}>Volver</button> : null}
        {canvas && dims ? (
          <div
            class="publicAdCanvasFrame"
            style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
          >
            <iframe
              src={`/api/public/ads/${props.ad.id}/render?src=villacarmen-home&variant=${dims.variant}${step ? `&step=${encodeURIComponent(step.id)}` : ""}`}
              title={props.ad.name || 'Anuncio'}
              loading="eager"
            />
          </div>
        ) : (
        <div class="publicAdContent">
          {content.map((item, index) => {
            const style = { textAlign: item.align || 'left' } as const
            // Coordination id: ads_button_slot_v1 - buttons placed inside the
            // content flow render before the content index they point at.
            const before = slotted.filter((cta) => cta.slot === index).map(renderCta)
            if (item.type === 'image') return [...before, item.value ? <img key={item.id} class="publicAdImage" src={item.value} alt="" /> : null]
            if (item.type === 'title') return [...before, <h2 key={item.id} style={style}>{item.value}</h2>]
            if (item.type === 'subtitle') return [...before, <h3 key={item.id} style={style}>{item.value}</h3>]
            return [...before, <p key={item.id} style={style}>{item.value}</p>]
          })}
          {slotted.filter((cta) => (cta.slot as number) >= content.length).map(renderCta)}
        {trailing.length ? (
          <div class="publicAdActions">
            {trailing.map(renderCta)}
          </div>
        ) : null}
        </div>
        )}</>}
        <span tabindex={0} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} onFocus={() => { const items = modalRef.current ? Array.from(modalRef.current.querySelectorAll<HTMLElement>('button, a[href], iframe')).filter((el) => !el.hasAttribute('disabled')) : []; items[0]?.focus() }} />
      </section>
    </div>
  )

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}

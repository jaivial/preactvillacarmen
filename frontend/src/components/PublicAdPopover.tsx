import { useEffect } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import type { PublicAd } from '../lib/publicAds'
import { safeUrl } from '../lib/safeUrl'

export function PublicAdPopover(props: { ad: PublicAd; onClose: () => void }) {
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

  const slotted = props.ad.ctas.filter((cta) => typeof cta.slot === 'number')
  const trailing = props.ad.ctas.filter((cta) => typeof cta.slot !== 'number')
  const renderCta = (cta: PublicAd['ctas'][number]) => {
    const href = safeUrl(cta.navigation_mode === 'custom' ? cta.custom_url : cta.route)
    return href ? <a key={cta.id} href={href} class="publicAdAction" style={{ backgroundColor: cta.color || undefined }}>{cta.text}</a> : null
  }

  const modal = (
    <div class="publicAdOverlay" role="presentation" onClick={(event) => {
      if (event.currentTarget === event.target) props.onClose()
    }}>
      <section class="publicAdModal" role="dialog" aria-modal="true" aria-label={props.ad.name || 'Anuncio'}>
        <button type="button" class="publicAdClose" aria-label="Cerrar anuncio" onClick={props.onClose}>×</button>
        <div class="publicAdContent">
          {props.ad.content.map((item, index) => {
            const style = { textAlign: item.align || 'left' } as const
            // Coordination id: ads_button_slot_v1 - buttons placed inside the
            // content flow render before the content index they point at.
            const before = slotted.filter((cta) => cta.slot === index).map(renderCta)
            if (item.type === 'image') return [...before, item.value ? <img key={item.id} class="publicAdImage" src={item.value} alt="" /> : null]
            if (item.type === 'title') return [...before, <h2 key={item.id} style={style}>{item.value}</h2>]
            if (item.type === 'subtitle') return [...before, <h3 key={item.id} style={style}>{item.value}</h3>]
            return [...before, <p key={item.id} style={style}>{item.value}</p>]
          })}
          {slotted.filter((cta) => (cta.slot as number) >= props.ad.content.length).map(renderCta)}
        </div>
        {trailing.length ? (
          <div class="publicAdActions">
            {trailing.map(renderCta)}
          </div>
        ) : null}
      </section>
    </div>
  )

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}

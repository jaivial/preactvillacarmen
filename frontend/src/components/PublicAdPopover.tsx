import { useEffect } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import type { PublicAd } from '../lib/publicAds'

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

  const modal = (
    <div class="publicAdOverlay" role="presentation" onClick={(event) => {
      if (event.currentTarget === event.target) props.onClose()
    }}>
      <section class="publicAdModal" role="dialog" aria-modal="true" aria-label={props.ad.name || 'Anuncio'}>
        <button type="button" class="publicAdClose" aria-label="Cerrar anuncio" onClick={props.onClose}>×</button>
        <div class="publicAdContent">
          {props.ad.content.map((item) => {
            const style = { textAlign: item.align || 'left' } as const
            if (item.type === 'image') return item.value ? <img key={item.id} class="publicAdImage" src={item.value} alt="" /> : null
            if (item.type === 'title') return <h2 key={item.id} style={style}>{item.value}</h2>
            if (item.type === 'subtitle') return <h3 key={item.id} style={style}>{item.value}</h3>
            return <p key={item.id} style={style}>{item.value}</p>
          })}
        </div>
        {props.ad.ctas.length ? (
          <div class="publicAdActions">
            {props.ad.ctas.map((cta) => {
              const href = cta.navigation_mode === 'custom' ? cta.custom_url : cta.route
              return href ? <a key={cta.id} href={href} class="publicAdAction" style={{ backgroundColor: cta.color || undefined }}>{cta.text}</a> : null
            })}
          </div>
        ) : null}
      </section>
    </div>
  )

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}

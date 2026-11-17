export type CdnGalleryItem = {
  src: string
  alt: string
  width: number
  height: number
}

// Coordination id: galerias_seo_locales_20261117 - approved photo additions
// served from the BunnyCDN pull zone; existing page media stays untouched.
export function CdnGallery(props: {
  id: string
  label: string
  items: CdnGalleryItem[]
  portrait?: boolean
  bare?: boolean
}) {
  if (!props.items.length) return null
  return (
    <section
      class={`${props.bare ? '' : 'container '}cdn-gallery${props.portrait ? ' cdn-gallery--portrait' : ''}`}
      aria-label={props.label}
      data-testid={`cdn-gallery-${props.id}`}
      data-coordination-id="galerias_seo_locales_20261117"
    >
      <div class="cdn-gallery-grid">
        {props.items.map((item, index) => (
          <figure class="cdn-gallery-item" key={item.src}>
            <img
              src={item.src}
              alt={item.alt}
              title={item.alt}
              width={item.width}
              height={item.height}
              loading="lazy"
              decoding="async"
              data-testid={`cdn-gallery-${props.id}-img-${index}`}
            />
          </figure>
        ))}
      </div>
    </section>
  )
}

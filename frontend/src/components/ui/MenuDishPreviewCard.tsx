import { useMemo } from 'preact/hooks'
import { ImageOff } from 'lucide-react'

import './MenuDishPreviewCard.css'

export type MenuDishPreviewCardProps = {
  title: string
  description?: string | null
  allergens?: string[]
  imageUrl?: string | null
  supplementEnabled?: boolean
  supplementPrice?: number | null
  price?: number | null
  className?: string
}

const ALLERGEN_ICONS: Record<string, string> = {
  Gluten: '/images/gluten.png',
  Crustaceos: '/images/crustaceos.png',
  Huevos: '/images/huevos.png',
  Pescado: '/images/pescado.png',
  Cacahuetes: '/images/cacahuetes.png',
  Soja: '/images/soja.png',
  Leche: '/images/leche.png',
  'Frutos de cascara': '/images/frutoscascara.png',
  Apio: '/images/apio.png',
  Mostaza: '/images/mostaza.png',
  Sesamo: '/images/sesamo.png',
  Sulfitos: '/images/sulfitos.png',
  Altramuces: '/images/altramuces.png',
  Moluscos: '/images/moluscos.png',
}

const ALLERGEN_LABELS: Record<string, string> = {
  Gluten: 'Gluten',
  Crustaceos: 'Crustaceos',
  Huevos: 'Huevos',
  Pescado: 'Pescado',
  Cacahuetes: 'Cacahuetes',
  Soja: 'Soja',
  Leche: 'Leche',
  'Frutos de cascara': 'Frutos de cascara',
  Apio: 'Apio',
  Mostaza: 'Mostaza',
  Sesamo: 'Sesamo',
  Sulfitos: 'Sulfitos',
  Altramuces: 'Altramuces',
  Moluscos: 'Moluscos',
}

function formatEuro(value: number): string {
  const rounded = Math.round(value * 100) / 100
  const out = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)
  return `${out}EUR`
}

export function MenuDishPreviewCard({
  title,
  description,
  allergens,
  imageUrl,
  supplementEnabled,
  supplementPrice,
  price,
  className,
}: MenuDishPreviewCardProps) {
  const allergenKeys = useMemo(
    () =>
      Array.from(new Set((allergens || []).map((item) => String(item || '').trim()).filter((key) => key && Boolean(ALLERGEN_ICONS[key])))),
    [allergens],
  )

  const supplementLabel = useMemo(() => {
    if (!supplementEnabled) return ''
    if (Number.isFinite(supplementPrice)) return `Suplemento +${formatEuro(Number(supplementPrice))}`
    return 'Suplemento'
  }, [supplementEnabled, supplementPrice])

  const priceLabel = useMemo(() => {
    if (!Number.isFinite(price)) return ''
    return `+${formatEuro(Number(price))}`
  }, [price])

  const rootClass = className ? `dishCard is-revealed vcDishPreviewCard ${className}` : 'dishCard is-revealed vcDishPreviewCard'

  return (
    <article class={rootClass}>
      <div class="vcDishPreviewMedia">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <div class="vcDishPreviewMediaPlaceholder" aria-hidden="true">
            <ImageOff size={26} />
          </div>
        )}
      </div>

      <div class="vcDishPreviewBody">
        <h3 class="vcDishPreviewTitle">{title}</h3>
        {description ? <p class="vcDishPreviewDescription">{description}</p> : null}

        {allergenKeys.length > 0 ? (
          <div class="dishAllergenRow" aria-label="Alergenos">
            {allergenKeys.map((key) => (
              <img
                key={key}
                src={ALLERGEN_ICONS[key]}
                class="allergenIcon"
                alt={ALLERGEN_LABELS[key] || key}
                title={ALLERGEN_LABELS[key] || key}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        ) : null}

        {supplementLabel || priceLabel ? (
          <div class="vcDishPreviewMeta">
            {supplementLabel ? <span class="vcDishPreviewTag">{supplementLabel}</span> : null}
            {priceLabel ? <span class="vcDishPreviewTag">{priceLabel}</span> : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

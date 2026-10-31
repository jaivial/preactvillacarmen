import { useEffect, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import { prerenderData } from '../../lib/prerenderData'
import type { SeoItemRoute, SeoItemRoutesResponse } from '../../lib/types'

// Coordination id: seo_item_routes_v1
// One page per dish and per wine that is active in the carta. The backend
// publishes the list with the slug already generated, so the page only has to
// render it and link back to the menu it belongs to.
type ItemKind = 'dish' | 'wine'

type ItemPageProps = {
  params: {
    slug?: string
  }
}

const useItemRoute = (kind: ItemKind, slug: string | undefined) => {
  const [route, setRoute] = useState<SeoItemRoute | null>(() => {
    const items = prerenderData().itemRoutes || []
    return items.find((item) => item.entity_type === kind && item.slug === slug) || null
  })

  useEffect(() => {
    let cancelled = false
    const known = (prerenderData().itemRoutes || []).find((item) => item.entity_type === kind && item.slug === slug)
    if (known) return
    apiGetJson<SeoItemRoutesResponse>('/api/seo/item-routes')
      .then((response) => {
        if (cancelled) return
        const match = (response.items || []).find((item) => item.entity_type === kind && item.slug === slug)
        if (match) setRoute(match)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [kind, slug])

  return route
}

const ItemDetails = (props: { route: SeoItemRoute }) => {
  const { t } = useI18n()
  const { route } = props
  const rows: { label: string; value: string }[] = []
  if (route.section) rows.push({ label: t('item.section'), value: route.section })
  if (route.menu_title) rows.push({ label: t('item.menu'), value: route.menu_title })
  if (route.tipo) rows.push({ label: t('item.wineType'), value: route.tipo })
  if (route.bodega) rows.push({ label: t('item.winery'), value: route.bodega })
  if (route.denominacion_origen) rows.push({ label: t('item.appellation'), value: route.denominacion_origen })
  if (route.graduacion) rows.push({ label: t('item.alcohol'), value: `${route.graduacion}%` })
  if (route.anyo) rows.push({ label: t('item.vintage'), value: route.anyo })
  if (route.price && route.price > 0) rows.push({ label: t('item.price'), value: `${route.price.toFixed(2).replace('.', ',')} €` })
  if (route.allergens && route.allergens.length) rows.push({ label: t('item.allergens'), value: route.allergens.join(', ') })
  if (!rows.length) return null
  return (
    <dl class="itemDetails" data-testid="seo-item-details">
      {rows.map((row) => (
        <div class="itemDetailRow" key={row.label}>
          <dt class="itemDetailLabel">{row.label}</dt>
          <dd class="itemDetailValue">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const ItemPage = (props: { kind: ItemKind; slug?: string }) => {
  const { t, lang } = useI18n()
  const route = useItemRoute(props.kind, props.slug)
  const name = route ? (lang === 'es' ? route.name : route.name_en || route.name) : ''
  const description = route ? (lang === 'es' ? route.description : route.description_en || route.description) : ''

  if (!route) {
    return (
      <div class="page">
        <section class="page-hero">
          <div class="container">
            <h1 class="page-title">{t('item.notFound')}</h1>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div class="page itemPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{name}</h1>
          {route.menu_title ? <p class="page-subtitle">{route.menu_title}</p> : null}
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {route.photo ? (
            <img
              class="itemPhoto"
              src={route.photo}
              alt={name}
              width="720"
              height="480"
              loading="lazy"
              decoding="async"
              data-testid="seo-item-photo"
            />
          ) : null}
          {description ? <p class="itemDescription">{description}</p> : null}
          <p class="itemIntro">
            {props.kind === 'wine'
              ? (lang === 'es'
                ? `${name} es de nuestra carta de vinos de Alquería Villa Carmen, restaurante mediterráneo en Catarroja (Valencia). Puedes ver la carta completa o reservar mesa.`
                : `${name} is from the wine list of Alqueria Villa Carmen, a Mediterranean restaurant in Catarroja (Valencia). You can see the full wine list or book a table.`)
              : (lang === 'es'
                ? `${name} forma parte de nuestra carta en Alquería Villa Carmen, restaurante mediterráneo en Catarroja (Valencia). Consulta el ${route.menu_title || 'menú'} completo y reserva tu mesa.`
                : `${name} is on our menu at Alqueria Villa Carmen, a Mediterranean restaurant in Catarroja (Valencia). Check the full ${route.menu_title || 'menu'} and book your table.`)}
          </p>
          <ItemDetails route={route} />
          <div class="itemActions">
            {route.menu_path ? (
              <Link class="btn btnPrimary" href={route.menu_path} data-testid="seo-item-menu-link">
                {t('item.seeMenu')}
              </Link>
            ) : null}
            {props.kind === 'wine' ? (
              <Link class="btn btnSecondary" href="/vinos" data-testid="seo-item-wine-list-link">
                {t('item.seeWines')}
              </Link>
            ) : null}
            <Link class="btn btnSecondary" href="/reservas" data-testid="seo-item-book-link">
              {t('item.book')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export function PlatoPage(props: ItemPageProps) {
  return <ItemPage kind="dish" slug={props.params?.slug} />
}

export function VinoPage(props: ItemPageProps) {
  return <ItemPage kind="wine" slug={props.params?.slug} />
}

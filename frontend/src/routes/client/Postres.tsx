import { useEffect, useState } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type { Dish, PostresResponse } from '../../lib/types'
import { DishCardGrid } from './MenuShared'

export function Postres() {
  const { t } = useI18n()
  const [items, setItems] = useState<Dish[] | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    apiGetJson<PostresResponse>('/api/postres')
      .then((res) => {
        if (cancelled) return
        setItems(res.postres || [])
      })
      .catch(() => {
        if (cancelled) return
        setItems(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{t('nav.desserts')}</h1>
          <p class="page-subtitle">{t('menu.postres.subtitle')}</p>
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {items === undefined ? (
            <div class="menuState">{t('menus.preview.loading')}</div>
          ) : items === null ? (
            <div class="menuState">{t('menu.error')}</div>
          ) : items.length === 0 ? (
            <div class="menuState">{t('menu.empty')}</div>
          ) : (
            <div class="menuGrid">
              <article class="menuSectionCard">
                <h2 class="menuSectionTitle">{t('nav.desserts')}</h2>
                <DishCardGrid dishes={items} />
              </article>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}


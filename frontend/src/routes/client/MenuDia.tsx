import { useEffect, useState } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type { MenuResponse } from '../../lib/types'
import { DishList } from './MenuShared'

export function MenuDia() {
  const { t } = useI18n()
  const [data, setData] = useState<MenuResponse | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    apiGetJson<MenuResponse>('/api/menus/dia')
      .then((res) => {
        if (cancelled) return
        setData(res)
      })
      .catch(() => {
        if (cancelled) return
        setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{t('nav.dailyMenu')}</h1>
          <p class="page-subtitle">{t('menus.card.daily.subtitle')}</p>
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {data === undefined ? (
            <div class="menuState">{t('menus.preview.loading')}</div>
          ) : data === null ? (
            <div class="menuState">{t('menu.error')}</div>
          ) : (
            <div class="menuGrid">
              <article class="menuSectionCard">
                <h2 class="menuSectionTitle">{t('menus.preview.starters')}</h2>
                <DishList dishes={data.entrantes} />
              </article>

              <article class="menuSectionCard">
                <h2 class="menuSectionTitle">{t('menus.preview.mains')}</h2>
                <DishList dishes={data.principales} />
              </article>

              <article class="menuSectionCard">
                <h2 class="menuSectionTitle">{t('menu.section.rice')}</h2>
                <DishList dishes={data.arroces} />
              </article>

              <article class="menuSectionCard menuSectionCard--price">
                <h2 class="menuSectionTitle">{t('menus.preview.price')}</h2>
                <div class="menuPrice">{data.precio ? `${data.precio} €` : '—'}</div>
              </article>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}


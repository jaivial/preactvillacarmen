import { useEffect, useState } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type { MenuResponse } from '../../lib/types'
import { normalizeMenuResponse } from '../../lib/backendAdapters'
import { AllergensLegend, MenuHeroSlider, MenuPriceCard, MenuSection } from './MenuShared'

export function MenuDia() {
  const { t } = useI18n()
  const [data, setData] = useState<MenuResponse | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    apiGetJson<unknown>('/api/menus/dia')
      .then((res) => {
        if (cancelled) return
        setData(normalizeMenuResponse(res))
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

      <section class="menuHeroMedia">
        <div class="container">
          <MenuHeroSlider />
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {data === undefined ? (
            <div class="menuState">{t('menus.preview.loading')}</div>
          ) : data === null ? (
            <div class="menuState">{t('menu.error')}</div>
          ) : (
            <>
              <div class="menuMain">
                <MenuSection title={t('menus.preview.starters')} dishes={data.entrantes} pickCategory="entrantes" />
                <MenuSection title={t('menus.preview.mains')} dishes={data.principales} pickCategory="principales" />
                {data.arroces.length > 0 ? <p class="menuSectionLead">{t('menu.rice.lead')}</p> : null}
                <MenuSection
                  title={t('menu.section.rice')}
                  dishes={data.arroces}
                  pickCategory="arroces"
                  notes={[
                    t('menu.rice.note1'),
                    t('menu.rice.note2'),
                    t('menu.rice.note3'),
                    t('menu.rice.note4'),
                  ]}
                />

                {data.entrantes.length === 0 && data.principales.length === 0 && data.arroces.length === 0 ? (
                  <div class="menuState">{t('menu.empty')}</div>
                ) : null}

                <MenuPriceCard precio={data.precio} />
              </div>

              <AllergensLegend />
            </>
          )}
        </div>
      </section>
    </div>
  )
}

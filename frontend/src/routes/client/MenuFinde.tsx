import { useEffect, useMemo, useState } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type { MenuResponse } from '../../lib/types'
import { AllergensLegend, MenuHeroSlider, MenuPriceCard, MenuSection } from './MenuShared'

type GroupMenuGetResponse = {
  success: boolean
  menu?: {
    menu_title?: string
    price?: string | number
    menu_subtitle?: unknown
    entrantes?: unknown
    principales?: unknown
    postre?: unknown
  }
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x || '').trim()).filter(Boolean)
}

function asPrincipalesItems(v: unknown): string[] {
  if (!v || typeof v !== 'object') return []
  const items = (v as any).items
  return asStringArray(items)
}

function asPrincipalesTitle(v: unknown): string {
  if (!v || typeof v !== 'object') return ''
  const t = String((v as any).titulo_principales || '').trim()
  return t
}

function toMenuResponse(group: NonNullable<GroupMenuGetResponse['menu']>): MenuResponse {
  const entrantes = asStringArray(group.entrantes).map((descripcion) => ({ descripcion, alergenos: [] }))
  const principales = asPrincipalesItems(group.principales).map((descripcion) => ({ descripcion, alergenos: [] }))

  return {
    success: true,
    entrantes,
    principales,
    arroces: [],
    precio: String(group.price ?? ''),
  }
}

function readPreviewParams(): { enabled: boolean; menuId: number | null } {
  if (typeof window === 'undefined') return { enabled: false, menuId: null }
  const sp = new URLSearchParams(window.location.search || '')
  const enabled = sp.get('boPreview') === '1'
  const menuId = Number(sp.get('menuId') || '')
  return { enabled, menuId: Number.isFinite(menuId) && menuId > 0 ? menuId : null }
}

export function MenuFinde() {
  const { t } = useI18n()
  const [data, setData] = useState<MenuResponse | null | undefined>(undefined)
  const [titleOverride, setTitleOverride] = useState<string>('')
  const [subtitleOverride, setSubtitleOverride] = useState<string>('')
  const [principalesTitleOverride, setPrincipalesTitleOverride] = useState<string>('')

  const preview = useMemo(() => readPreviewParams(), [])

  useEffect(() => {
    let cancelled = false

    const loadStandard = async () => {
      try {
        const res = await apiGetJson<MenuResponse>('/api/menus/finde')
        if (cancelled) return
        setData(res)
      } catch {
        if (cancelled) return
        setData(null)
      }
    }

    const loadPreview = async () => {
      if (!preview.menuId) {
        setData(null)
        return
      }

      try {
        const res = await apiGetJson<GroupMenuGetResponse>(`/api/menuDeGruposBackend/getMenu.php?id=${encodeURIComponent(String(preview.menuId))}`)
        if (cancelled) return
        if (!res.success || !res.menu) {
          setData(null)
          return
        }

        setTitleOverride(String(res.menu.menu_title || '').trim())

        const subtitles = asStringArray(res.menu.menu_subtitle)
        setSubtitleOverride(subtitles[0] || '')
        setPrincipalesTitleOverride(asPrincipalesTitle(res.menu.principales))

        setData(toMenuResponse(res.menu))
      } catch {
        if (cancelled) return
        setData(null)
      }
    }

    void (preview.enabled ? loadPreview() : loadStandard())

    let intervalId = 0
    if (preview.enabled && preview.menuId) {
      intervalId = window.setInterval(() => {
        void loadPreview()
      }, 2200)
    }

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [preview.enabled, preview.menuId])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{titleOverride || t('nav.weekendMenu')}</h1>
          <p class="page-subtitle">{subtitleOverride || t('menus.card.weekend.subtitle')}</p>
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
                <MenuSection title={principalesTitleOverride || t('menus.preview.mains')} dishes={data.principales} pickCategory="principales" />
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

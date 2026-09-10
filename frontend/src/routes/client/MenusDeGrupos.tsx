import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import { fetchMenuByID } from '../../lib/menuApi'
import type { PublicMenu } from '../../lib/types'
import { MenuTemplateFor } from './menuTemplateFor'

// Slim tab descriptor. The group-menu list endpoint is kept (instead of
// /api/menus/sidebar) because it is the only one that carries
// menu_title_english, which the tab labels need.
type SlimMenu = {
  id: number
  menu_title: string
  menu_title_english?: string
}

type GroupMenusApiResponse = {
  success: boolean
  count: number
  menus: SlimMenu[]
}

function checkpoint(name: string, detail?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return
  if (detail) {
    console.log(`[checkpoint] ${name}`, JSON.stringify(detail))
  } else {
    console.log(`[checkpoint] ${name}`)
  }
}

// Public group menus page.
//
// This page is only a *picker*: it lists the active group menus as tabs and
// then delegates the actual rendering to MenuTemplateFor, the same resolver the
// /menu/:id catalog route uses. That is what keeps the UI identical no matter
// whether the guest arrives from the home menu cards or from the header nav.
//
// Coordination id: public_menu_template_v1
export function MenusDeGrupos() {
  const { t, lang } = useI18n()
  const [groupMenus, setGroupMenus] = useState<SlimMenu[] | null | undefined>(undefined)
  const [details, setDetails] = useState<Record<number, PublicMenu>>({})
  const [failed, setFailed] = useState<Record<number, true>>({})
  const [active, setActive] = useState(0)

  useEffect(() => {
    checkpoint('menusdegrupos_frontend_loaded')
    let cancelled = false
    checkpoint('menusdegrupos_menus_list_fetch_started')
    apiGetJson<GroupMenusApiResponse>('/api/menuDeGruposBackend/getActiveMenusForDisplay', { noStore: true })
      .then((data) => {
        if (cancelled) return
        checkpoint('menusdegrupos_menus_list_received', { success: data.success, count: data.success ? data.menus.length : 0 })
        setGroupMenus(data.success ? data.menus : null)
      })
      .catch((err) => {
        checkpoint('menusdegrupos_menus_list_fetch_failed', { error: String(err) })
        if (!cancelled) setGroupMenus(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const menus = groupMenus

  const menusRef = useRef(menus)
  menusRef.current = menus
  const failedRef = useRef(failed)
  failedRef.current = failed

  // hydrate active tab from ?menu=<id>; default/unknown falls back to the
  // first menu and its id is written into the URL
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (!menus || menus.length === 0 || hydratedRef.current) return
    hydratedRef.current = true
    const raw = new URLSearchParams(window.location.search).get('menu')
    const fromUrl = raw === null ? NaN : Number(raw)
    const idx = menus.findIndex((m) => m.id === fromUrl)
    const resolved = idx >= 0 ? idx : 0
    setActive(resolved)
    if (raw !== String(menus[resolved].id)) {
      const url = new URL(window.location.href)
      url.searchParams.set('menu', String(menus[resolved].id))
      window.history.replaceState({}, '', url)
    }
    checkpoint('menusdegrupos_url_synced', { menu_id: menus[resolved].id, mode: 'hydrate' })
  }, [menus])

  // browser back/forward: re-sync the active tab from the URL query
  useEffect(() => {
    const onPop = () => {
      const ms = menusRef.current
      if (!ms || ms.length === 0) return
      const raw = new URLSearchParams(window.location.search).get('menu')
      const fromUrl = raw === null ? NaN : Number(raw)
      const idx = ms.findIndex((m) => m.id === fromUrl)
      const resolved = idx >= 0 ? idx : 0
      setActive(resolved)
      if (ms[resolved] && failedRef.current[ms[resolved].id]) {
        setFailed((prev) => {
          const next = { ...prev }
          delete next[ms[resolved].id]
          return next
        })
      }
      if (raw !== String(ms[resolved].id)) {
        const url = new URL(window.location.href)
        url.searchParams.set('menu', String(ms[resolved].id))
        window.history.replaceState(window.history.state, '', url)
      }
      checkpoint('menusdegrupos_url_synced', { menu_id: ms[resolved].id, mode: 'popstate' })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const selectTab = (idx: number) => {
    const menu = menus?.[idx]
    if (!menu || idx === active) return
    setActive(idx)
    // allow a fresh detail fetch if a previous attempt failed for this menu
    if (failed[menu.id]) {
      setFailed((prev) => {
        const next = { ...prev }
        delete next[menu.id]
        return next
      })
    }
    const url = new URL(window.location.href)
    url.searchParams.set('menu', String(menu.id))
    window.history.pushState({}, '', url)
    checkpoint('menusdegrupos_tab_selected', { menu_id: menu.id, index: idx })
    checkpoint('menusdegrupos_url_synced', { menu_id: menu.id, mode: 'push' })
  }

  const shouldShowTabs = Boolean(menus && menus.length >= 2)
  const activeMenu = menus && menus.length > 0 ? menus[active] || menus[0] : null

  // fetch the full public payload for the selected menu; this is the very same
  // endpoint the /menu/:id route uses, so both entry points share one shape
  useEffect(() => {
    if (!activeMenu) return
    if (details[activeMenu.id] || failed[activeMenu.id]) return
    let cancelled = false
    checkpoint('menusdegrupos_menu_detail_fetch_started', { menu_id: activeMenu.id })
    fetchMenuByID(activeMenu.id)
      .then((menu) => {
        if (cancelled) return
        checkpoint('menusdegrupos_menu_detail_received', { menu_id: menu.id, menu_type: menu.menu_type })
        setDetails((prev) => ({ ...prev, [menu.id]: menu }))
      })
      .catch((err) => {
        if (cancelled) return
        checkpoint('menusdegrupos_menu_detail_fetch_failed', { menu_id: activeMenu.id, error: String(err) })
        setFailed((prev) => ({ ...prev, [activeMenu.id]: true }))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu?.id, failed])

  const current = useMemo(
    () => (activeMenu ? details[activeMenu.id] || null : null),
    [activeMenu, details],
  )

  useEffect(() => {
    if (current) checkpoint('menusdegrupos_menu_rendered', { menu_id: current.id })
  }, [current])

  const tabs = shouldShowTabs && menus ? (
    <section class="menuBody menuBody--groupPicker" data-testid="menusdegrupos-picker">
      <div class="container">
        <div class="groupTabs" role="tablist" aria-label={t('nav.groupMenus')} data-testid="menusdegrupos-tabs">
          {menus.map((menu, idx) => (
            <button
              key={menu.id}
              type="button"
              class={idx === active ? 'groupTab active' : 'groupTab'}
              onClick={() => selectTab(idx)}
              role="tab"
              aria-selected={idx === active}
              data-testid={`menusdegrupos-tab-${menu.id}`}
            >
              {lang === 'en' && menu.menu_title_english ? menu.menu_title_english : menu.menu_title}
            </button>
          ))}
        </div>
      </div>
    </section>
  ) : null

  // States that have no menu to delegate yet keep their own light shell.
  if (groupMenus === undefined || (activeMenu && !current && !failed[activeMenu.id])) {
    return (
      <div class="page menuPage" data-testid="menusdegrupos-page">
        {tabs}
        <section class="menuBody">
          <div class="container">
            <div class="menuState" data-testid="menusdegrupos-state-loading">{t('menus.preview.loading')}</div>
          </div>
        </section>
      </div>
    )
  }

  if (groupMenus === null || (activeMenu && failed[activeMenu.id])) {
    return (
      <div class="page menuPage" data-testid="menusdegrupos-page">
        {tabs}
        <section class="menuBody">
          <div class="container">
            <div class="menuState" data-testid="menusdegrupos-state-error">{t('menu.error')}</div>
          </div>
        </section>
      </div>
    )
  }

  if (!menus || menus.length === 0) {
    return (
      <div class="page menuPage" data-testid="menusdegrupos-page">
        <section class="menuBody">
          <div class="container">
            <div class="menuState" data-testid="menusdegrupos-state-empty">{t('groupMenus.empty')}</div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div class="page menuPage" data-testid="menusdegrupos-page">
      {tabs}
      {current ? <MenuTemplateFor menu={current} /> : null}
    </div>
  )
}

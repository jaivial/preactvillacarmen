import { useEffect, useState } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import { fetchMenuByID } from '../../lib/menuApi'
import type { GroupMenuDisplay, GroupMenusDisplayResponse, PublicMenu } from '../../lib/types'
import { prerenderData } from '../../lib/prerenderData'
import { GroupLanding } from './GroupLanding'

// The landing links each active group menu to its canonical /menu/<seo_slug>
// page. The old ?menu=ID selector is redirected by the backend, so this page no
// longer repeats a complete menu below the cards or writes numeric URLs.
export function MenusDeGrupos() {
  const { t } = useI18n()
  const [groupMenus, setGroupMenus] = useState<GroupMenuDisplay[] | null | undefined>(() => prerenderData().groupMenus)
  const [details, setDetails] = useState<Record<number, PublicMenu>>(() => {
    const embedded = prerenderData().menus
    return Object.fromEntries(Object.values(embedded).map((menu) => [menu.id, menu]))
  })
  const [failed, setFailed] = useState<Record<number, true>>({})

  useEffect(() => {
    let cancelled = false
    apiGetJson<GroupMenusDisplayResponse>('/api/menuDeGruposBackend/getActiveMenusForDisplay', { noStore: true })
      .then((data) => { if (!cancelled) setGroupMenus(data.success ? data.menus : null) })
      .catch(() => { if (!cancelled) setGroupMenus(null) })
    return () => { cancelled = true }
  }, [])

  // Cards need the complete public payload for price, party size and SEO slug.
  useEffect(() => {
    if (!groupMenus?.length) return
    let cancelled = false
    groupMenus.forEach((summary) => {
      if (details[summary.id] || failed[summary.id]) return
      fetchMenuByID(summary.id)
        .then((menu) => { if (!cancelled) setDetails((prev) => ({ ...prev, [menu.id]: menu })) })
        .catch(() => {
          if (cancelled) return
          setFailed((prev) => ({ ...prev, [summary.id]: true }))
        })
    })
    return () => { cancelled = true }
    // The initial loop fetches every missing card; detail updates need not retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupMenus, failed])

  return (
    <div class="page menuPage" data-testid="menusdegrupos-page">
      <GroupLanding menus={groupMenus} details={details} />
      {groupMenus === undefined || groupMenus === null || groupMenus.length === 0 ? (
        <section class="menuBody"><div class="container"><div class="menuState" data-testid="menusdegrupos-state">
          {groupMenus === undefined ? t('menus.preview.loading') : groupMenus === null ? t('menu.error') : t('groupMenus.empty')}
        </div></div></section>
      ) : null}
    </div>
  )
}

import { useMemo } from 'preact/hooks'
import { Redirect } from 'wouter-preact'
import { useI18n } from '../../lib/i18n'
import { buildPublicMenuHref, findFirstGroupMenu, findLegacyConventionalMenu, usePublicMenus } from '../../lib/publicMenus'
import { MenuUnavailable } from './MenuUnavailable'

type LegacyRedirectTarget = 'dia' | 'finde' | 'grupos'

export function LegacyMenuRedirect(props: { target: LegacyRedirectTarget }) {
  const { t } = useI18n()
  const publicMenus = usePublicMenus()

  const menuHref = useMemo(() => {
    if (!publicMenus || publicMenus.length === 0) return ''

    if (props.target === 'dia') {
      const match = findLegacyConventionalMenu(publicMenus, 'DIA')
      return match ? buildPublicMenuHref(match) : ''
    }

    if (props.target === 'finde') {
      const match = findLegacyConventionalMenu(publicMenus, 'FINDE')
      return match ? buildPublicMenuHref(match) : ''
    }

    const groupMenu = findFirstGroupMenu(publicMenus)
    return groupMenu ? buildPublicMenuHref(groupMenu) : ''
  }, [props.target, publicMenus])

  if (publicMenus === undefined) {
    return (
      <div class="page menuPage">
        <section class="menuBody">
          <div class="container">
            <div class="menuState">{t('menus.preview.loading')}</div>
          </div>
        </section>
      </div>
    )
  }

  if (!menuHref) {
    const isGroupTarget = props.target === 'grupos'
    return (
      <MenuUnavailable
        title={isGroupTarget ? t('menu.fallback.groups.title') : t('menu.fallback.title')}
        message={isGroupTarget ? t('menu.fallback.groups.body') : t('menu.fallback.body')}
      />
    )
  }

  return <Redirect to={menuHref} replace />
}

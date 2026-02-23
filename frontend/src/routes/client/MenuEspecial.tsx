import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { useI18n } from '../../lib/i18n'
import { SpecialMenuSimpleTemplate } from './special/SpecialMenuSimpleTemplate'
import { getMenuViewSections } from './menuPublicHelpers'

export function MenuEspecial(props: { menu: PublicMenu }) {
  const { t } = useI18n()
  const imageUrl = useMemo(() => {
    if (props.menu.show_menu_preview_image === true) {
      const preview = String(props.menu.menu_preview_image_url || '').trim()
      if (preview) return preview
    }
    return String(props.menu.special_menu_image_url || '').trim()
  }, [
    props.menu.menu_preview_image_url,
    props.menu.show_menu_preview_image,
    props.menu.special_menu_image_url,
  ])
  const subtitle = useMemo(
    () => props.menu.menu_subtitle[0] || t('menus.card.valentine.subtitle'),
    [props.menu.menu_subtitle, t],
  )
  const sections = useMemo(() => getMenuViewSections(props.menu), [props.menu])

  return <SpecialMenuSimpleTemplate menu={props.menu} subtitle={subtitle} imageUrl={imageUrl} sections={sections} />
}

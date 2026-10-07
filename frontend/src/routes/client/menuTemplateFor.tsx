import type { PublicMenu } from '../../lib/types'
import {
  normalizeMenuType,
  MENU_TYPE_A_LA_CARTE,
  MENU_TYPE_A_LA_CARTE_GROUP,
  MENU_TYPE_CLOSED_GROUP,
  MENU_TYPE_SPECIAL,
} from '../../lib/menuTypeCodes'
import { MenuCartaConvencional } from './MenuCartaConvencional'
import { MenuCerradoConvencional } from './MenuCerradoConvencional'
import { MenuEspecial } from './MenuEspecial'
import { MenusDeGruposCarta } from './MenusDeGruposCarta'
import { MenusDeGruposConvencional } from './MenusDeGruposConvencional'

// Single source of truth mapping a public menu type to its template.
//
// Both entry points into a menu page resolve their template here: the catalog
// route (/menu/:id/:slug, reached from the home cards) and the group menus page
// (/menusdegrupos, reached from the header nav). Before this existed the group
// page rendered its own bespoke markup off the legacy
// getMenuForDisplay payload, so the very same menu looked different depending
// on which link the guest clicked.
//
// Coordination id: public_menu_template_v1
//
// Coordination id: menu_type_numeric_codes_v1
// The switch runs on the numeric `menu_type` code resolved through the shared
// map, so a legacy string from the backend still picks the same template and
// an unknown code (0) keeps the closed conventional default.
export function MenuTemplateFor(props: { menu: PublicMenu }) {
  const menu = props.menu

  switch (normalizeMenuType(menu.menu_type)) {
    case MENU_TYPE_A_LA_CARTE:
      return <MenuCartaConvencional menu={menu} />
    case MENU_TYPE_SPECIAL:
      return <MenuEspecial menu={menu} />
    case MENU_TYPE_CLOSED_GROUP:
      return <MenusDeGruposConvencional menu={menu} />
    case MENU_TYPE_A_LA_CARTE_GROUP:
      return <MenusDeGruposCarta menu={menu} />
    default:
      // MENU_TYPE_CLOSED_CONVENTIONAL (1) and any unknown code (0).
      return <MenuCerradoConvencional menu={menu} />
  }
}

import type { PublicMenu } from '../../lib/types'
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
export function MenuTemplateFor(props: { menu: PublicMenu }) {
  const menu = props.menu

  if (menu.menu_type === 'a_la_carte') return <MenuCartaConvencional menu={menu} />
  if (menu.menu_type === 'special') return <MenuEspecial menu={menu} />
  if (menu.menu_type === 'closed_group') return <MenusDeGruposConvencional menu={menu} />
  if (menu.menu_type === 'a_la_carte_group') return <MenusDeGruposCarta menu={menu} />
  return <MenuCerradoConvencional menu={menu} />
}

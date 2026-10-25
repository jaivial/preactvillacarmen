import { useAtomValue } from 'jotai'
import { Redirect } from 'wouter-preact'
import type { Atom } from 'jotai'
import { bebidasPageActiveAtom, cafePageActiveAtom, postresPageActiveAtom, vinosPageActiveAtom } from '../../lib/config'
import { useI18n } from '../../lib/i18n'
import { prerenderData } from '../../lib/prerenderData'

/**
 * Middleware guard for every public food-type route.
 *
 * Reads the page's active flag from the global Jotai atom (written once by
 * ClientHeader after the initial config fetch) and:
 *   - Shows a loading state while the atom is still `null` (fetch pending).
 *   - Redirects to `/` if the flag is `false` (page deactivated from backoffice).
 *   - Renders children normally if the flag is `true`.
 *
 * Coordination id: foodtype_page_visibility_v1
 */
type FoodPageKind = 'cafes' | 'bebidas' | 'vinos' | 'postres'

const FOOD_PAGE_ATOMS: Record<FoodPageKind, Atom<boolean | null>> = {
  cafes: cafePageActiveAtom,
  bebidas: bebidasPageActiveAtom,
  vinos: vinosPageActiveAtom,
  postres: postresPageActiveAtom,
}

export function FoodPageGuard({ kind, children }: { kind: FoodPageKind; children?: any }) {
  const { t } = useI18n()
  const isActive = useAtomValue(FOOD_PAGE_ATOMS[kind])
  const flags = { cafes: 'cafe_page_active', bebidas: 'bebidas_page_active', vinos: 'vinos_page_active', postres: 'postres_page_active' } as const
  const active = isActive ?? prerenderData().sidebar?.[flags[kind]]

  if (active === null || active === undefined) {
    return (
      <div class="page menuPage" data-testid={`food-page-guard-loading-${kind}`}>
        <section class="menuBody">
          <div class="container">
            <div class="menuState" data-testid={`food-page-guard-loading-state-${kind}`}>
              {t('menus.preview.loading')}
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (!active) {
    console.log('[checkpoint] public_food_page_blocked', `kind=${kind}`)
    return <Redirect to="/" replace />
  }

  return children
}

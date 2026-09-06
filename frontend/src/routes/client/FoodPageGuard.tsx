import { useAtomValue } from 'jotai'
import { Redirect } from 'wouter-preact'
import type { Atom } from 'jotai'
import { bebidasPageActiveAtom, cafePageActiveAtom, postresPageActiveAtom, vinosPageActiveAtom } from '../../lib/config'
import { useI18n } from '../../lib/i18n'

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
const FOOD_PAGE_ATOMS: Record<string, Atom<boolean | null>> = {
  cafes: cafePageActiveAtom,
  bebidas: bebidasPageActiveAtom,
  vinos: vinosPageActiveAtom,
  postres: postresPageActiveAtom,
}

export function FoodPageGuard({ kind, children }: { kind: keyof typeof FOOD_PAGE_ATOMS; children?: any }) {
  const { t } = useI18n()
  const isActive = useAtomValue(FOOD_PAGE_ATOMS[kind])

  if (isActive === null) {
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

  if (!isActive) {
    console.log('[checkpoint] public_food_page_blocked', `kind=${kind}`)
    return <Redirect to="/" replace />
  }

  return children
}

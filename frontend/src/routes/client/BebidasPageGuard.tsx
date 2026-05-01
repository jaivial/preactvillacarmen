import { useAtomValue } from 'jotai'
import { Redirect } from 'wouter-preact'
import { bebidasPageActiveAtom } from '../../lib/config'
import { useI18n } from '../../lib/i18n'

/**
 * Middleware guard for the /bebidas route.
 *
 * Reads `bebidas_page_active` from the global Jotai atom (written once by
 * ClientHeader after the initial config fetch) and:
 *   - Shows a loading state while the atom is still `null` (fetch pending).
 *   - Redirects to `/` if the flag is `false` (page deactivated from backoffice).
 *   - Renders children normally if the flag is `true`.
 */
export function BebidasPageGuard({ children }: { children?: any }) {
  const { t } = useI18n()
  const isActive = useAtomValue(bebidasPageActiveAtom)

  if (isActive === null) {
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

  if (!isActive) {
    return <Redirect to="/" replace />
  }

  return children
}

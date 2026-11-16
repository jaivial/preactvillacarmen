import { Link } from 'wouter-preact'
import { useI18n } from '../lib/i18n'
import { menuPath } from '../lib/routes'
import type { PublicMenu } from '../lib/types'

// Coordination id: local_search_intents_20261116 - approved weekend and group minimums.
export function WeekendMenuIntro({ menu }: { menu: PublicMenu }) {
  const { lang, t } = useI18n()
  if (menuPath(menu) !== '/menu/menu-fin-de-semana') return null
  return <div class="container editorial-sections" data-testid="weekend-local-intent" data-coordination-id="local_search_intents_20261116">
    <section class="editorial-section">
      <h2 data-testid="weekend-local-heading">{lang === 'es' ? 'Dónde comer el fin de semana en Catarroja, cerca de Valencia' : 'Weekend lunch in Catarroja, near Valencia'}</h2>
      <p data-testid="weekend-local-copy">{lang === 'es' ? 'Ven a comer el sábado, domingo o festivo en Alquería Villa Carmen. El menú de fin de semana no tiene mínimo de comensales; para encargar arroz el mínimo es de 2 personas. Los menús de grupos son a partir de 6 personas y tienen sus propias condiciones.' : 'Join us for lunch on Saturday, Sunday or a holiday. The weekend menu has no minimum party size; rice orders are for at least 2 people. Group menus start at 6 people and have their own conditions.'}</p>
    </section>
    <section class="editorial-section">
      <p data-testid="weekend-local-conditions">{lang === 'es' ? 'Consulta a continuación el precio vigente, los platos, las bebidas y los suplementos antes de reservar. Si vienes desde Valencia o visitas l’Albufera, estamos en Catarroja; comprueba la ruta y los horarios en Contacto.' : 'Check the current price, dishes, drinks and supplements below before booking. If you are coming from Valencia or visiting l’Albufera, we are in Catarroja; check directions and opening hours on Contact.'}</p>
      <nav class="editorial-actions" aria-label={lang === 'es' ? 'Planifica tu comida' : 'Plan your lunch'} data-testid="weekend-local-links">
        <Link href="/arroces-y-paellas" className="btn" data-testid="weekend-local-rice">{lang === 'es' ? 'Arroces y paellas' : 'Rice and paella'}</Link>
        <Link href="/contacto" className="btn" data-testid="weekend-local-directions">{lang === 'es' ? 'Cómo llegar' : 'Directions'}</Link>
        <Link href="/reservas" className="btn primary" data-testid="weekend-local-reserve">{t('nav.reserve')}</Link>
      </nav>
    </section>
  </div>
}

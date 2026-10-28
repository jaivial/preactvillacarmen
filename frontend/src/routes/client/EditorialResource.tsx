import { useLocation } from 'wouter-preact'
import { ActiveRiceMenus } from '../../components/ActiveRiceMenus'
import { EditorialLanding } from '../../components/EditorialLanding'
import { useI18n } from '../../lib/i18n'
import { resourceContent } from '../../lib/resourceContent'

export function EditorialResource() {
  const [location] = useLocation()
  const { lang } = useI18n()
  const content = resourceContent[location]?.[lang] || resourceContent['/guia-arroces-valencianos'][lang]
  return <EditorialLanding id={location.slice(1)} content={content}>{location === '/guia-arroces-valencianos' ? <ActiveRiceMenus /> : null}</EditorialLanding>
}

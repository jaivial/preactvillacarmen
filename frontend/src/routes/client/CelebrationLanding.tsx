import { useLocation } from 'wouter-preact'
import { EditorialLanding } from '../../components/EditorialLanding'
import { celebrationContent } from '../../lib/celebrationContent'
import { useI18n } from '../../lib/i18n'

export function CelebrationLanding() {
  const [location] = useLocation()
  const { lang } = useI18n()
  const content = celebrationContent[location]?.[lang] || celebrationContent['/bodas'][lang]
  return <EditorialLanding content={content} id={`celebration-${location.slice(1)}`} />
}

import { ActiveRiceMenus } from '../../components/ActiveRiceMenus'
import { EditorialLanding } from '../../components/EditorialLanding'
import { riceContent } from '../../lib/editorialContent'
import { useI18n } from '../../lib/i18n'

export function ArrocesYPaellas() {
  const { lang } = useI18n()
  return <EditorialLanding content={riceContent[lang]} id="rice"><ActiveRiceMenus /></EditorialLanding>
}

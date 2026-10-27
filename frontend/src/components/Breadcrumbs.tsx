import { Link, useLocation } from 'wouter-preact'
import { useI18n } from '../lib/i18n'
import { breadcrumbItems } from '../lib/structuredData'
import { catalogRoutes } from './RouteHead'

export function Breadcrumbs() {
  const [location] = useLocation()
  const { lang } = useI18n()
  const items = breadcrumbItems(location, lang, catalogRoutes())
  if (items.length < 2) return null
  return (
    <nav class="breadcrumbs container" aria-label={lang === 'es' ? 'Migas de pan' : 'Breadcrumbs'} data-testid="public-breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={item.path}>
            {index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

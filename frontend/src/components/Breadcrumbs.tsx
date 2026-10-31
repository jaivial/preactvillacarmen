import { useEffect, useState } from 'preact/hooks'
import { Link, useLocation } from 'wouter-preact'
import { useI18n } from '../lib/i18n'
import { breadcrumbItems } from '../lib/structuredData'
import { catalogItemRoutes, catalogRoutes } from './RouteHead'

export function Breadcrumbs() {
  const [location] = useLocation()
  const { lang } = useI18n()
  const [catalogVersion, setCatalogVersion] = useState(0)
  useEffect(() => {
    const update = () => setCatalogVersion((value) => value + 1)
    window.addEventListener('villacarmen:menus-updated', update)
    return () => window.removeEventListener('villacarmen:menus-updated', update)
  }, [])
  const pathname = lang === 'en' && !location.startsWith('/en') ? `/en${location}` : location
  const items = breadcrumbItems(pathname, lang, catalogRoutes(), catalogItemRoutes())
  void catalogVersion
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

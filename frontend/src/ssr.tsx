import renderToString from 'preact-render-to-string'
import { Provider as JotaiProvider } from 'jotai'
import { Router } from 'wouter-preact'
import { App } from './app'
import { I18nProvider } from './lib/i18n'
import { setPrerenderData, type PrerenderData } from './lib/prerenderData'

export function renderPage(path: string, data: PrerenderData): string {
  setPrerenderData(data)
  const lang = path === '/en' || path.startsWith('/en/') ? 'en' : 'es'
  return renderToString(
    <JotaiProvider>
      <I18nProvider initialLang={lang}>
        <Router ssrPath={path} base={lang === 'en' ? '/en' : ''}>
          <App />
        </Router>
      </I18nProvider>
    </JotaiProvider>,
  )
}

export { normalizePublicMenu } from './lib/backendAdapters'
export { renderHead } from './components/RouteHead'
export { PUBLIC_ROUTES, SITE_ORIGIN, GONE_PATHS, menuPath } from './lib/routes'

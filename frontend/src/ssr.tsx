import renderToString from 'preact-render-to-string'
import { Provider as JotaiProvider } from 'jotai'
import { Router } from 'wouter-preact'
import { App } from './app'
import { ClientLayout } from './routes/client/ClientLayout'
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

// Booking-management views read private browser tokens during render. Their
// route content stays client-side, but the public layout and internal links
// must still be present in the served HTML rather than appearing on hydration.
export function renderPublicShell(path: string, data: PrerenderData): string {
  setPrerenderData(data)
  const lang = path === '/en' || path.startsWith('/en/') ? 'en' : 'es'
  return renderToString(
    <JotaiProvider>
      <I18nProvider initialLang={lang}>
        <Router ssrPath={path} base={lang === 'en' ? '/en' : ''}>
          <ClientLayout>{null}</ClientLayout>
        </Router>
      </I18nProvider>
    </JotaiProvider>,
  )
}

export { normalizePublicMenu } from './lib/backendAdapters'
export { renderHead, publicMarkdownPaths } from './components/RouteHead'
export { PUBLIC_ROUTES, SITE_ORIGIN, GONE_PATHS, menuPath, routeMetadata, equivalentLanguagePath } from './lib/routes'
export { catalogRoutesFor } from './components/RouteHead'

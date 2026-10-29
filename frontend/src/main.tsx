import { hydrate, render } from 'preact'
import { Router } from 'wouter-preact'
import './index.css'
import { App } from './app.tsx'
import { I18nProvider } from './lib/i18n.tsx'
import { Provider as JotaiProvider } from 'jotai'
import { startBootLoader } from './lib/bootLoader.ts'
import { startSmoothAnchorScroll } from './lib/anchorScroll.ts'
import { stripLanguagePrefix } from './lib/routes.ts'
// Side effect: registers the global phone/WhatsApp click tracking on every page.
import './lib/analytics.ts'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/newsreader/300.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'

const pathname = window.location.pathname
const { lang } = stripLanguagePrefix(pathname)
const container = document.getElementById('app')!
const application = (
  <JotaiProvider>
    <I18nProvider initialLang={lang}>
      <Router base={lang === 'en' ? '/en' : ''}>
        <App />
      </Router>
    </I18nProvider>
  </JotaiProvider>
)

if (container.hasChildNodes()) hydrate(application, container)
else render(application, container)

startBootLoader()
startSmoothAnchorScroll({ durationMs: 2000 })

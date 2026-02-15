import { render } from 'preact'
import './index.css'
import { App } from './app.tsx'
import { I18nProvider } from './lib/i18n.tsx'
import { startBootLoader } from './lib/bootLoader.ts'
import { startSmoothAnchorScroll } from './lib/anchorScroll.ts'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/newsreader/300.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'

render(
  <I18nProvider>
    <App />
  </I18nProvider>,
  document.getElementById('app')!
)

startBootLoader()
startSmoothAnchorScroll({ durationMs: 2000 })

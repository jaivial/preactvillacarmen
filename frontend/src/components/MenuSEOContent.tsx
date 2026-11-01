import { useI18n } from '../lib/i18n'
import { menuSEOContent } from '../lib/menuSeoContent'
import type { MenuPublicSEO } from '../lib/types'

// Coordination id: menu_seo_content_v1 (backoffice SEO panel -> menus.seo_intro/seo_faq -> public menu page + FAQPage schema)
// Also renders the /cafes intro and FAQ (cafes_page_seo_v1) with its own "about" heading.
export function MenuSEOContent({ menu, aboutKey = 'menu.seo.about' }: { menu: MenuPublicSEO & { id?: number }; aboutKey?: string }) {
  const { lang, t } = useI18n()
  const { intro, faq } = menuSEOContent(menu, lang)
  if (!intro.length && !faq.length) return null
  return (
    <section class="container menu-seo-content editorial-faq" data-testid="menu-seo-content" data-coordination-id="menu_seo_content_v1" data-menu-id={menu.id}>
      {intro.length ? <div class="editorial-sections" data-testid="menu-seo-intro">
        <h2 data-testid="menu-seo-intro-title">{t(aboutKey)}</h2>
        {intro.map((paragraph, index) => <p key={index} data-testid={`menu-seo-intro-paragraph-${index}`}>{paragraph}</p>)}
      </div> : null}
      {faq.length ? <div data-testid="menu-seo-faq">
        <h2 data-testid="menu-seo-faq-title">{t('editorial.faq')}</h2>
        {faq.map((item, index) => (
          <details key={item.question} data-testid={`menu-seo-faq-item-${index}`}>
            <summary data-testid={`menu-seo-faq-question-${index}`}><span data-testid={`menu-seo-faq-question-text-${index}`}>{item.question}</span><span class="editorial-faq-icon" aria-hidden="true" data-testid={`menu-seo-faq-icon-${index}`} /></summary>
            <p data-testid={`menu-seo-faq-answer-${index}`}>{item.answer}</p>
          </details>
        ))}
      </div> : null}
    </section>
  )
}

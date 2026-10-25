import { Link } from 'wouter-preact'
import { useI18n } from '../lib/i18n'

export type EditorialSection = { heading: string; body?: string; items?: string[] }
export type EditorialContent = {
  kicker: string
  title: string
  intro: string
  image: string
  imageAlt: string
  imageWidth?: number
  imageHeight?: number
  sections: EditorialSection[]
  faq: { question: string; answer: string }[]
}

export function EditorialLanding({ content, children, id }: {
  content: EditorialContent
  children?: preact.ComponentChildren
  id: string
}) {
  const { t } = useI18n()
  return (
    <article class="page editorial-page" data-testid={`editorial-page-${id}`}>
      <header class="page-hero container">
        <p class="editorial-kicker">{content.kicker}</p>
        <h1 class="page-title">{content.title}</h1>
        <p class="editorial-lead">{content.intro}</p>
      </header>
      <figure class="editorial-hero container">
        <img src={content.image} alt={content.imageAlt} width={content.imageWidth || 1280} height={content.imageHeight || 720} fetchpriority="high" decoding="async" />
      </figure>
      <div class="container editorial-sections">
        {content.sections.map((section, index) => (
          <section key={`${id}-${index}`}>
            <h2>{section.heading}</h2>
            {section.body ? <p>{section.body}</p> : null}
            {section.items ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          </section>
        ))}
      </div>
      {children}
      <section class="container editorial-faq">
        <h2>{t('editorial.faq')}</h2>
        {content.faq.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
      <aside class="container editorial-cta">
        <h2>{t('editorial.cta.title')}</h2>
        <div class="editorial-actions">
          <Link href="/reservas" className="btn primary">{t('nav.reserve')}</Link>
          <Link href="/contacto" className="btn">{t('editorial.cta.proposal')}</Link>
          <Link href="/menusdegrupos" className="btn">{t('nav.groupMenus')}</Link>
          <Link href="/arroces-y-paellas" className="btn">{t('editorial.rice')}</Link>
        </div>
      </aside>
    </article>
  )
}

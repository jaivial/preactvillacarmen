import { Link } from 'wouter-preact'
import { useI18n } from '../lib/i18n'

export type EditorialSection = { heading: string; body?: string; items?: string[]; checklist?: boolean }
export type EditorialContent = {
  kicker: string
  title: string
  intro: string
  image?: string
  imageAlt?: string
  imageCaption?: string
  imageWidth?: number
  imageHeight?: number
  downloads?: { href: string; label: string; filename: string }[]
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
    <article class={id.includes('checklist') ? 'page editorial-page editorial-page--checklist' : 'page editorial-page'} data-testid={`editorial-page-${id}`}>
      <header class="page-hero container">
        <p class="editorial-kicker">{content.kicker}</p>
        <h1 class="page-title">{content.title}</h1>
        <p class="editorial-lead">{content.intro}</p>
      </header>
      {content.image ? <figure class="editorial-hero container">
        <img src={content.image} alt={content.imageAlt || ''} width={content.imageWidth || 1280} height={content.imageHeight || 720} fetchpriority="high" decoding="async" />
        {content.imageCaption ? <figcaption>{content.imageCaption}</figcaption> : null}
      </figure> : null}
      <div class="container editorial-sections">
        {content.sections.map((section, index) => (
          <section key={`${id}-${index}`} class={section.checklist ? 'editorial-section editorial-section--checklist' : 'editorial-section'}>
            {section.checklist ? <span class="editorial-section-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span> : null}
            <h2>{section.checklist ? section.heading.replace(/^\d+\.\s*/, '') : section.heading}</h2>
            {section.body ? <p>{section.body}</p> : null}
            {section.items ? <ul class={section.checklist ? 'editorial-checklist' : undefined}>{section.items.map((item) => <li key={item}>{section.checklist ? <label><input type="checkbox" /> <span>{item}</span></label> : item}</li>)}</ul> : null}
          </section>
        ))}
      </div>
      {content.downloads ? <nav class="container editorial-downloads" aria-label={t('resource.downloads')}>
        {content.downloads.map((file) => <a key={file.href} class="btn" href={file.href} download={file.filename}>{file.label}</a>)}
      </nav> : null}
      {children}
      <section class="container editorial-faq">
        <h2>{t('editorial.faq')}</h2>
        {content.faq.map((item) => (
          <details key={item.question}>
            <summary><span>{item.question}</span><span class="editorial-faq-icon" aria-hidden="true" /></summary>
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

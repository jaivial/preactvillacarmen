import type { Lang } from './i18n'
import type { PublicMenu } from './types'

export type FAQItem = { question: string; answer: string }

const blocks = (text?: string) => String(text || '').split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)

// Coordination id: menu_seo_content_v1 - same format the backoffice documents:
// blocks separated by a blank line, first line question, remaining lines answer.
export function parseFAQ(text?: string): FAQItem[] {
  return blocks(text)
    .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length >= 2)
    .map(([question, ...answer]) => ({ question, answer: answer.join(' ') }))
}

// English pages never fall back to Spanish copy so each language stays a clean variant.
export function menuSEOContent(menu: PublicMenu, lang: Lang): { intro: string[]; faq: FAQItem[] } {
  const en = lang === 'en'
  return { intro: blocks(en ? menu.seo_intro_english : menu.seo_intro), faq: parseFAQ(en ? menu.seo_faq_english : menu.seo_faq) }
}

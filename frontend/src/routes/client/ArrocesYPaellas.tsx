import { Link } from 'wouter-preact'
import { EditorialLanding } from '../../components/EditorialLanding'
import { riceContent } from '../../lib/editorialContent'
import { localized, localizedArray, useI18n } from '../../lib/i18n'
import { prerenderData } from '../../lib/prerenderData'
import { menuPath } from '../../lib/routes'
import type { PublicMenuDish } from '../../lib/types'

export function ArrocesYPaellas() {
  const { lang, t } = useI18n()
  const menu = Object.values(prerenderData().menus).find((item) => (
    item.active && item.menu_public_active !== false && (
      item.slug?.startsWith('menu-arrocero-') ||
      item.sections.some((section) => /arroz/i.test(`${section.title} ${section.display_title || ''}`))
    )
  ))
  const riceSection = menu?.sections.find((section) => /arroz/i.test(`${section.title} ${section.display_title || ''}`))
  const dishes = riceSection?.dishes.filter((dish) => dish.active !== false) || []
  const price = Number(menu?.price)
  const conditions = menu ? localizedArray(menu.settings.comments, menu.settings.comments_english, lang) : []
  return (
    <EditorialLanding content={riceContent[lang]} id="rice">
      {menu ? (
        <section class="container editorial-menu" data-testid="rice-current-menu">
          <h2>{t('rice.current')}</h2>
          <p class="editorial-menu-price">
            {Number.isFinite(price) ? <strong>{price.toFixed(2).replace('.00', '')} € {t('rice.perPerson')}</strong> : null}
            {menu.settings.min_party_size ? <span>{t('rice.minimum')} {menu.settings.min_party_size} {t('rice.people')}</span> : null}
          </p>
          <ul class="editorial-dishes">
            {dishes.map((dish: PublicMenuDish) => (
              <li key={dish.id}>
                {localized(dish.title, dish.title_english, lang)}
                {dish.supplement_enabled && dish.supplement_price ? <span> +{dish.supplement_price} €</span> : null}
              </li>
            ))}
          </ul>
          <Link href={menuPath(menu)} className="btn primary">{t('rice.menu')}</Link>
          <h3>{t('rice.conditions')}</h3>
          <ul>{conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
        </section>
      ) : null}
    </EditorialLanding>
  )
}

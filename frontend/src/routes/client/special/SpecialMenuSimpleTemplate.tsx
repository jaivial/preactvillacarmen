import type { PublicMenu } from '../../../lib/types'
import { CtaButton } from '../../../components/ui/CtaButton'

function formatEuro(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(2)}€`
}

function formatSpecialDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Special menu rendering.
 *
 * The hero keeps the existing single-image behaviour so legacy special menus
 * keep rendering. When the editor adds image sections (see
 * /app/comida/menus/crear?menuId= step 4) each section is rendered below the
 * hero with its optional title above the image.
 *
 * Coordination id: special_menu_sections_v1
 */
export function SpecialMenuSimpleTemplate(props: {
  menu: PublicMenu
  subtitle: string
  imageUrl: string
}) {
  const sections = Array.isArray(props.menu.special_menu_sections)
    ? props.menu.special_menu_sections
    : []
  const hasSections = sections.length > 0
  // Coordination id: special_menu_price_date_v1
  const specialDate = props.menu.special_date ?? null

  return (
    <div class="page menuPage menuPage--special">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{props.menu.menu_title}</h1>
          <p class="page-subtitle">{props.subtitle}</p>
          {specialDate ? (
            <div class="specialMenuDay" data-coordination-id="special_menu_price_date_v1" data-testid="public-special-menu-day">
              <p class="specialMenuDayDate">
                {specialDate.title ? `${specialDate.title} · ` : ''}{formatSpecialDay(specialDate.date)}
              </p>
              {specialDate.prereserva_enabled ? (
                <p class="specialMenuDayPrereserva" data-testid="public-special-menu-prereserva">Es necesaria prereserva para esta fecha.</p>
              ) : null}
              <a class="btn btn--primary specialMenuDayBook" href={`/reservas?date=${encodeURIComponent(specialDate.date)}`} data-testid="public-special-menu-book">
                Reservar para esta fecha
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {props.imageUrl ? (
            <div class="specialMenuImageContainer">
              <img
                class="specialMenuImage"
                src={props.imageUrl}
                alt={props.menu.menu_title}
                loading="eager"
                decoding="async"
              />
            </div>
          ) : !hasSections ? (
            <div class="menuState">No hay imagen subida para este menú especial.</div>
          ) : null}

          {hasSections ? (
            <div class="specialMenuSections" data-coordination-id="special_menu_sections_v1">
              {sections.map((section) => (
                <article
                  key={section.id}
                  class="specialMenuSection"
                  data-testid={`public-menu-section-${section.id}`}
                >
                  {section.title ? (
                    <h2 class="specialMenuSectionTitle">{section.title}</h2>
                  ) : null}
                  {section.price != null ? (
                    <p class="specialMenuSectionPrice" data-testid={`public-menu-section-price-${section.id}`}>{formatEuro(section.price)} / pax</p>
                  ) : null}
                  {section.image_url ? (
                    <img
                      class="specialMenuSectionImage"
                      src={section.image_url}
                      alt={section.title || props.menu.menu_title}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div class="menuState specialMenuSectionEmpty">
                      Sin imagen para esta sección.
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : null}

          {props.menu.special_cta?.href ? (
            <div class="specialMenuCta" data-testid="public-special-menu-cta-row">
              <CtaButton
                className="specialMenuCtaButton"
                href={props.menu.special_cta.href}
                label={props.menu.special_cta.label || 'RESERVAR'}
                newTab={props.menu.special_cta.opens_new_tab}
                testId="public-special-menu-cta"
                coordinationId="special_menu_cta_v1"
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

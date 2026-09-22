import type { PublicMenu } from '../../../lib/types'

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

  return (
    <div class="page menuPage menuPage--special">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{props.menu.menu_title}</h1>
          <p class="page-subtitle">{props.subtitle}</p>
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
        </div>
      </section>
    </div>
  )
}

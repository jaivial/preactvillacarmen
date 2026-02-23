import type { PublicMenu } from '../../../lib/types'
import type { PublicMenuViewSection } from '../menuPublicHelpers'
import { GroupStyleDishSection } from '../MenuShared'

export function SpecialMenuSimpleTemplate(props: {
  menu: PublicMenu
  subtitle: string
  imageUrl: string
  sections: PublicMenuViewSection[]
}) {
  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{props.menu.menu_title}</h1>
          <p class="page-subtitle">{props.subtitle}</p>
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {props.imageUrl ? (
            <img
              class="menuHeroShot is-active is-reduced"
              src={props.imageUrl}
              alt={props.menu.menu_title}
              loading="eager"
              decoding="async"
            />
          ) : (
            <div class="menuState">No hay imagen subida para este menú especial.</div>
          )}

          {props.sections.length > 0 ? (
            <article class="menuSectionCard">
              <div class="menuGrid menuGrid--single">
                {props.sections.map((section) => (
                  <GroupStyleDishSection
                    key={`${section.id}-${section.title}`}
                    title={section.title}
                    dishes={section.dishes}
                    annotations={section.annotations}
                  />
                ))}
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  )
}

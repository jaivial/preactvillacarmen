import type { PublicMenu } from '../../../lib/types'

export function SpecialMenuSimpleTemplate(props: {
  menu: PublicMenu
  subtitle: string
  imageUrl: string
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
            <div class="specialMenuImageContainer">
              <img
                class="specialMenuImage"
                src={props.imageUrl}
                alt={props.menu.menu_title}
                loading="eager"
                decoding="async"
              />
            </div>
          ) : (
            <div class="menuState">No hay imagen subida para este menú especial.</div>
          )}
        </div>
      </section>
    </div>
  )
}

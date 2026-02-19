import { createContext } from 'preact'
import type { ComponentChildren } from 'preact'
import { useContext, useEffect, useMemo, useState } from 'preact/hooks'

export type Lang = 'es' | 'en'

type Dictionary = Record<string, { es: string; en: string }>

const STORAGE_KEY = 'villacarmen_lang'

const DICT: Dictionary = {
  'nav.home': { es: 'Inicio', en: 'Home' },
  'nav.weekendMenu': { es: 'Men\u00fa Fin de Semana', en: 'Weekend Menu' },
  'nav.dailyMenu': { es: 'Men\u00fa del D\u00eda', en: 'Daily Menu' },
  'nav.groupMenus': { es: 'Men\u00fas de Grupos', en: 'Group Menus' },
  'nav.desserts': { es: 'Postres', en: 'Desserts' },
  'nav.wines': { es: 'Vinos', en: 'Wines' },
  'nav.reservations': { es: 'Reservas', en: 'Reservations' },
  'nav.valentine': { es: 'San Valent\u00edn', en: "Valentine's" },
  'nav.gift': { es: 'Regala', en: 'Gift' },
  'nav.contact': { es: 'Contacto', en: 'Contact' },
  'nav.menusSection': { es: 'Men\u00fas', en: 'Menus' },
  'nav.weddingsEvents': { es: 'Bodas y eventos', en: 'Weddings and events' },
  'nav.menus': { es: 'Carta', en: 'Menu' },
  'nav.reserve': { es: 'Reservar', en: 'Reserve' },
  'nav.lang': { es: 'Idioma', en: 'Language' },

  'common.ok': { es: 'Aceptar', en: 'OK' },

  'reservations.people.label': { es: 'Personas', en: 'Guests' },
  'reservations.people.suffix': { es: 'personas', en: 'guests' },
  'reservations.confirm.title': { es: '\u00a1Reserva confirmada!', en: 'Reservation confirmed!' },
  'reservations.confirm.lead': {
    es: 'Reserva completada. Dentro de nada recibir\u00e1s una confirmaci\u00f3n por email y a tu n\u00famero de tel\u00e9fono.',
    en: 'Reservation completed. You will soon receive a confirmation by email and to your phone number.',
  },
  'reservations.confirm.fine': { es: 'Por favor no contestes a estos mensajes.', en: 'Please do not reply to these messages.' },
  'reservations.confirm.elegant': { es: 'Te esperamos pronto.', en: 'We look forward to seeing you soon.' },

  'home.hero.kicker': { es: 'Catarroja \u00b7 Valencia', en: 'Catarroja \u00b7 Valencia' },
  'home.hero.title': { es: 'Alquer\u00eda Villacarmen', en: 'Alqueria Villacarmen' },
  'home.hero.tagline': { es: 'Tradici\u00f3n y gastronom\u00eda mediterr\u00e1nea', en: 'Mediterranean tradition and gastronomy' },
  'home.hero.scroll': { es: 'Ad\u00e9ntrate en la alquer\u00eda', en: 'Step into the alqueria' },

  'home.intro.kicker': { es: 'Bienvenido', en: 'Welcome' },
  'home.intro.title': { es: 'Una experiencia para ir despacio', en: 'A place to slow down' },
  'home.intro.description': {
    es: 'Cocina mediterr\u00e1nea con alma de huerta. Luz, jardines y sobremesa larga.',
    en: 'Mediterranean cuisine with orchard soul. Light, gardens, and long conversations.',
  },

  'home.menus.title': { es: 'Nuestros Men\u00fas', en: 'Our Menus' },
  'home.menus.subtitle': { es: 'Disponibilidad seg\u00fan d\u00eda y temporada.', en: 'Availability varies by day and season.' },
  'home.menus.from': { es: 'Desde', en: 'From' },
  'home.menus.loadingPrice': { es: 'Cargando precio...', en: 'Loading price...' },

  'home.scrollfx.line1': { es: 'Descubrir', en: 'Discover' },
  'home.scrollfx.line2': { es: 'Gastronomia', en: 'Gastronomy' },
  'home.scrollfx.line3': { es: 'Jardines', en: 'Gardens' },
  'home.scrollfx.line4': { es: 'Eventos', en: 'Events' },

  'home.showcase.kicker': { es: 'Especialidades', en: 'Specialties' },
  'home.showcase.title': { es: 'Arroces, producto y calma', en: 'Paellas, produce, and calm' },
  'home.showcase.subtitle': {
    es: 'Entre las mejores arrocer\u00edas en el editorial \u2018Top 50 Paellas de la Comunidad Valenciana\u2019.',
    en: 'Featured among the best rice restaurants in the editorial \u2018Top 50 Paellas of the Valencian Community\u2019.',
  },
  'home.showcase.items.1.title': { es: 'Arroces que definen la casa', en: 'Signature rice dishes' },
  'home.showcase.items.1.body': {
    es: 'Punto, sabor y tradici\u00f3n. El arroz es nuestro lenguaje: directo, elegante y mediterr\u00e1neo.',
    en: 'Timing, flavor, and tradition. Rice is our language: direct, elegant, and Mediterranean.',
  },
  'home.showcase.items.2.title': { es: 'Entrantes para compartir', en: 'Starters to share' },
  'home.showcase.items.2.body': {
    es: 'Bocados para empezar despacio: textura, cremosidad y ese punto de cocina de casa.',
    en: 'A gentle start: texture, creaminess, and that home-kitchen touch.',
  },
  'home.showcase.items.3.title': { es: 'Salones con magia serena', en: 'Rooms with quiet magic' },
  'home.showcase.items.3.body': {
    es: 'M\u00faltiples salones y rincones para encontrar paz: luz, jard\u00edn y una calma que se contagia.',
    en: 'Multiple rooms and corners to find peace: light, garden, and a calm that spreads.',
  },

  'home.events.kicker': { es: 'Bodas y Eventos', en: 'Weddings and Events' },
  'home.events.title': { es: 'Un lugar para celebrar', en: 'A place to celebrate' },
  'home.events.body': {
    es: 'Cuidamos cada detalle para que el d\u00eda se sienta natural: salones, jardines y una cocina que acompa\u00f1a.',
    en: 'We care for every detail so the day feels effortless: rooms, gardens, and cuisine that supports it all.',
  },
  'home.events.cta.groups': { es: 'Ver men\u00fas de grupos', en: 'View group menus' },
  'home.events.cta.more': { es: 'Ver m\u00e1s', en: 'View more' },

  'events.hero.kicker': { es: 'Bodas y eventos', en: 'Weddings and events' },
  'events.hero.title': { es: 'Celebraciones con alma mediterr\u00e1nea', en: 'Mediterranean celebrations with soul' },
  'events.hero.body': {
    es: 'Bodas, aniversarios y celebraciones privadas entre salones y jardines, con cocina mediterr\u00e1nea y una puesta en escena elegante.',
    en: 'Weddings, anniversaries, and private celebrations across rooms and gardens with Mediterranean cuisine and an elegant atmosphere.',
  },
  'events.hero.gallery': { es: 'Ver galer\u00eda', en: 'View gallery' },
  'events.hero.alt': { es: 'Boda en jard\u00edn', en: 'Garden wedding' },
  'events.hero.word1': { es: 'Momentos', en: 'Moments' },
  'events.hero.word2': { es: 'que', en: 'that' },
  'events.hero.word3': { es: 'nunca', en: 'never' },
  'events.hero.word4': { es: 'se borran', en: 'fade' },
  'events.intro.statement': {
    es: 'Cada celebraci\u00f3n merece su propio ritmo: luz, detalles y una atm\u00f3sfera que emociona desde el primer instante.',
    en: 'Every celebration deserves its own rhythm: light, details, and an atmosphere that moves you from the very first moment.',
  },
  'events.portfolio.kicker': { es: 'Colecciones', en: 'Collections' },
  'events.portfolio.title': { es: 'Historias de bodas y eventos', en: 'Wedding and event stories' },
  'events.portfolio.card1.title': { es: 'Wedding Garden', en: 'Wedding Garden' },
  'events.portfolio.card1.meta': { es: 'Valencia \u00b7 Exterior', en: 'Valencia \u00b7 Outdoor' },
  'events.portfolio.card2.title': { es: 'Caterings especiales', en: 'Special caterings' },
  'events.portfolio.card2.meta': { es: 'Caterings especiales', en: 'Special caterings' },
  'events.portfolio.card3.title': { es: 'Celebraciones \u00fanicas', en: 'Unique celebrations' },
  'events.portfolio.card3.meta': { es: 'Espacios inolvidables', en: 'Unforgettable spaces' },
  'events.ribbon': {
    es: 'FOTOGRAF\u00cdA DE BODAS \u00b7 EVENTOS PRIVADOS \u00b7 CELEBRACIONES \u00b7 MOMENTOS \u00cdNTIMOS',
    en: 'WEDDING PHOTOGRAPHY \u00b7 PRIVATE EVENTS \u00b7 CELEBRATIONS \u00b7 INTIMATE MOMENTS',
  },
  'events.bandline': {
    es: 'DISE\u00d1O CUIDADO \u00b7 DETALLE ARTESANAL \u00b7 COCINA MEDITERR\u00c1NEA \u00b7 ESPACIOS CON LUZ',
    en: 'CAREFUL DESIGN \u00b7 CRAFTED DETAILS \u00b7 MEDITERRANEAN CUISINE \u00b7 LIGHT-FILLED SPACES',
  },
  'events.story.kicker': { es: 'Nuestra propuesta', en: 'Our approach' },
  'events.story.title': { es: 'Un escenario completo para tu d\u00eda', en: 'A complete setting for your day' },
  'events.story.p1': {
    es: 'La experiencia combina jardines, arquitectura y mesas pensadas para vivir la celebraci\u00f3n con ritmo natural.',
    en: 'The experience combines gardens, architecture, and tables designed for a celebration that flows naturally.',
  },
  'events.story.p2': {
    es: 'Nuestro equipo coordina tiempos, atm\u00f3sfera y cocina para que cada momento se sienta elegante y cercano.',
    en: 'Our team coordinates timing, atmosphere, and cuisine so each moment feels elegant and personal.',
  },
  'events.gallery.kicker': { es: 'Galer\u00eda', en: 'Gallery' },
  'events.gallery.title': { es: 'Bodas y eventos en Alquer\u00eda Villacarmen', en: 'Weddings and events at Alqueria Villacarmen' },
  'events.gallery.alt': { es: 'Imagen de boda y evento', en: 'Wedding and event image' },
  'events.details.service.title': { es: 'Acompa\u00f1amiento integral', en: 'End-to-end guidance' },
  'events.details.service.body': {
    es: 'Te acompa\u00f1amos desde la primera visita hasta el \u00faltimo brindis para que todo funcione con calma.',
    en: 'We support you from the first visit to the final toast so every part of the day runs smoothly.',
  },
  'events.details.spaces.title': { es: 'Espacios vers\u00e1tiles', en: 'Flexible spaces' },
  'events.details.spaces.body': {
    es: 'Interiores y exteriores adaptables para ceremonia, c\u00f3ctel y banquete con distintos estilos de montaje.',
    en: 'Indoor and outdoor areas adaptable for ceremony, cocktail, and banquet with different setup styles.',
  },
  'events.details.menu.title': { es: 'Cocina a medida', en: 'Tailored cuisine' },
  'events.details.menu.body': {
    es: 'Propuestas de men\u00fa y recetario mediterr\u00e1neo para eventos \u00edntimos o celebraciones de gran formato.',
    en: 'Menu proposals and Mediterranean dishes for intimate events or larger celebrations.',
  },
  'events.cta.kicker': { es: 'Planifica tu fecha', en: 'Plan your date' },
  'events.cta.title': { es: 'Hablemos de tu boda o evento', en: 'Let us plan your wedding or event' },
  'events.cta.body': {
    es: 'Cu\u00e9ntanos la idea y preparamos una propuesta personalizada para vuestro d\u00eda.',
    en: 'Share your idea and we will prepare a tailored proposal for your day.',
  },
  'events.cookies.text': {
    es: 'Usamos cookies para mejorar tu experiencia',
    en: 'We use cookies to enhance your experience',
  },
  'events.cookies.accept': { es: 'Aceptar', en: 'Accept all' },
  'events.cookies.reject': { es: 'Rechazar', en: 'Reject all' },

  'home.story.kicker': { es: 'La Alquer\u00eda', en: 'The Alqueria' },
  'home.story.title': { es: 'Jardines, salones y huerta', en: 'Gardens, rooms, and orchard' },
  'home.story.body': {
    es: 'Un lugar luminoso para conversar, brindar y compartir. Producto mediterr\u00e1neo, detalles con calma.',
    en: 'A bright place to talk, toast, and share. Mediterranean product, thoughtful details.',
  },
  'home.story.cta.wines': { es: 'Carta de vinos', en: 'Wine list' },
  'home.story.cta.groups': { es: 'Men\u00fas de grupos', en: 'Group menus' },

  'home.panels.food': { es: 'Comida', en: 'Cuisine' },
  'home.panels.rooms': { es: 'Salones', en: 'Rooms' },
  'home.panels.events': { es: 'Eventos', en: 'Events' },
  'home.panels.discover': { es: 'Descubrir', en: 'Discover' },

  'home.cta.title': { es: 'Reserva tu mesa', en: 'Reserve your table' },
  'home.cta.body': {
    es: 'Elige d\u00eda, ven con tiempo, y alarga la sobremesa.',
    en: 'Pick a day, come unhurried, and stay for the after-dinner talk.',
  },

  'menus.card.weekend.title': { es: 'Fin de Semana', en: 'Weekend' },
  'menus.card.weekend.subtitle': { es: 'S\u00e1bados, domingos y festivos', en: 'Saturdays, Sundays and holidays' },
  'menus.card.daily.title': { es: 'Men\u00fa del D\u00eda', en: 'Daily Menu' },
  'menus.card.daily.subtitle': { es: 'Jueves y viernes (no festivos)', en: 'Thu and Fri (non-holidays)' },
  'menus.card.groups.title': { es: 'Celebraciones en Grupo', en: 'Group Celebrations' },
  'menus.card.groups.subtitle': { es: 'Para mesas de m\u00e1s de 8 personas', en: 'For tables of more than 8' },
  'menus.card.valentine.title': { es: 'San Valent\u00edn', en: "Valentine's" },
  'menus.card.valentine.subtitle': { es: 'Men\u00fa especial (temporada)', en: 'Seasonal special menu' },

  'menus.preview.weekend.title': { es: 'Men\u00fa Fin de Semana', en: 'Weekend Menu' },
  'menus.preview.weekend.flavor': { es: 'S\u00e1bados, domingos y festivos', en: 'Weekends and holidays' },
  'menus.preview.daily.title': { es: 'Men\u00fa del D\u00eda', en: 'Daily Menu' },
  'menus.preview.daily.flavor': { es: 'Jueves y viernes', en: 'Thu and Fri' },
  'menus.preview.view': { es: 'Ver men\u00fa', en: 'View menu' },
  'menus.preview.loading': { es: 'Cargando...', en: 'Loading...' },
  'menus.preview.unavailable': { es: 'No disponible', en: 'Unavailable' },
  'menus.preview.starters': { es: 'Entrantes', en: 'Starters' },
  'menus.preview.mains': { es: 'Principales', en: 'Mains' },
  'menus.preview.price': { es: 'Precio', en: 'Price' },

  'menu.section.rice': { es: 'Arroces', en: 'Rice dishes' },
  'menu.rice.lead': {
    es: 'O si prefieres, puedes elegir uno de nuestros arroces como principal.',
    en: 'Or, if you prefer, you can choose one of our rice dishes as your main course.',
  },
  'menu.rice.note1': { es: 'Arroces mínimo para 2 personas.', en: 'Rice dishes: minimum for 2 people.' },
  'menu.rice.note2': {
    es: 'Solamente un tipo de arroz en mesa completa para mesas de menos de 9 personas.',
    en: 'Only one type of rice per table for tables of fewer than 9 people.',
  },
  'menu.rice.note3': {
    es: 'En mesas a partir de 9 personas se podrán pedir dos arroces distintos, siendo uno de ellos seco y otro meloso.',
    en: 'For tables of 9 or more, two different rice dishes may be ordered: one dry and one creamy (meloso).',
  },
  'menu.rice.note4': {
    es: 'Si en mesas inferiores de 9 personas desean pedir dos tipos de arroces distintos, siendo uno seco y otro meloso, tendrían un suplemento de 12€ en la cuenta total, por servicio extra.',
    en: 'For tables of fewer than 9 wishing to order two different rice dishes (one dry and one creamy), there is a 12€ supplement on the total bill due to extra service.',
  },
  'menu.price.dessertOrCoffee': { es: 'Postre o café a elegir', en: 'Dessert or coffee (choose one)' },
  'menu.price.drinkNotIncluded': { es: 'Bebida no incluida', en: 'Drinks not included' },
  'menu.important.title': { es: 'Información importante', en: 'Important information' },
  'menu.important.minConsumption': {
    es: 'Consumo mínimo: 1 menú por plaza reservada en la mesa, independientemente de la edad de los comensales.',
    en: 'Minimum consumption: 1 menu per reserved seat at the table, regardless of guests’ age.',
  },
  'menu.important.noKidsMenu': { es: 'No hay menú infantil.', en: 'No kids menu.' },
  'menu.takeaway.note': {
    es: 'Envases para llevar: 1€ (Cobro obligatorio por Ley de Residuos 7/2020).',
    en: 'Takeaway containers: 1€ (Mandatory charge under Waste Law 7/2020).',
  },

  'menu.pick.add': { es: 'A\u00f1adir a tu lista', en: 'Add to your list' },
  'menu.pick.open': { es: 'Ver tu lista', en: 'View your list' },
  'menu.pick.title': { es: 'Tu lista', en: 'Your list' },
  'menu.pick.total.aria': { es: 'Total de platos', en: 'Total items' },
  'menu.pick.empty': { es: 'A\u00fan no has a\u00f1adido nada.', en: "You haven't added anything yet." },
  'menu.pick.clear': { es: 'Vaciar', en: 'Clear' },
  'menu.pick.close': { es: 'Cerrar', en: 'Close' },
  'menu.pick.qty.decrease': { es: 'Disminuir', en: 'Decrease' },
  'menu.pick.qty.increase': { es: 'Aumentar', en: 'Increase' },

  'menu.allergens.aria': { es: 'Alérgenos', en: 'Allergens' },
  'menu.allergens.legend.title': { es: 'Leyenda de alérgenos', en: 'Allergen legend' },
  'menu.slider.aria': { es: 'Imágenes de comida', en: 'Food images' },
  'menu.slider.prev': { es: 'Imagen anterior', en: 'Previous image' },
  'menu.slider.next': { es: 'Imagen siguiente', en: 'Next image' },
  'menu.slider.goto': { es: 'Ir a imagen', en: 'Go to image' },
  'menu.slider.dots': { es: 'Selector de imágenes', en: 'Image selector' },
  'menu.error': { es: 'No se pudo cargar el contenido.', en: 'Could not load content.' },
  'menu.empty': { es: 'No hay contenido disponible.', en: 'No content available.' },
  'menu.fallback.title': { es: 'Este menú no está disponible', en: 'This menu is not available' },
  'menu.fallback.body': {
    es: 'Ahora mismo no podemos mostrar este contenido. Puedes volver a Inicio para explorar los menús activos.',
    en: 'We cannot show this content right now. You can go back Home and browse available menus.',
  },
  'menu.fallback.groups.title': { es: 'No hay menús de grupos activos', en: 'No active group menus right now' },
  'menu.fallback.groups.body': {
    es: 'En este momento no tenemos menús de grupos publicados. Te invitamos a consultar el resto de nuestra carta.',
    en: 'There are no published group menus at the moment. You can explore the rest of our menu.',
  },
  'menu.fallback.home': { es: 'Volver a Inicio', en: 'Back to Home' },
  'menu.postres.subtitle': { es: 'Dulces de temporada y clásicos.', en: 'Seasonal sweets and classics.' },
  'menu.wines.subtitle': { es: 'Una selección para acompañar el arroz.', en: 'A selection to pair with rice.' },

  'groupMenus.empty': { es: 'No hay menús de grupos disponibles.', en: 'No group menus available.' },
  'groupMenus.section.starters': { es: 'Entrantes al centro', en: 'Starters to share' },
  'groupMenus.section.dessert': { es: 'Postre', en: 'Dessert' },
  'groupMenus.section.beverages': { es: 'Bebidas', en: 'Drinks' },
  'groupMenus.section.comments': { es: 'Comentarios', en: 'Notes' },
  'groupMenus.coffee.included': { es: 'Café incluido', en: 'Coffee included' },
  'groupMenus.coffee.notIncluded': { es: 'Café no incluido', en: 'Coffee not included' },
  'groupMenus.beverage.pax': { es: 'pax', en: 'pp' },
  'groupMenus.beverage.unlimited': { es: 'Bebida ilimitada', en: 'Unlimited drinks' },
  'groupMenus.beverage.option': { es: 'Opción a bebida ilimitada', en: 'Unlimited drinks option' },
  'groupMenus.beverage.table': { es: '(A mesa completa)', en: '(Whole table)' },
  'groupMenus.beverage.includes1': {
    es: 'Incluye bebidas desde el entrante hasta servir el postre.',
    en: 'Includes drinks from starters until dessert is served.',
  },
  'groupMenus.beverage.includes2': {
    es: '(Incluye agua, refrescos, cerveza de barril y vinos valencianos)',
    en: '(Includes water, soft drinks, draft beer and Valencian wines)',
  },
  'groupMenus.beverage.notIncluded': { es: 'Bebida a parte', en: 'Drinks not included' },

  'wines.type.tinto': { es: 'Tinto', en: 'Red' },
  'wines.type.blanco': { es: 'Blanco', en: 'White' },
  'wines.type.cava': { es: 'Cava', en: 'Sparkling' },
  'wines.error': { es: 'No se pudo cargar la carta de vinos.', en: 'Could not load wine list.' },
  'wines.empty': { es: 'No hay vinos disponibles.', en: 'No wines available.' },

  'footer.contact': { es: 'Contacto', en: 'Contact' },
  'footer.social': { es: 'Redes', en: 'Social' },
  'footer.openMaps': { es: 'Abrir en Google Maps', en: 'Open in Google Maps' },

  'placeholder.subtitle': { es: 'Ruta creada. P\u00e1gina en migraci\u00f3n.', en: 'Route created. Page in migration.' },
  'placeholder.backHome': { es: 'Inicio', en: 'Home' },
  'placeholder.contact': { es: 'Contacto', en: 'Contact' },

  'contact.title': { es: 'Contacto', en: 'Contact' },
  'contact.subtitle': { es: 'Direcci\u00f3n, horario y c\u00f3mo llegar.', en: 'Address, opening hours and directions.' },
  'contact.address': { es: 'Direcci\u00f3n', en: 'Address' },
  'contact.directions': { es: 'C\u00f3mo llegar', en: 'Get directions' },
  'contact.hours': { es: 'Horario', en: 'Hours' },
}

type I18nState = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nState | null>(null)

function normalizeLang(value: string | null | undefined): Lang | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v === 'es' || v.startsWith('es-')) return 'es'
  if (v === 'en' || v.startsWith('en-')) return 'en'
  return null
}

export function I18nProvider(props: { children: ComponentChildren }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'es'
    const stored = normalizeLang(window.localStorage.getItem(STORAGE_KEY))
    if (stored) return stored
    const detected = normalizeLang(window.navigator.language)
    return detected || 'es'
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18nState>(() => {
    const t = (key: string) => {
      const entry = DICT[key]
      if (!entry) return key
      return entry[lang] || entry.es
    }
    return { lang, setLang, t }
  }, [lang])

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

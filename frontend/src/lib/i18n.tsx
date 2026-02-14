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
  'nav.menus': { es: 'Carta', en: 'Menu' },
  'nav.reserve': { es: 'Reservar', en: 'Reserve' },
  'nav.lang': { es: 'Idioma', en: 'Language' },

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

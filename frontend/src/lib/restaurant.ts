import type { Lang } from './i18n'

export const RESTAURANT = {
  name: 'Alquería Villa Carmen',
  phone: '+34638857294',
  email: 'reservas@alqueriavillacarmen.com',
  street: 'C/ Sequia de Rascanya, 2',
  postalCode: '46470',
  locality: 'Catarroja',
  region: 'Valencia',
  country: 'ES',
  latitude: 39.403671,
  longitude: -0.4160981,
  instagram: 'https://www.instagram.com/alqueria_villacarmen/?hl=es',
  directions: 'https://www.google.com/maps/dir//Alquer%C3%ADa+Villa+Carmen/data=!4m8!4m7!1m0!1m5!1m1!1s0xd604fed36fb5283:0xebbb1fe4b41e6e15!2m2!1d-0.41609809999999997!2d39.403670999999996',
} as const

export const OPENING_HOURS = [
  { days: ['Monday', 'Tuesday', 'Wednesday'], es: 'lun–mié: Cerrado', en: 'Mon–Wed: Closed' },
  { days: ['Thursday'], es: 'jue: 13:30–17:00', en: 'Thu: 13:30–17:00', opens: '13:30', closes: '17:00' },
  { days: ['Friday'], es: 'vie: 13:30–17:30', en: 'Fri: 13:30–17:30', opens: '13:30', closes: '17:30' },
  { days: ['Saturday', 'Sunday'], es: 'sáb–dom: 13:30–18:00', en: 'Sat–Sun: 13:30–18:00', opens: '13:30', closes: '18:00' },
] as const

export function openingHours(lang: Lang): string[] {
  return OPENING_HOURS.map((entry) => entry[lang])
}

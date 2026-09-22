import type { PopoverSelectOption } from './PopoverSelect'

/**
 * Single source of truth for the reservation phone country picker, shared by
 * the booking wizard and the self-service modify page.
 *
 * Coordination id: reservation_self_modification_v1
 */
export type Country = { name: string; code: string; flag: string; dial: string; keywords: string }

export function buildCountries(t: (es: string, en: string) => string): Country[] {
  return [
    { name: t('España', 'Spain'), code: 'ES', flag: '🇪🇸', dial: '34', keywords: 'spain espana esp' },
    { name: t('Francia', 'France'), code: 'FR', flag: '🇫🇷', dial: '33', keywords: 'france' },
    { name: 'Portugal', code: 'PT', flag: '🇵🇹', dial: '351', keywords: 'portugal' },
    { name: t('Reino Unido', 'United Kingdom'), code: 'GB', flag: '🇬🇧', dial: '44', keywords: 'uk united kingdom britain' },
    { name: t('Alemania', 'Germany'), code: 'DE', flag: '🇩🇪', dial: '49', keywords: 'germany deutschland' },
    { name: t('Italia', 'Italy'), code: 'IT', flag: '🇮🇹', dial: '39', keywords: 'italy italia' },
    { name: t('Estados Unidos', 'United States'), code: 'US', flag: '🇺🇸', dial: '1', keywords: 'usa united states' },
    { name: t('México', 'Mexico'), code: 'MX', flag: '🇲🇽', dial: '52', keywords: 'mexico' },
    { name: 'Argentina', code: 'AR', flag: '🇦🇷', dial: '54', keywords: 'argentina' },
    { name: 'Colombia', code: 'CO', flag: '🇨🇴', dial: '57', keywords: 'colombia' },
    { name: t('Países Bajos', 'Netherlands'), code: 'NL', flag: '🇳🇱', dial: '31', keywords: 'netherlands holland' },
    { name: t('Bélgica', 'Belgium'), code: 'BE', flag: '🇧🇪', dial: '32', keywords: 'belgium' },
    { name: t('Suiza', 'Switzerland'), code: 'CH', flag: '🇨🇭', dial: '41', keywords: 'switzerland suisse' },
    { name: t('Irlanda', 'Ireland'), code: 'IE', flag: '🇮🇪', dial: '353', keywords: 'ireland' },
    { name: t('Suecia', 'Sweden'), code: 'SE', flag: '🇸🇪', dial: '46', keywords: 'sweden' },
    { name: t('Noruega', 'Norway'), code: 'NO', flag: '🇳🇴', dial: '47', keywords: 'norway' },
    { name: t('Dinamarca', 'Denmark'), code: 'DK', flag: '🇩🇰', dial: '45', keywords: 'denmark' },
  ]
}

export function countrySelectOptions(countries: Country[]): PopoverSelectOption[] {
  return countries.map((c) => ({
    value: c.dial,
    label: c.name,
    left: c.flag,
    right: `+${c.dial}`,
    keywords: `${c.keywords} +${c.dial} ${c.dial}`,
  }))
}

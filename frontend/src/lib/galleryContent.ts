import type { CdnGalleryItem } from '../components/CdnGallery'
import type { Lang } from './i18n'

export type CdnGalleryContent = { label: string; items: CdnGalleryItem[] }

const CDN = 'https://villacarmenmedia.b-cdn.net'

// Coordination id: galerias_seo_locales_20261117 - selection approved by the
// owner on 2026-11-17 (WhatsApp); all files live in the villacarmen storage
// zone as WebP <= 300 KB. Professional Drive photos: usage rights confirmed
// by the owner with the selection approval.
export const celebrationGalleries: Record<string, Record<Lang, CdnGalleryContent>> = {
  '/bodas': {
    es: {
      label: 'Fotos de bodas en Alquería Villa Carmen',
      items: [
        { src: `${CDN}/images/eventos/bodas/16%3A9/boda-mesa-imperial-jardin.webp`, alt: 'Mesa imperial de boda con fondo verde en Alquería Villa Carmen, Catarroja', width: 1600, height: 1067 },
        { src: `${CDN}/images/eventos/bodas/16%3A9/boda-salon-ceremonia-arco-floral.webp`, alt: 'Salón de ceremonia de boda con arco floral en Alquería Villa Carmen', width: 1600, height: 1067 },
        { src: `${CDN}/images/eventos/bodas/16%3A9/boda-mesa-tartas.webp`, alt: 'Mesa de tartas de boda en Alquería Villa Carmen, Catarroja', width: 1600, height: 1067 },
      ],
    },
    en: {
      label: 'Wedding photos at Alqueria Villa Carmen',
      items: [
        { src: `${CDN}/images/eventos/bodas/16%3A9/boda-mesa-imperial-jardin.webp`, alt: 'Imperial wedding table with green backdrop at Alqueria Villa Carmen, Catarroja', width: 1600, height: 1067 },
        { src: `${CDN}/images/eventos/bodas/16%3A9/boda-salon-ceremonia-arco-floral.webp`, alt: 'Wedding ceremony room with floral arch at Alqueria Villa Carmen', width: 1600, height: 1067 },
        { src: `${CDN}/images/eventos/bodas/16%3A9/boda-mesa-tartas.webp`, alt: 'Wedding cake table at Alqueria Villa Carmen, Catarroja', width: 1600, height: 1067 },
      ],
    },
  },
  '/comuniones': {
    es: {
      label: 'Fotos de comuniones en Alquería Villa Carmen',
      items: [
        { src: `${CDN}/images/eventos/comuniones/16%3A9/comunion-salon-montado.webp`, alt: 'Salón montado para una comunión en Alquería Villa Carmen, Catarroja', width: 1600, height: 1067 },
        { src: `${CDN}/images/eventos/comuniones/16%3A9/comunion-mesa-detalles-invitados.webp`, alt: 'Mesa de detalles para invitados de comunión en Alquería Villa Carmen', width: 1600, height: 1067 },
        { src: `${CDN}/images/eventos/comuniones/9%3A16/comunion-carrito-chuches-globos.webp`, alt: 'Carrito de chuches con globos para una comunión en Alquería Villa Carmen', width: 1600, height: 2400 },
      ],
    },
    en: {
      label: 'First communion photos at Alqueria Villa Carmen',
      items: [
        { src: `${CDN}/images/eventos/comuniones/16%3A9/comunion-salon-montado.webp`, alt: 'Room set up for a first communion at Alqueria Villa Carmen, Catarroja', width: 1600, height: 1067 },
        { src: `${CDN}/images/eventos/comuniones/16%3A9/comunion-mesa-detalles-invitados.webp`, alt: 'Guest favour table for a communion at Alqueria Villa Carmen', width: 1600, height: 1067 },
        { src: `${CDN}/images/eventos/comuniones/9%3A16/comunion-carrito-chuches-globos.webp`, alt: 'Sweet cart with balloons for a communion at Alqueria Villa Carmen', width: 1600, height: 2400 },
      ],
    },
  },
  '/bautizos': {
    es: {
      label: 'Fotos de bautizos en Alquería Villa Carmen',
      items: [
        { src: `${CDN}/images/eventos/bautizos/16%3A9/bautizo-estanteria-dulces.webp`, alt: 'Estantería de dulces para un bautizo en Alquería Villa Carmen, Catarroja', width: 1200, height: 800 },
        { src: `${CDN}/images/eventos/bautizos/9%3A16/bautizo-mesa-dulce.webp`, alt: 'Mesa dulce de bautizo en Alquería Villa Carmen', width: 1200, height: 1800 },
        { src: `${CDN}/images/eventos/bautizos/16%3A9/bautizo-salon-arco-floral.webp`, alt: 'Salón montado con arco floral para un bautizo en Alquería Villa Carmen', width: 1600, height: 1067 },
      ],
    },
    en: {
      label: 'Christening photos at Alqueria Villa Carmen',
      items: [
        { src: `${CDN}/images/eventos/bautizos/16%3A9/bautizo-estanteria-dulces.webp`, alt: 'Sweet shelving display for a christening at Alqueria Villa Carmen, Catarroja', width: 1200, height: 800 },
        { src: `${CDN}/images/eventos/bautizos/9%3A16/bautizo-mesa-dulce.webp`, alt: 'Christening dessert table at Alqueria Villa Carmen', width: 1200, height: 1800 },
        { src: `${CDN}/images/eventos/bautizos/16%3A9/bautizo-salon-arco-floral.webp`, alt: 'Room with floral arch set up for a christening at Alqueria Villa Carmen', width: 1600, height: 1067 },
      ],
    },
  },
  '/eventos-empresa': {
    es: {
      label: 'Fotos de eventos de empresa en Alquería Villa Carmen',
      items: [
        { src: `${CDN}/images/eventos/empresa/9%3A16/evento-empresa-mesa-larga-salon.webp`, alt: 'Mesa larga para una comida de empresa en el salón de Alquería Villa Carmen, Catarroja', width: 1100, height: 2459 },
        { src: `${CDN}/images/eventos/empresa/9%3A16/evento-empresa-mesa-presidencial-chimenea.webp`, alt: 'Mesa presidencial ante la chimenea para un evento de empresa en Alquería Villa Carmen', width: 1200, height: 1600 },
        { src: `${CDN}/images/eventos/empresa/9%3A16/evento-empresa-mesa-grupo.webp`, alt: 'Mesa de grupo montada para un evento de empresa en Alquería Villa Carmen, Catarroja', width: 1200, height: 2133 },
      ],
    },
    en: {
      label: 'Company event photos at Alqueria Villa Carmen',
      items: [
        { src: `${CDN}/images/eventos/empresa/9%3A16/evento-empresa-mesa-larga-salon.webp`, alt: 'Long table for a company lunch in the main room at Alqueria Villa Carmen, Catarroja', width: 1100, height: 2459 },
        { src: `${CDN}/images/eventos/empresa/9%3A16/evento-empresa-mesa-presidencial-chimenea.webp`, alt: 'Top table by the fireplace for a company event at Alqueria Villa Carmen', width: 1200, height: 1600 },
        { src: `${CDN}/images/eventos/empresa/9%3A16/evento-empresa-mesa-grupo.webp`, alt: 'Group table set for a company event at Alqueria Villa Carmen, Catarroja', width: 1200, height: 2133 },
      ],
    },
  },
}

// Rice stills are frames from the owner's own short videos (no still photos of
// rice exist in the reviewed material).
export const riceGallery: Record<Lang, CdnGalleryContent> = {
  es: {
    label: 'Fotos de los arroces de Alquería Villa Carmen',
    items: [
      { src: `${CDN}/images/arroces/9%3A16/arroz-paella-vista-cenital.webp`, alt: 'Paella valenciana vista desde arriba en Alquería Villa Carmen, Catarroja', width: 1200, height: 2133 },
      { src: `${CDN}/images/arroces/9%3A16/arroz-servido-en-mesa.webp`, alt: 'Arroz servido en la mesa en Alquería Villa Carmen', width: 1200, height: 2133 },
      { src: `${CDN}/images/arroces/9%3A16/paella-en-mesa-salon.webp`, alt: 'Paella en la mesa con el salón de Alquería Villa Carmen al fondo', width: 1200, height: 2133 },
    ],
  },
  en: {
    label: 'Rice dishes at Alqueria Villa Carmen',
    items: [
      { src: `${CDN}/images/arroces/9%3A16/arroz-paella-vista-cenital.webp`, alt: 'Valencian paella from above at Alqueria Villa Carmen, Catarroja', width: 1200, height: 2133 },
      { src: `${CDN}/images/arroces/9%3A16/arroz-servido-en-mesa.webp`, alt: 'Rice served at the table at Alqueria Villa Carmen', width: 1200, height: 2133 },
      { src: `${CDN}/images/arroces/9%3A16/paella-en-mesa-salon.webp`, alt: 'Paella on the table with the Alqueria Villa Carmen dining room behind', width: 1200, height: 2133 },
    ],
  },
}

// Kitchen samples shown as house cooking; no claim that a specific dish is on
// the current weekend menu.
export const weekendKitchenGallery: Record<Lang, CdnGalleryContent> = {
  es: {
    label: 'Muestra de la cocina de Alquería Villa Carmen',
    items: [
      { src: `${CDN}/images/comida/16%3A9/cocina-casa-ensalada.webp`, alt: 'Ensalada de la cocina de Alquería Villa Carmen, restaurante en Catarroja', width: 1280, height: 720 },
      { src: `${CDN}/images/comida/16%3A9/cocina-casa-entrante.webp`, alt: 'Entrante emplatado de la cocina de Alquería Villa Carmen', width: 1600, height: 716 },
      { src: `${CDN}/images/comida/16%3A9/cocina-casa-pescado.webp`, alt: 'Plato de pescado de la cocina de Alquería Villa Carmen', width: 1079, height: 773 },
      { src: `${CDN}/images/comida/9%3A16/cocina-casa-postre.webp`, alt: 'Postre de la cocina de Alquería Villa Carmen, Catarroja', width: 1200, height: 2683 },
    ],
  },
  en: {
    label: 'Cooking from the Alqueria Villa Carmen kitchen',
    items: [
      { src: `${CDN}/images/comida/16%3A9/cocina-casa-ensalada.webp`, alt: 'Salad from the Alqueria Villa Carmen kitchen, restaurant in Catarroja', width: 1280, height: 720 },
      { src: `${CDN}/images/comida/16%3A9/cocina-casa-entrante.webp`, alt: 'Plated starter from the Alqueria Villa Carmen kitchen', width: 1600, height: 716 },
      { src: `${CDN}/images/comida/16%3A9/cocina-casa-pescado.webp`, alt: 'Fish dish from the Alqueria Villa Carmen kitchen', width: 1079, height: 773 },
      { src: `${CDN}/images/comida/9%3A16/cocina-casa-postre.webp`, alt: 'Dessert from the Alqueria Villa Carmen kitchen, Catarroja', width: 1200, height: 2683 },
    ],
  },
}

export const WEEKEND_MENU_ID = 42

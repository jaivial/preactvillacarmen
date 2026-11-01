// Coordination id: editorial_lastmod_v1
//
// Ultima revision editorial de cada pagina publica, en formato YYYY-MM-DD.
//
// Es la fuente de la verdad del <lastmod> del sitemap: la imagen de
// produccion hornea el frontend SIN el historico de git, asi que `git log`
// no puede responder ahi y las fechas editoriales se perdian. Con este
// mapa versionado, el mismo commit produce el mismo sitemap en local y en
// produccion.
//
// Si editas el contenido de una pagina, actualiza aqui su fecha en el MISMO
// commit. El mapa solo cubre paginas editoriales; los menus y las paginas
// legales toman su fecha de la base de datos.
export const EDITORIAL_LASTMOD = {
  '/': '2026-10-31',
  '/contacto': '2026-10-29',
  '/arroces-y-paellas': '2026-10-31',
  '/guia-arroces-valencianos': '2026-10-31',
  '/checklist-celebraciones': '2026-10-31',
  '/restaurante-albufera-catarroja': '2026-10-31',
  '/eventos': '2026-10-31',
  '/bodas': '2026-10-31',
  '/comuniones': '2026-10-31',
  '/bautizos': '2026-10-31',
  '/eventos-empresa': '2026-10-31',
  '/menusdegrupos': '2026-10-29',
  '/postres': '2026-10-25',
  '/cafes': '2026-11-01',
  '/bebidas': '2026-10-25',
  '/vinos': '2026-10-25',
}

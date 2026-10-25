# SEO local: línea base y medición mensual

Corte: 25 de octubre de 2026. Dominio canónico: `https://www.alqueriavillacarmen.com`.

## Fuentes y alcance

- Search Console: propiedad `sc-domain:alqueriavillacarmen.com`, acceso `siteOwner`; consultas web con datos finales de 2026-07-01 a 2026-10-22, agrupadas por `QUERY,PAGE,DEVICE`.
- Las cifras siguientes son las filas observadas en las consultas por intención, no una proyección ni una comprobación manual de rankings. Un cero significa que la consulta filtrada no devolvió filas; no demuestra ausencia de demanda.
- Los datos anteriores a este corte sirven como línea base inicial para comparar despliegues con el mismo periodo y estacionalidad. No se atribuye todavía un cambio a este trabajo.
- Search Console mide captación, no reservas. No hay un contenedor de analítica instalado en este repositorio; los eventos quedan preparados con contexto de adquisición, pero falta configurar su destino y validar la recepción antes de publicar cifras de conversión.
- Bing Webmaster Tools y Google Business Profile requieren acceso del negocio y se gestionan en el hito off-site.

## Keyword → URL observada → datos actuales → landing objetivo

CTR y posición son los valores de cada fila keyword/URL/dispositivo, no promedios calculados entre intenciones distintas.

| Intención / keyword real | URL observada | Dispositivo | Clics | Impresiones | CTR | Posición | Landing objetivo |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| cerca de catarroja | `/` | Móvil | 1 | 1 | 100 % | 2,00 | `/` |
| villa carmen restaurante | `/` | Móvil | 11 | 32 | 34,38 % | 1,00 | `/` |
| restaurante villa carmen | `/` | Móvil | 11 | 32 | 34,38 % | 1,00 | `/` |
| arroces / paellas | Sin filas en el filtro `arroz|arroces|paella|paellas` | Todos | 0 observados | 0 observadas | — | — | `/arroces-y-paellas` |
| menú de alqueria villa carmen | `/menu/41/menu-del-dia-41` | Móvil | 1 | 3 | 33,33 % | 2,00 | `/menu/41/menu-del-dia-41` |
| restaurantes con menu fin de semana cerca de mi | `/` | Móvil | 1 | 1 | 100 % | 19,00 | `/menu/42/menu-fin-de-semana-42` |
| menú de alqueria villa carmen | `/menudegrupos.php` | Móvil | 1 | 1 | 100 % | 2,00 | `/menusdegrupos` |
| bodas catarroja | `/` | Escritorio | 0 | 5 | 0 % | 53,20 | `/bodas` |
| bodas catarroja | `/` | Móvil | 0 | 3 | 0 % | 61,33 | `/bodas` |
| bodas catarroja | `/` | Tableta | 0 | 2 | 0 % | 57,50 | `/bodas` |
| restaurante comunion valencia | `/` | Móvil | 0 | 1 | 0 % | 6,00 | `/comuniones` |
| restaurante para comuniones cerca de mi | `/` | Móvil | 0 | 1 | 0 % | 32,00 | `/comuniones` |
| alquería villa carmen | `/contacto` | Móvil | 1 | 200 | 0,50 % | 2,04 | `/contacto` |

Las consultas de marca son útiles para detectar canibalización de URLs, pero no se presentan como crecimiento de captación genérica. Las URLs legacy permanecen en la columna observada porque describen el tráfico histórico real; las redirecciones y canonicals del hito técnico gobiernan las URLs nuevas.

## Conversiones orgánicas separables

El frontend emite `reservation_start`, `reservation_complete`, `phone_click` y `whatsapp_click`. La reserva completada solo se emite tras una respuesta válida; WhatsApp y teléfono son intenciones de contacto, no reservas.

Cada evento incluye `landing_page`, `traffic_source`, `traffic_medium` y `acquisition_channel`. El contexto se captura una vez al cargar la aplicación y se conserva en memoria durante la navegación SPA, sin cookies ni almacenamiento nuevo. Un referente de buscador sin campaña de pago se clasifica como `organic_search`; UTMs explícitas se conservan para no reclamar como SEO tráfico de campañas.

Configuración externa todavía necesaria:

1. Instalar el contenedor conforme al consentimiento aplicable y evitar la doble escucha de `dataLayer`/`gtag`.
2. Registrar los cuatro eventos y las dimensiones de adquisición; validar una sola recepción por acción.
3. Segmentar por **Organic Search**, landing page y dispositivo, y cotejar fuente/medio. No usar `reservation_start`, llamadas o WhatsApp como reservas completadas.

## Panel mensual y comparación de despliegues

Guardar cada mes: fecha, periodo y comparación, clics, impresiones, CTR y posición por keyword/URL/dispositivo; URLs indexadas y exclusiones; conversiones orgánicas por tipo; llamadas y WhatsApp por landing; y cambios publicados. Comparar con el mismo periodo y estacionalidad, nunca solo con rankings puntuales.

La línea base anterior deja constancia de los datos realmente consultados. La exportación cruda exhaustiva y la activación del destino de analítica no se dan por completadas hasta disponer de esas evidencias externas.

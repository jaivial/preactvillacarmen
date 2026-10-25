# Core Web Vitals: medición de laboratorio y seguimiento

Fecha de la comparación: 25 de octubre de 2026. Base: `78ff9e0` (`origin/dev`). Variante posterior: esta rama, sobre la misma base. Las cifras son **una carga de laboratorio por combinación**, no datos de usuarios reales, medianas ni percentiles de CrUX.

## Método reproducible

- Build de producción servido con Vite Preview en local; antes y después usan el mismo navegador Chromium y el CDN real de imágenes.
- Contexto nuevo por carga. Las rutas `/api/**` se sustituyen en ambos casos por la misma respuesta 503 para que la comparación no dependa de un backend local. Esto no es una prueba funcional del backend.
- Móvil: 390 × 844, CPU ×4, latencia 150 ms, descarga 1,6 Mbit/s y subida 750 kbit/s.
- Escritorio: 1440 × 900, CPU ×1, latencia 40 ms, descarga 10 Mbit/s y subida 5 Mbit/s.
- Se observan `largest-contentful-paint`, `layout-shift` y Event Timing desde el inicio; se esperan 8 s tras DOMContentLoaded en móvil y 5 s en escritorio.
- Interacción sintética: abrir el menú cuando el botón está visible y habilitado. Se toma la duración máxima agrupada por `interactionId`; no es el INP de campo. El menú de Eventos está deliberadamente bloqueado durante la introducción, por lo que no se inventa una interacción en esa muestra.
- Las transferencias indicadas por Resource Timing no incluyen de forma fiable los cuerpos de orígenes sin `Timing-Allow-Origin`; no se usan como peso total de página.

## Resultados observados

LCP en milisegundos; CLS sin unidades. Cada celda es **antes → después**.

| Página | Móvil: LCP | Móvil: CLS | Escritorio: LCP | Escritorio: CLS |
| --- | ---: | ---: | ---: | ---: |
| `/` | 952 → 1340 | 0,00087 → 0,00193 | 400 → 360 | 0,00301 → 0,00124 |
| `/eventos` | 2064 → 5568 | 0,00005 → 0,00005 | 3948 → 2788 | 0,72966 → 0,00001 |
| `/menusdegrupos` | 1348 → 1932 | 0,70656 → 0,06128 | 404 → 168 | 0,60423 → 0,05881 |
| `/contacto` | 1212 → 1140 | 0,01312 → 0,01957 | 328 → 1084 | 0,01576 → 0,01418 |

El LCP real identificado varía: el H1 en Portada; la imagen vertical de la introducción/hero en Eventos; el logo en las muestras anteriores de Menús y Contacto; y el nuevo contenido editorial en las muestras posteriores de Menús y Contacto. En Eventos móvil, el temporizador y la aparición del hero siguen retrasando el LCP: **no se presenta esta muestra como una mejora**. Las diferencias de CDN, caché y una sola ejecución impiden atribuir toda la variación de LCP al cambio. La reducción grande y consistente de CLS en Eventos y Menús sí coincide con reservar dimensiones y eliminar animaciones de layout; las cuatro muestras posteriores de CLS quedan por debajo de 0,1.

Cambios relacionados: imágenes no críticas diferidas, dimensiones estables, vídeo de Portada sin precarga cuando no se reproduce, cargador limitado a medios críticos, animación de crecimiento de Eventos mediante `transform`, y Backoffice/Reservas separados del paquete inicial. El JS principal decodificado de la muestra baja de 495.898 a 423.650 bytes (−72.248; −14,6 %); el CSS compartido aumenta al incluir las nuevas landings. En la muestra móvil de Menús, los bytes transferidos observados bajan de 1.133.940 a 328.929 sin retirar el contenido rastreable. La interacción sintética medida queda entre 16 y 40 ms cuando existe; no demuestra un INP p75 de producción.

## Umbrales (percentil 75 de campo)

| Métrica | Bueno | Necesita mejorar | Pobre |
| --- | ---: | ---: | ---: |
| LCP | ≤ 2,5 s | > 2,5 s y ≤ 4 s | > 4 s |
| CLS | ≤ 0,1 | > 0,1 y ≤ 0,25 | > 0,25 |
| INP | ≤ 200 ms | > 200 ms y ≤ 500 ms | > 500 ms |

Estas muestras sirven para localizar regresiones, no para declarar que el sitio supera Core Web Vitals. Para la aceptación de campo, consultar CrUX/PageSpeed Insights o RUM en producción, separado por móvil y escritorio, con el p75 de LCP, CLS e INP durante 28 días. Registrar también la URL, el elemento LCP y la versión desplegada. Si no hay suficiente tráfico, conservar «sin datos» en lugar de sustituirlo por una prueba local.

## Comprobaciones de conservación

- El prerender conserva contenido, enlaces, un H1 y metadatos en las nuevas URLs comerciales; Reservas sigue `noindex,nofollow`.
- Portada, Eventos, Menús de grupos y Contacto no presentan desbordamiento horizontal en las dos viewports medidas.
- Se revisaron capturas de Eventos en móvil y escritorio, incluida la experiencia con `prefers-reduced-motion`: el hero permanece visible y la introducción no deja una capa que lo oculte.
- La medición de interacción no es un sustituto de reservas, llamadas o WhatsApp; la conversión orgánica se documenta aparte en `docs/seo-measurement-baseline.md`.

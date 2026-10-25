# SEO local: línea base y medición mensual

Fecha de corte: 25 de octubre de 2026. Dominio canónico: `https://www.alqueriavillacarmen.com`.

## Estado de las fuentes

- La propiedad correcta es `sc-domain:alqueriavillacarmen.com`, no una propiedad limitada a un subdominio o protocolo. La comprobación inicial devolvió `siteOwner`.
- La exportación final de julio–octubre de 2026 quedó bloqueada por un `HTTP 401` de OAuth de Search Console. No se han inventado cifras ni se presenta una consulta incompleta como línea base.
- No hay un contenedor de analítica configurado en el código anterior. Los eventos nuevos se publican en `dataLayer` y, si existe, mediante `gtag`; hace falta instalar/configurar el contenedor y sus destinos antes de afirmar que hay conversiones medidas.
- Bing Webmaster Tools y Google Business Profile requieren acceso del negocio. Las altas, categorías, reseñas y citaciones se gestionan en el hito off-site; no se marcan como realizadas desde este repositorio.

## Tabla keyword → URL → datos actuales

Completar las columnas de datos con la exportación conjunta `QUERY,PAGE` de Search Console, periodo móvil de tres meses y comparación con los tres meses anteriores. Mantener también segmentos por dispositivo y país; no usar posiciones manuales como único KPI.

| Intención / grupo de keywords | URL de aterrizaje | Clics | Impresiones | CTR | Posición media |
| --- | --- | ---: | ---: | ---: | ---: |
| restaurante en Catarroja / restaurante Catarroja | `/` | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth |
| arroces / paellas en Catarroja | `/` hasta publicar la landing del hito de contenido | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth |
| menú del día Catarroja | `/menu/41/menu-del-dia-41` | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth |
| menú fin de semana Catarroja | `/menu/42/menu-fin-de-semana-42` | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth |
| menús de grupos Catarroja | `/menusdegrupos` | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth |
| bodas / comuniones / eventos Catarroja | `/eventos` | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth |
| contacto / cómo llegar / teléfono | `/contacto` | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth | Pendiente OAuth |

La exportación debe conservar las keywords reales agrupadas bajo estas intenciones y cualquier URL distinta que reciba impresiones. Una keyword sin impresiones no se añade como si tuviera tráfico.

## Conversiones orgánicas separables

El frontend emite `reservation_start`, `reservation_complete`, `phone_click` y `whatsapp_click`. Se disparan al entrar en reservas, tras una respuesta válida de reserva y al pulsar enlaces telefónicos o de WhatsApp respectivamente. Una salida a WhatsApp es intención de contacto, no una reserva confirmada.

Configuración pendiente en el contenedor de analítica:

1. Cargar el contenedor solo conforme a la política de consentimiento aplicable; no duplicar los eventos si el contenedor ya escucha `dataLayer`.
2. Registrar los cuatro eventos como conversiones separadas. No contar `reservation_start` como reserva completada ni atribuir una reserva por el solo clic de teléfono/WhatsApp.
3. En el panel, segmentar por **Sesión: canal predeterminado = Organic Search**. Conservar también fuente/medio, landing page y dispositivo. Search Console mide captación orgánica; la herramienta de analítica mide las acciones posteriores.
4. Validar en el entorno de despliegue que cada evento llega una sola vez antes de usar sus cifras como referencia.

## Panel mensual y comparación de despliegues

Guardar cada mes: fecha de exportación, periodo y comparación, clics, impresiones, CTR y posición por keyword/URL/dispositivo; URLs indexadas y exclusiones; conversiones orgánicas por tipo; llamadas y WhatsApp por landing; y notas de cambios publicados. Comparar cada despliegue con el mismo periodo y estacionalidad, nunca con una comprobación puntual de rankings.

Antes del primer informe con cifras se debe renovar el acceso OAuth a Search Console, exportar los datos y sustituir las celdas pendientes por una tabla generada desde esa exportación.

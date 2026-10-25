# QA técnico de SEO en CI

`seo.yml` bloquea los PR a `dev`/`main` si fallan TypeScript, las pruebas o la auditoría del build. La auditoría se ejecuta **después del prerender real**, sobre los HTML que se publicarán; no sustituye una comprobación del CDN en producción.

## Uso

```bash
cd frontend
npm ci
npm run test:seo       # build cliente + SSR + prerender + auditoría
# Si el build ya existe y no ha cambiado:
npm run check:seo
```

Para comprobar también robots, sitemap, 404 y redirecciones del entorno publicado:

```bash
SEO_VERIFY_ORIGIN=https://www.alqueriavillacarmen.com npm run check:seo
```

La comprobación remota es opcional y no forma parte del gate previo al despliegue. La batería local sí verifica códigos 200/301/404/410 y MIME con el manifiesto de rutas; el servidor de producción debe consumir ese mismo `dist/seo-routes.json`.

## Cobertura y mantenimiento

- Un único title, description, canonical, robots y H1; `html lang` ES/EN y metadatos duplicados entre páginas indexables.
- Contenido principal en el HTML de origen, enlaces internos con destino y JSON-LD parseable.
- hreflang ES/EN/x-default recíproco y URLs presentes en el sitemap; páginas noindex fuera del sitemap y sin JSON-LD público.
- Portada, menús generados desde el catálogo, grupos, eventos/landings, contacto, legales, privadas y 404.
- robots.txt y sitemap.xml con MIME correcto; redirecciones 301 legacy, 404 y 410 reales en el servidor de verificación.

Añade las rutas nuevas a `PUBLIC_ROUTES` y al prerender: la batería descubre sus HTML automáticamente. No rebajes umbrales ni excluyas una página para ocultar un fallo. Un error enumera ruta y contrato incumplido; conserva esa salida en el PR. Los datos de menús/legal se obtienen durante el build mediante `VITE_PRERENDER_API_ORIGIN` (por defecto, producción).

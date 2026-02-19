# Frontend publico (Preact) reglas del proyecto

Scope: todo lo que cuelga de `preactvillacarmen/frontend/`.

## Objetivo
- Maximizar velocidad percibida y real del sitio publico.
- Mantener el fetching/render derivado de backend sin romper contratos.
- Conservar compatibilidad de rutas legacy expuestas al usuario.

## Skills a usar en este scope
- `villacarmen-preact-performance`:
  usar por defecto para cualquier `read/edit/update` en `preactvillacarmen/frontend/`.
- `villacarmen-contract-sync`:
  usar además cuando cambien contratos de endpoints o payloads compartidos con backend/backoffice.
- `villacarmen-smoke-check`:
  usar al final para validar build y flujos criticos tras cambios relevantes.

## Stack
- Preact + TypeScript + Vite (build estatico).
- Router: `wouter-preact`.
- Animacion: `motion` (import desde `motion/react` en componentes).
- Estilos: CSS propio ligero (sin UI kits pesados).

## Arquitectura y rutas
- Entrada: `src/main.tsx` + `src/app.tsx`.
- Rutas cliente y layouts en `src/routes/client/`.
- Rutas backoffice placeholder bajo `/backoffice/*` en `src/routes/backoffice/`.
- Mantener rutas legacy mapeadas cuando ya existan (ej. `/reservas.php`, `/avisolegal.html`).

## Fetching y contratos
- Usar helpers existentes en `src/lib/api.ts` cuando aplique.
- No cambiar shape esperado de respuestas (`success`, `message`, payloads) sin coordinar backend.
- Evitar duplicar logica de normalizacion si ya existe en `src/lib/*`.

## Rendimiento
- Priorizar bundle pequeno y menos trabajo en main thread.
- Imágenes:
  - `loading="lazy"` para contenido no critico.
  - tamanos responsivos cuando proceda.
- Reusar utilidades de carga inicial (`src/lib/bootLoader.ts`) y scroll (`src/lib/anchorScroll.ts`) en lugar de soluciones paralelas.
- Evitar dependencias nuevas si no son estrictamente necesarias.

## CSS y sistema visual
- Tokens/variables en `:root` (paleta, fuentes, espaciados, radios).
- Mantener coherencia con `src/index.css` y estilos existentes.
- Preferir `clamp()`, grid/flex y CSS moderno.
- No introducir CSS global redundante ni resets agresivos.

## Motion y accesibilidad
- Si hay animaciones, respetar `prefers-reduced-motion`.
- Asegurar navegacion por teclado y foco visible en interactivos.
- Icon-only buttons deben tener `aria-label`.
- Evitar efectos visuales que degraden legibilidad o contraste.

## Integracion con backend
- En desarrollo, consumir `/api/*` via proxy de Vite (`VITE_API_PROXY_TARGET`, default `http://localhost:8080`).
- No hardcodear dominios de API en componentes.
- Cualquier cambio de endpoint debe coordinarse con `backend/ENDPOINTS.md`.

## Comandos utiles
- Desarrollo: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`

## Regla de cambios
- Cambios pequenos y focalizados por pagina/componente.
- Si una pagina depende de endpoint legacy, validar que el render final conserva el mismo significado funcional.
- Evitar mover archivos grandes de sitio sin motivo de rendimiento o mantenimiento claro.

## Directriz visual (alineacion cross-proyecto)
- Cuando una UI en Preact use cards/paneles tipo dashboard, priorizar estilo minimal glassmorphism (superficie sutil, blur moderado, bordes suaves) usando tokens en `:root`.
- Mantener el peso visual ligero: evitar efectos pesados que degraden FPS o LCP.
- En `data-theme=\"light\"`, revisar contraste WCAG AA (texto normal >= 4.5:1) antes de cerrar tarea.
- Si un patrón de card/panel se repite en 2+ vistas, extraer componente reutilizable en `src/components/` y evitar duplicar CSS.

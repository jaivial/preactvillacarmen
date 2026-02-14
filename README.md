# preactvillacarmen

Nueva web de Alqueria Villa Carmen enfocada a rendimiento:
- Frontend: Preact (Vite) build estático.
- Backend: Go (sirve estáticos + API JSON).
- DB local: MySQL (dump en `../villacarmen_backup/`).

## Desarrollo (local)

1) Levantar MySQL:
- `cd preactvillacarmen && docker compose up -d`

2) Importar el dump (último):
- Ver `scripts/` (se añadirá script de importación) o importar manualmente con `gzip -dc ... | mysql ...`.

3) Backend Go:
- `cd preactvillacarmen/backend && go run ./cmd/server`

4) Frontend (dev server):
- `cd preactvillacarmen/frontend && npm run dev`


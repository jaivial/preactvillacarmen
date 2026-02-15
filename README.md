# preactvillacarmen

Nueva web de Alqueria Villa Carmen enfocada a rendimiento:
- Frontend: Preact (Vite) build estático.
- Backend: Go (sirve estáticos + API JSON).
- DB local: MySQL (dump en `../villacarmen_backup/`).

## Desarrollo (local)

1) Copiar y ajustar variables:
- `cp .env.example .env`

2) Levantar entorno:
- `cd /home/jaime/projects/newvillacarmen && docker compose --profile staging up -d --build`

3) Importar el dump (último):
- Ver `scripts/` (se añadirá script de importación) o importar manualmente con `gzip -dc ... | mysql ...`.

4) Backend Go:
- `cd /home/jaime/projects/newvillacarmen/backend && go run ./cmd/server`

5) Frontend (dev server):
- `cd preactvillacarmen/frontend && npm run dev`

## Arranque con Docker (stack completo)

- Dev: `cd /home/jaime/projects/newvillacarmen && docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up -d --build`
- Staging: `cd /home/jaime/projects/newvillacarmen && docker compose --profile staging up -d --build`
- Homolog: `cd /home/jaime/projects/newvillacarmen && docker compose --profile homolog up -d --build`
- (alias legacy): `cd /home/jaime/projects/newvillacarmen && docker compose --profile homolg up -d --build`
- Prod: `cd /home/jaime/projects/newvillacarmen && docker compose --profile prod up -d --build`

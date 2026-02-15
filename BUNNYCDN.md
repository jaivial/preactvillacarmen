# BunnyCDN (Villacarmen)

## Pull Zone (CDN p\u00fablico)

- Base URL: `https://villacarmenmedia.b-cdn.net`
- Los assets est\u00e1n organizados por secciones y ratios:
  - `images/<seccion>/{16:9|9:16}/<archivo>`
  - `videos/<seccion>/{16:9|9:16}/<archivo>`

Nota: los dos puntos `:` en rutas como `16:9`/`9:16` deben ir URL-encoded (`16%3A9`). En el frontend usamos `cdnUrl()` que ya lo hace.

## Storage Zone (API)

- Storage zone name: `villacarmen`
- Hostname: `storage.bunnycdn.com`
- Auth: header `AccessKey` con el *storage zone password* (mejor v\u00eda variable de entorno; no guardar credenciales en el repo).

### Listar ficheros (root)

```bash
export BUNNY_STORAGE_ZONE="villacarmen"
export BUNNY_STORAGE_ACCESS_KEY="<STORAGE_ZONE_PASSWORD>"

curl --request GET \
  --url "https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/" \
  --header "AccessKey: ${BUNNY_STORAGE_ACCESS_KEY}"
```

### Listar una carpeta (ejemplo: hero videos)

```bash
curl --request GET \
  --url "https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/videos/herosection/" \
  --header "AccessKey: ${BUNNY_STORAGE_ACCESS_KEY}"
```

## FTP (alternativa)

- Username: `villacarmen`
- Hostname: `storage.bunnycdn.com`
- Connection type: `Passive`
- Port: `21`
- Password: `<STORAGE_ZONE_PASSWORD>`
- Read-only password: `<READ_ONLY_PASSWORD>`

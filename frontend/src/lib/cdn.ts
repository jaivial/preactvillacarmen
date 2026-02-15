const BUNNY_PULL_ZONE = (
  import.meta.env.VITE_BUNNY_PULL_BASE_URL || 'https://villacarmenmedia.b-cdn.net'
).replace(/\/+$/, '')

function encodePath(path: string) {
  const clean = path.replace(/^\/+/, '')
  return clean
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function cdnUrl(path: string) {
  return `${BUNNY_PULL_ZONE}/${encodePath(path)}`
}

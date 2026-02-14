const BUNNY_PULL_ZONE = 'https://villacarmen.b-cdn.net'

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


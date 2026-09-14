// Coordination id: safe_url_schemes_v1
const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * Returns the href only when it is safe to use as a link target: an absolute
 * http(s)/mailto/tel URL, or a relative URL without a scheme. Everything else
 * (javascript:, data:, vbscript:, …) is rejected with null.
 */
export function safeUrl(url?: string | null): string | null {
  const value = (url ?? '').trim()
  if (!value) return null
  // Browsers ignore whitespace and control characters while parsing a URL, so
  // collapse them before deciding which scheme the value carries.
  const compact = value.replace(/[\u0000-\u0020\u007f]+/g, '')
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)
  if (!scheme) return value
  return SAFE_URL_SCHEMES.has(`${scheme[1].toLowerCase()}:`) ? value : null
}

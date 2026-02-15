type SmoothAnchorScrollOptions = {
  durationMs?: number
  // If omitted, we auto-detect header height.
  offsetPx?: number
}

function prefersReducedMotion() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

function headerOffsetPx() {
  const header = document.querySelector('.header')
  if (header instanceof HTMLElement) return header.offsetHeight || 0
  return 0
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function decodeHashId(hash: string) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function resolveAnchorTarget(id: string) {
  if (!id) return null
  const el = document.getElementById(id)
  if (el) return el
  // Legacy: <a name="...">
  const name = (window as any).CSS?.escape ? (window as any).CSS.escape(id) : id.replace(/"/g, '\\"')
  return document.querySelector(`[name="${name}"]`) as HTMLElement | null
}

function animateScrollTo(targetY: number, durationMs: number) {
  const startY = window.scrollY || window.pageYOffset || 0
  const doc = document.documentElement
  const maxY = Math.max(0, (doc.scrollHeight || 0) - (window.innerHeight || 0))
  const to = clamp(targetY, 0, maxY)
  const delta = to - startY

  if (Math.abs(delta) < 1) {
    window.scrollTo(0, to)
    return
  }

  let raf = 0
  let cancelled = false
  const start = performance.now()

  const cleanup = () => {
    window.removeEventListener('wheel', cancel as any)
    window.removeEventListener('touchstart', cancel as any)
    window.removeEventListener('keydown', cancel as any)
  }

  const cancel = () => {
    cancelled = true
    if (raf) window.cancelAnimationFrame(raf)
    cleanup()
  }

  // If the user intervenes, stop the animation immediately.
  window.addEventListener('wheel', cancel, { passive: true })
  window.addEventListener('touchstart', cancel, { passive: true })
  window.addEventListener('keydown', cancel)

  const step = (now: number) => {
    if (cancelled) return
    const t = clamp((now - start) / durationMs, 0, 1)
    const eased = easeInOutSine(t)
    window.scrollTo(0, startY + delta * eased)
    if (t < 1) {
      raf = window.requestAnimationFrame(step)
    } else {
      cleanup()
    }
  }

  raf = window.requestAnimationFrame(step)
}

function scrollToHash(hash: string, options: SmoothAnchorScrollOptions) {
  const id = decodeHashId(hash)
  const target = resolveAnchorTarget(id)
  if (!target) return false

  const offset = typeof options.offsetPx === 'number' ? options.offsetPx : headerOffsetPx()
  const rect = target.getBoundingClientRect()
  const top = (window.scrollY || window.pageYOffset || 0) + rect.top - offset - 10

  if (prefersReducedMotion()) {
    window.scrollTo(0, Math.round(top))
  } else {
    animateScrollTo(Math.round(top), options.durationMs ?? 2000)
  }
  return true
}

export function startSmoothAnchorScroll(options: SmoothAnchorScrollOptions = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented) return
    if (e.button !== 0) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    const target = e.target
    if (!(target instanceof Element)) return

    const a = target.closest('a[href]')
    if (!(a instanceof HTMLAnchorElement)) return
    if ((a.getAttribute('target') || '').toLowerCase() === '_blank') return
    if (a.hasAttribute('download')) return

    // Only same-origin hash navigation.
    if (a.origin !== window.location.origin) return
    if (!a.hash) return
    if (a.pathname !== window.location.pathname) return

    if (!scrollToHash(a.hash, options)) return

    e.preventDefault()
    try {
      window.history.pushState(null, '', a.hash)
    } catch {
      // ignore
    }
  }

  document.addEventListener('click', onClick)

  // If we land on a URL with a hash, animate once after mount.
  if (window.location.hash) {
    window.setTimeout(() => {
      scrollToHash(window.location.hash, options)
    }, 0)
  }
}


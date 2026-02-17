type BootLoaderOptions = {
  overlayId?: string
  barId?: string
  percentId?: string
  rootId?: string
  maxWaitMs?: number
  minShowMs?: number
  completeRampMs?: number
  // By default the loader tracks only media near the viewport (to avoid waiting for
  // below-the-fold content). For landing-like pages (home/eventos) we preload/await
  // all images so the first interaction is smooth.
  trackAllImages?: boolean
}

export const BOOT_LOADER_DONE_EVENT = 'vc:boot:done'
export const BOOT_LOADER_START_EVENT = 'vc:boot:start'

function clamp01(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function isCriticalImage(img: HTMLImageElement) {
  const loading = (img.getAttribute('loading') || '').toLowerCase()
  if (loading === 'lazy') return false
  return true
}

function isCriticalVideo(video: HTMLVideoElement) {
  if (video.preload === 'none' && !video.autoplay) return false
  return true
}

function firstSrcFromSrcset(srcset: string) {
  const first = srcset.split(',')[0]?.trim() || ''
  return first.split(/\s+/)[0] || ''
}

function resolveImageURL(img: HTMLImageElement) {
  const current = (img.currentSrc || '').trim()
  if (current) return current

  // Best-effort <picture> support when currentSrc isn't available yet.
  const parent = img.parentElement
  if (parent && parent.tagName.toLowerCase() === 'picture') {
    const sources = Array.from(parent.querySelectorAll('source'))
    for (const node of sources) {
      const source = node as HTMLSourceElement
      const media = (source.getAttribute('media') || '').trim()
      if (media) {
        try {
          if (!window.matchMedia(media).matches) continue
        } catch {
          // If the media query is invalid, ignore this candidate.
          continue
        }
      }
      const candidate = firstSrcFromSrcset((source.srcset || '').trim())
      if (candidate) return candidate
    }
  }

  return (img.src || '').trim()
}

function isNearViewport(el: Element) {
  if (!(el instanceof HTMLElement)) return false
  if (el.hasAttribute('data-boot-critical')) return true

  const rect = el.getBoundingClientRect()
  if (!Number.isFinite(rect.top) || !Number.isFinite(rect.bottom)) return false
  if (rect.width <= 0 || rect.height <= 0) return false

  const vh = window.innerHeight || document.documentElement.clientHeight || 800
  const vw = window.innerWidth || document.documentElement.clientWidth || 1200
  const marginY = Math.round(vh * 0.35) + 120
  const marginX = 80

  return rect.bottom > -marginY && rect.top < vh + marginY && rect.right > -marginX && rect.left < vw + marginX
}

export function startBootLoader(options: BootLoaderOptions = {}) {
  if (typeof window === 'undefined') return
  if (typeof document === 'undefined') return

  const overlayId = options.overlayId || 'vc-boot'
  const barId = options.barId || 'vc-boot-bar'
  const percentId = options.percentId || 'vc-boot-pct'
  const rootId = options.rootId || 'app'
  const pathname = (window.location?.pathname || '/').toLowerCase()
  const defaultTrackAll = pathname === '/' || pathname === '/index.html' || pathname.startsWith('/eventos')
  const trackAllImages = options.trackAllImages ?? defaultTrackAll

  const maxWaitMs = options.maxWaitMs ?? (trackAllImages ? 45000 : 15000)
  const minShowMs = options.minShowMs ?? 450
  const completeRampMs = options.completeRampMs ?? 2000

  const overlay = document.getElementById(overlayId) as HTMLDivElement | null
  if (!overlay) return

  const bar = document.getElementById(barId) as HTMLDivElement | null
  const percent = document.getElementById(percentId) as HTMLDivElement | null
  const debugPrefix = '[boot-loader]'
  let windowLoaded = document.readyState === 'complete'

  console.log(`${debugPrefix} start`, {
    pathname,
    overlayId,
    rootId,
    trackAllImages,
    maxWaitMs,
    minShowMs,
    completeRampMs,
    readyState: document.readyState,
  })
  window.dispatchEvent(
    new CustomEvent(BOOT_LOADER_START_EVENT, {
      detail: { pathname, ts: Date.now(), trackAllImages },
    })
  )

  const startedAt = performance.now()

  let desired = 0
  let shown = 0
  let raf = 0
  let maxWaitTimer = 0
  let trickleTimer = 0
  let finished = false
  const tracked = new Set<Element>()
  const loaded = new Set<Element>()
  let total = 0
  let done = 0

  const paint = (value: number) => {
    const v = clamp01(value)
    const pctNum = v * 100
    const pctText = pctNum >= 100 ? '100%' : `${(Math.round(pctNum * 10) / 10).toFixed(1)}%`

    if (bar) bar.style.width = `${pctNum}%`
    if (percent) percent.textContent = pctText
    overlay.setAttribute('aria-valuenow', String(Math.round(pctNum)))
  }

  const renderProgress = () => {
    raf = 0
    const diff = desired - shown
    const step = Math.sign(diff) * Math.min(Math.abs(diff), 0.03)
    shown = clamp01(shown + step)
    paint(shown)

    if (Math.abs(desired - shown) > 0.001) raf = window.requestAnimationFrame(renderProgress)
  }

  const setDesired = (value: number) => {
    if (finished) return
    desired = Math.max(desired, clamp01(value))
    if (!raf) raf = window.requestAnimationFrame(renderProgress)
  }

  const finalize = (reason: 'media' | 'load' | 'timeout') => {
    if (finished) return
    finished = true
    console.log(`${debugPrefix} finalize`, {
      reason,
      done,
      total,
      desired: Number(desired.toFixed(3)),
      shown: Number(shown.toFixed(3)),
      windowLoaded,
    })

    if (maxWaitTimer) window.clearTimeout(maxWaitTimer)
    if (trickleTimer) window.clearInterval(trickleTimer)
    if (raf) window.cancelAnimationFrame(raf)
    raf = 0
    void reason

    const elapsed = performance.now() - startedAt
    const delay = Math.max(0, minShowMs - elapsed)

    const run = () => {
      const from = shown
      const start = performance.now()
      const duration = Math.max(300, completeRampMs)

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
        const v = from + (1 - from) * eased
        shown = v
        paint(v)

        if (t < 1) {
          window.requestAnimationFrame(step)
          return
        }

        overlay.dataset.done = '1'
        window.setTimeout(() => {
          overlay.remove()
          window.dispatchEvent(
            new CustomEvent(BOOT_LOADER_DONE_EVENT, {
              detail: { reason, done, total, ts: Date.now() },
            })
          )
          console.log(`${debugPrefix} done event dispatched`, { reason, done, total })
        }, 450)
      }

      window.requestAnimationFrame(step)
    }

    window.setTimeout(run, delay)
  }

  // Fail-safe: never block the site indefinitely on slow/blocked media.
  maxWaitTimer = window.setTimeout(() => finalize('timeout'), maxWaitMs)

  // Keep the percentage moving even when the last resource is slow.
  trickleTimer = window.setInterval(() => {
    if (finished) return
    const cap = 0.96
    if (desired >= cap) return

    let inc = 0.008
    if (desired < 0.2) inc = 0.03
    else if (desired < 0.5) inc = 0.02
    else if (desired < 0.8) inc = 0.012
    else if (desired < 0.9) inc = 0.007
    else inc = 0.004

    const jitter = 0.65 + Math.random() * 0.7
    setDesired(Math.min(cap, desired + inc * jitter))
  }, 260)

  const onWindowLoad = () => {
    windowLoaded = true
    console.log(`${debugPrefix} window load`, { done, total })
    // Don't let window load hide the overlay early if we're still waiting for tracked media.
    if (total === 0 || done >= total) finalize('load')
  }
  if (document.readyState === 'complete') {
    window.setTimeout(onWindowLoad, 0)
  } else {
    window.addEventListener('load', onWindowLoad, { once: true })
  }

  const scanAndTrack = () => {
    if (finished) return

    const root = document.getElementById(rootId)
    if (!root) {
      console.warn(`${debugPrefix} root not found`, { rootId, windowLoaded })
      if (windowLoaded) finalize('media')
      return
    }

    const images = Array.from(root.querySelectorAll('img')).filter((img) =>
      trackAllImages ? true : isCriticalImage(img) && isNearViewport(img)
    )
    const videos = Array.from(root.querySelectorAll('video')).filter(
      (video) => isCriticalVideo(video) && isNearViewport(video)
    )
    const media: Array<HTMLImageElement | HTMLVideoElement> = [...images, ...videos]
    console.log(`${debugPrefix} scan`, {
      images: images.length,
      videos: videos.length,
      tracked: total,
      done,
      windowLoaded,
    })

    if (!media.length && total === 0) {
      if (windowLoaded) finalize('media')
      return
    }

    const mark = (el: Element) => {
      if (finished) return
      if (loaded.has(el)) return
      loaded.add(el)
      done = Math.min(total, done + 1)
      if (total > 0) setDesired(done / total)
      if (done >= total) {
        if (windowLoaded) finalize('media')
        else console.log(`${debugPrefix} media settled, waiting for window load`, { done, total })
      }
    }

    for (const el of media) {
      if (tracked.has(el)) continue
      tracked.add(el)
      total += 1

      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        mark(el)
      }

      if (el instanceof HTMLImageElement) {
        const img = el

        const onLoad = () => {
          if (typeof img.decode === 'function') img.decode().then(settle, settle)
          else settle()
        }

        if (img.complete) {
          onLoad()
          continue
        }

        // For landing-like pages we want all images downloaded even if they live
        // inside offscreen sections that use content-visibility. Preload explicitly.
        if (trackAllImages) {
          const url = resolveImageURL(img)
          if (!url) {
            // Nothing to load; don't block the boot overlay.
            settle()
            continue
          }

          const pre = new Image()
          pre.decoding = 'async'
          pre.src = url

          const onPreload = () => {
            if (typeof pre.decode === 'function') pre.decode().then(settle, settle)
            else settle()
          }

          if (pre.complete) {
            onPreload()
          } else {
            pre.addEventListener('load', onPreload, { once: true })
            pre.addEventListener('error', settle, { once: true })
          }
          continue
        }

        img.addEventListener('load', onLoad, { once: true })
        img.addEventListener('error', settle, { once: true })
        continue
      }

      const video = el as HTMLVideoElement
      if (video.readyState >= 2) {
        settle()
        continue
      }

      video.addEventListener('loadeddata', settle, { once: true })
      video.addEventListener('canplay', settle, { once: true })
      video.addEventListener('error', settle, { once: true })
    }
  }

  // Wait 2 frames for layout, then scan. Do a second scan shortly after to catch late mounts.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scanAndTrack()
      window.setTimeout(() => scanAndTrack(), 650)
    })
  })
}

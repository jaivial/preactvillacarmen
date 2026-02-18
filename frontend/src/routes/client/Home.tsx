import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'wouter-preact'
import { cdnUrl } from '../../lib/cdn'
import { useI18n } from '../../lib/i18n'
import { useMenuVisibility } from '../../lib/menuVisibility'
import { ScrollReveal } from '../../components/ScrollReveal'

const HERO_VIDEO_URLS: Record<'16:9' | '9:16', string[]> = {
  '16:9': [
    'https://villacarmenmedia.b-cdn.net/videos/herosection/16%3A9/herosection16%3A9_1.mp4?v=20260216-220414',
    'https://villacarmenmedia.b-cdn.net/videos/herosection/16%3A9/herosection16%3A9_2.mp4?v=20260216-220414',
    'https://villacarmenmedia.b-cdn.net/videos/herosection/16%3A9/herosection16%3A9_3.mp4?v=20260216-220414',
    'https://villacarmenmedia.b-cdn.net/videos/herosection/16%3A9/herosection16%3A9_4.mp4?v=20260216-220414',
    'https://villacarmenmedia.b-cdn.net/videos/herosection/16%3A9/herosection16%3A9_5.mp4?v=20260216-220415',
  ],
  '9:16': [
    'https://villacarmenmedia.b-cdn.net/videos/herosection/9%3A16/herosection9%3A16_1.mp4?v=20260216-220515',
    'https://villacarmenmedia.b-cdn.net/videos/herosection/9%3A16/herosection9%3A16_2.mp4?v=20260216-220515',
    'https://villacarmenmedia.b-cdn.net/videos/herosection/9%3A16/herosection9%3A16_3.mp4?v=20260216-220516',
    'https://villacarmenmedia.b-cdn.net/videos/herosection/9%3A16/herosection9%3A16_4.mp4?v=20260216-220516',
    'https://villacarmenmedia.b-cdn.net/videos/herosection/9%3A16/herosection9%3A16_5.mp4?v=20260216-220517',
  ],
}
const HERO_VIDEO_COUNT = HERO_VIDEO_URLS['16:9'].length
const HERO_FADE_MS = 1200
const HERO_PRE_TRANSITION_MS = 700

const IO_THRESHOLDS = Array.from({ length: 101 }, (_, i) => i / 100)

type MenuCard = {
  key: string
  titleKey: string
  subtitleKey: string
  href: string
  variant?: 'special'
  image16x9: string
  image9x16: string
}

function clamp01(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function mediaSrc(path: string) {
  return /^https?:\/\//i.test(path) ? path : cdnUrl(path)
}

function heroVideoSrc(index: number, ratio: '16:9' | '9:16') {
  const files = HERO_VIDEO_URLS[ratio]
  return files[index % files.length]
}

function ResponsiveImage(props: {
  alt: string
  src16x9: string
  src9x16: string
  class?: string
}) {
  return (
    <picture>
      <source media="(max-aspect-ratio: 9/16)" srcSet={mediaSrc(props.src9x16)} />
      <img
        src={mediaSrc(props.src16x9)}
        alt={props.alt}
        class={props.class}
        loading="eager"
        decoding="async"
      />
    </picture>
  )
}

function HeroVideoCycle() {
  const reduced = useReducedMotion()
  const video0Ref = useRef<HTMLVideoElement>(null)
  const video1Ref = useRef<HTMLVideoElement>(null)

  const preTransitionScheduledRef = useRef<Record<0 | 1, boolean>>({ 0: false, 1: false })

  const [activeSlot, setActiveSlot] = useState<0 | 1>(0)
  const [slotIndex, setSlotIndex] = useState<[number, number]>(() => [0, 1])
  const [phase, setPhase] = useState<'idle' | 'loading' | 'fading'>('idle')

  const inactiveSlot: 0 | 1 = activeSlot === 0 ? 1 : 0
  const visibleSlot: 0 | 1 = phase === 'fading' ? inactiveSlot : activeSlot

  const startTransition = useCallback(() => {
    if (phase !== 'idle') return

    const nextIndex = (slotIndex[activeSlot] + 1) % HERO_VIDEO_COUNT

    setSlotIndex((prev) => {
      const next: [number, number] = [prev[0], prev[1]]
      next[inactiveSlot] = nextIndex
      return next
    })

    if (reduced) {
      const prevVideo = activeSlot === 0 ? video0Ref.current : video1Ref.current
      if (prevVideo) {
        prevVideo.pause()
        try {
          prevVideo.currentTime = 0
        } catch {
          // ignore
        }
      }
      setActiveSlot(inactiveSlot)
      return
    }

    setPhase('loading')
  }, [phase, slotIndex, activeSlot, inactiveSlot, reduced])

  useEffect(() => {
    const activeVideo = activeSlot === 0 ? video0Ref.current : video1Ref.current
    if (!activeVideo) return

    preTransitionScheduledRef.current[activeSlot] = false

    const onEnded = () => startTransition()
    const onTimeUpdate = () => {
      if (reduced) return
      if (preTransitionScheduledRef.current[activeSlot]) return

      const duration = activeVideo.duration
      if (!Number.isFinite(duration) || duration <= 0) return

      const threshold = Math.max(0, duration - HERO_PRE_TRANSITION_MS / 1000)
      if (activeVideo.currentTime >= threshold) {
        preTransitionScheduledRef.current[activeSlot] = true
        startTransition()
      }
    }

    activeVideo.addEventListener('ended', onEnded)
    activeVideo.addEventListener('timeupdate', onTimeUpdate)

    return () => {
      activeVideo.removeEventListener('ended', onEnded)
      activeVideo.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [activeSlot, startTransition, reduced])

  useEffect(() => {
    if (phase !== 'loading') return

    const nextVideo = inactiveSlot === 0 ? video0Ref.current : video1Ref.current
    if (!nextVideo) return

    let cancelled = false
    const onCanPlay = () => {
      if (cancelled) return
      void nextVideo.play().catch(() => {})
      setPhase('fading')
    }

    nextVideo.addEventListener('canplay', onCanPlay, { once: true })
    try {
      nextVideo.currentTime = 0
    } catch {
      // ignore
    }
    nextVideo.load()
    void nextVideo.play().catch(() => {})

    const fallback = window.setTimeout(() => {
      if (cancelled) return
      setPhase('fading')
    }, 1200)

    return () => {
      cancelled = true
      window.clearTimeout(fallback)
      nextVideo.removeEventListener('canplay', onCanPlay)
    }
  }, [phase, inactiveSlot, slotIndex[0], slotIndex[1]])

  useEffect(() => {
    if (phase !== 'fading') return

    const prevSlot = activeSlot
    const nextSlot = inactiveSlot

    const timeout = window.setTimeout(() => {
      const prevVideo = prevSlot === 0 ? video0Ref.current : video1Ref.current
      if (prevVideo) {
        prevVideo.pause()
        try {
          prevVideo.currentTime = 0
        } catch {
          // ignore
        }
      }

      setActiveSlot(nextSlot)
      setPhase('idle')
    }, HERO_FADE_MS)

    return () => window.clearTimeout(timeout)
  }, [phase, activeSlot, inactiveSlot])

  const renderVideo = (slot: 0 | 1) => {
    const index = slotIndex[slot]
    const ref = slot === 0 ? video0Ref : video1Ref
    const isVisible = slot === visibleSlot
    const zIndex = isVisible ? 1 : 0
    const shouldPlay = slot === activeSlot || (slot === inactiveSlot && phase !== 'idle')

    return (
      <video
        key={`slot${slot}-v${index}`}
        ref={ref}
        class={isVisible ? 'heroVideo on' : 'heroVideo off'}
        style={{ zIndex }}
        autoPlay={shouldPlay}
        muted
        playsInline
        preload={shouldPlay ? 'auto' : 'none'}
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden="true"
      >
        <source src={heroVideoSrc(index, '9:16')} type="video/mp4" media="(max-aspect-ratio: 9/16)" />
        <source src={heroVideoSrc(index, '16:9')} type="video/mp4" />
      </video>
    )
  }

  return (
    <div class="heroVideoStack" aria-hidden="true">
      {renderVideo(0)}
      {renderVideo(1)}
    </div>
  )
}

type ShowcaseItem = {
  no: string
  titleKey: string
  bodyKey: string
  img16x9: string
  img9x16: string
}

function StickyShowcase() {
  const { t } = useI18n()

  const items = useMemo<ShowcaseItem[]>(
    () => [
      {
        no: '01',
        titleKey: 'home.showcase.items.1.title',
        bodyKey: 'home.showcase.items.1.body',
        img16x9: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp',
        img9x16: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp',
      },
      {
        no: '02',
        titleKey: 'home.showcase.items.2.title',
        bodyKey: 'home.showcase.items.2.body',
        img16x9: 'https://villacarmenmedia.b-cdn.net/images/comida/16%3A9/ChatGPT%20Image%2017%20feb%202026%2C%2002_28_19%20%281%29.webp',
        img9x16: 'https://villacarmenmedia.b-cdn.net/images/comida/16%3A9/ChatGPT%20Image%2017%20feb%202026%2C%2002_28_19%20%281%29.webp',
      },
      {
        no: '03',
        titleKey: 'home.showcase.items.3.title',
        bodyKey: 'home.showcase.items.3.body',
        img16x9: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_4.webp',
        img9x16: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_4.webp',
      },
    ],
    []
  )

  return (
    <section class="vc-projects">
      <div class="container">
        <div class="vc-projects-lead">
          <p class="vc-kicker">{t('home.showcase.kicker')}</p>
          <h2 class="vc-h2">{t('home.showcase.title')}</h2>
          <p class="vc-body">{t('home.showcase.subtitle')}</p>
        </div>

        <div class="vc-projects-list" aria-label={t('home.showcase.title')}>
          {items.map((item, idx) => (
            <article class={idx === 1 ? 'vc-project pine' : 'vc-project'}>
              <div class="vc-project-top">
                <div class="vc-project-no">{item.no}</div>
                <div class="vc-project-main">
                  <h3 class="vc-project-title">{t(item.titleKey)}</h3>
                  <p class="vc-project-body">{t(item.bodyKey)}</p>
                </div>
              </div>

              <div class="vc-project-media" aria-hidden="true">
                <div class="vc-project-frame">
                  <ResponsiveImage
                    alt=""
                    src16x9={item.img16x9}
                    src9x16={item.img9x16}
                    class="vc-project-img"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function BentoShowcase() {
  const { t } = useI18n()
  const reduced = useReducedMotion()
  const firstTileRef = useRef<HTMLDivElement>(null)
  const lastTileRef = useRef<HTMLDivElement>(null)
  const [opacity, setOpacity] = useState(() => (reduced ? 1 : 0))

  useEffect(() => {
    if (reduced) {
      setOpacity(1)
      return
    }
    if (typeof window === 'undefined') return
    if (!('IntersectionObserver' in window)) {
      setOpacity(1)
      return
    }

    const first = firstTileRef.current
    const last = lastTileRef.current
    if (!first || !last) return

    const topFactor = { current: 0 }
    const bottomFactor = { current: 1 }
    let raf = 0

    const update = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        setOpacity(Math.min(topFactor.current, bottomFactor.current))
      })
    }

    const rootHeight = (entry?: IntersectionObserverEntry) =>
      entry?.rootBounds?.height || window.innerHeight || document.documentElement.clientHeight || 900

    const rectRatio = (rect: DOMRect, rh: number) => {
      const visible = Math.min(rect.bottom, rh) - Math.max(rect.top, 0)
      if (visible <= 0 || rect.height <= 0) return 0
      return clamp01(visible / rect.height)
    }

    const recalc = () => {
      const rh = window.innerHeight || document.documentElement.clientHeight || 900

      const firstRect = first.getBoundingClientRect()
      const firstRatio = rectRatio(firstRect, rh)
      if (firstRatio > 0) {
        // Fade in as soon as the section becomes visible.
        topFactor.current = 1
      } else {
        topFactor.current = firstRect.top >= rh ? 0 : 1
      }

      const lastRect = last.getBoundingClientRect()
      const lastRatio = rectRatio(lastRect, rh)
      if (lastRatio > 0) {
        bottomFactor.current = lastRect.top < 0 ? clamp01(lastRatio) : 1
      } else {
        bottomFactor.current = lastRect.bottom <= 0 ? 0 : 1
      }

      update()
    }

    const onResize = () => recalc()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const rh = rootHeight(entry)

          if (entry.target === first) {
            if (entry.isIntersecting) {
              // Fade in as soon as the section becomes visible.
              topFactor.current = 1
            } else {
              topFactor.current = entry.boundingClientRect.top >= rh ? 0 : 1
            }
          }

          if (entry.target === last) {
            if (entry.isIntersecting) {
              bottomFactor.current =
                entry.boundingClientRect.top < 0 ? clamp01(entry.intersectionRatio) : 1
            } else {
              bottomFactor.current = entry.boundingClientRect.bottom <= 0 ? 0 : 1
            }
          }
        }

        update()
      },
      {
        threshold: IO_THRESHOLDS,
        // Trigger the fade-in well before the section reaches the viewport.
        rootMargin: '0px 0px 45% 0px',
      }
    )

    observer.observe(first)
    observer.observe(last)

    recalc()
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [reduced])

  const y = reduced ? 0 : Math.round((1 - opacity) * -14)

  return (
    <motion.section
      class="vc-bento"
      style={{ opacity, transform: reduced ? 'none' : `translate3d(0, ${y}px, 0)` }}
      aria-label={t('home.story.title')}
    >
      <div class="container">
        <div class="vc-bentoHead" ref={firstTileRef}>
          <p class="vc-kicker">{t('home.story.kicker')}</p>
          <h2 class="vc-h2">{t('home.story.title')}</h2>
          <p class="vc-body">{t('home.story.body')}</p>
        </div>

        <div class="vc-bentoGrid" aria-hidden="true">
          <div class="vc-bentoTile vc-bentoTile--main">
            <ResponsiveImage
              alt=""
              src16x9="https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_1.webp"
              src9x16="https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_1.webp"
              class="vc-bentoImg"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--tall">
            <img
              src={mediaSrc('https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/saloncondesa1.webp')}
              alt=""
              class="vc-bentoImg"
              loading="eager"
              decoding="async"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--square">
            <img
              src={mediaSrc('https://villacarmenmedia.b-cdn.net/images/comida/9%3A16/croquetas9_16.webp')}
              alt=""
              class="vc-bentoImg"
              loading="eager"
              decoding="async"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--square">
            <img
              src={mediaSrc('images/comida/16:9/arroz16:9_1.png')}
              alt=""
              class="vc-bentoImg"
              loading="eager"
              decoding="async"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--wide">
            <img
              src={mediaSrc('https://villacarmenmedia.b-cdn.net/images/fachada/16%3A9/fachada16-9_1.webp')}
              alt=""
              class="vc-bentoImg"
              loading="eager"
              decoding="async"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--wideAlt" ref={lastTileRef}>
            <img
              src={mediaSrc('https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp')}
              alt=""
              class="vc-bentoImg"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function EventsSection() {
  const { t } = useI18n()
  const reduced = useReducedMotion()
  const images = useMemo(
    () => [
      'https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_1.webp',
      'https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_2.webp',
      'https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_3.webp',
      'https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_4.webp',
      'https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_5.webp',
    ],
    []
  )
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (reduced) return
    if (images.length <= 1) return
    const id = window.setInterval(() => setActive((v) => (v + 1) % images.length), 3000)
    return () => window.clearInterval(id)
  }, [images.length, reduced])

  return (
    <motion.section
      class="vc-events"
      id="bodas-y-eventos"
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
    >
      <div class="container vc-events-grid">
        <div class="vc-events-media" aria-hidden="true">
          <div class="vc-events-slideshow">
            {images.map((path, idx) => (
              <img
                src={mediaSrc(path)}
                alt=""
                class={idx === active ? 'vc-events-shot on' : 'vc-events-shot'}
                loading="eager"
                decoding="async"
              />
            ))}
          </div>
        </div>

        <div class="vc-events-copy">
          <p class="vc-events-kicker">{t('home.events.kicker')}</p>
          <h2 class="vc-events-title">{t('home.events.title')}</h2>
          <p class="vc-events-body">{t('home.events.body')}</p>
          <div class="vc-actions">
            <Link href="/eventos" className="btn">
              {t('home.events.cta.more')}
            </Link>
            <Link href="/reservas" className="btn primary">
              {t('nav.reserve')}
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export function Home() {
  const menuVisibility = useMenuVisibility()
  const { t } = useI18n()

  const menuCards = useMemo<MenuCard[]>(
    () => [
      {
        key: 'menufindesemana',
        titleKey: 'menus.card.weekend.title',
        subtitleKey: 'menus.card.weekend.subtitle',
        href: '/menufindesemana',
        image16x9: 'https://villacarmenmedia.b-cdn.net/images/menus/16%3A9/menu-finde16-9_1.webp',
        image9x16: 'https://villacarmenmedia.b-cdn.net/images/menus/9%3A16/menu-finde9-16_1.webp',
      },
      {
        key: 'menudeldia',
        titleKey: 'menus.card.daily.title',
        subtitleKey: 'menus.card.daily.subtitle',
        href: '/menudeldia',
        image16x9: 'https://villacarmenmedia.b-cdn.net/images/menus/16%3A9/menu-dia16-9_1.webp',
        image9x16: 'https://villacarmenmedia.b-cdn.net/images/menus/9%3A16/menu-dia9-16_1.webp',
      },
      {
        key: 'menusdegrupos',
        titleKey: 'menus.card.groups.title',
        subtitleKey: 'menus.card.groups.subtitle',
        href: '/menusdegrupos',
        image16x9: 'https://villacarmenmedia.b-cdn.net/images/menus/16%3A9/menu-grupos16-9_1.webp',
        image9x16: 'https://villacarmenmedia.b-cdn.net/images/menus/9%3A16/menu-grupos9-16_1.webp',
      },
      {
        key: 'menusanvalentin',
        titleKey: 'menus.card.valentine.title',
        subtitleKey: 'menus.card.valentine.subtitle',
        href: '/menusanvalentin',
        variant: 'special',
        image16x9: 'https://villacarmenmedia.b-cdn.net/images/menus/16%3A9/menu-valentin16-9_1.webp',
        image9x16: 'https://villacarmenmedia.b-cdn.net/images/menus/9%3A16/menu-valentin9-16_1.webp',
      },
    ],
    []
  )

  const filteredCards = menuCards.filter((card) => {
    if (!menuVisibility) return true
    if (card.key === 'menudeldia' && menuVisibility.menudeldia === false) return false
    if (card.key === 'menufindesemana' && menuVisibility.menufindesemana === false) return false
    return true
  })

  // Lightbox state for menu images
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxStartX, setLightboxStartX] = useState(0)

  const menuImages = filteredCards.map((card) => ({
    '16x9': card.image16x9,
    '9x16': card.image9x16,
  }))

  const handleLightboxPrev = () => {
    setLightboxIndex((i) => (i > 0 ? i - 1 : menuImages.length - 1))
  }

  const handleLightboxNext = () => {
    setLightboxIndex((i) => (i < menuImages.length - 1 ? i + 1 : 0))
  }

  const handleDragStart = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      setLightboxStartX(e.touches[0].clientX)
    } else {
      setLightboxStartX(e.clientX)
    }
  }

  const handleDragEnd = (e: MouseEvent | TouchEvent) => {
    let endX: number
    if ('changedTouches' in e) {
      endX = e.changedTouches[0].clientX
    } else {
      endX = e.clientX
    }
    const diff = endX - lightboxStartX
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleLightboxPrev()
      } else {
        handleLightboxNext()
      }
    }
  }

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleLightboxPrev()
      else if (e.key === 'ArrowRight') handleLightboxNext()
      else if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen])

  return (
    <div class="home">
      <section class="brandLnd__head" data-header="keep">
        <HeroVideoCycle />
        <div class="fade" aria-hidden="true" />

        <div class="main">
          <div class="heroWordmark">
            <div class="subTitle">{t('home.hero.tagline')}</div>
            <h1 class="title">{t('home.hero.title')}</h1>
          </div>
          <div class="callAction">
            <a href="#menus" class="link link--center">
              {t('nav.menus')}
            </a>
            <Link href="/reservas" className="link link--center reservaBttn">
              {t('nav.reserve')}
            </Link>
          </div>
        </div>

        <a class="go" href="#landing">
          {t('home.hero.scroll')}
        </a>
      </section>

      <section class="vkit__titleSection" id="landing">
        <div class="container">
          <div class="subTitle">{t('home.intro.kicker')}</div>
          <h2 class="title">{t('home.intro.title')}</h2>
          <p class="description">{t('home.intro.description')}</p>
        </div>
      </section>

      <ScrollReveal
        initialSize={40}
        maxSizePercent={90}
        height="130vh"
        borderRadius="1rem"
      />

      <StickyShowcase />

      <BentoShowcase />

      <EventsSection />

      <section class="vc-menus" id="menus">
        <div class="container">
          <div class="section-head">
            <h2 class="section-title">{t('home.menus.title')}</h2>
            <p class="section-subtitle">{t('home.menus.subtitle')}</p>
          </div>

          <div class="vc-menuCards">
            {filteredCards.map((card, idx) => (
              <div class={card.variant === 'special' ? 'vc-menuCard special' : 'vc-menuCard'}>
                <div
                  class="vc-menuCard-media"
                  onClick={() => {
                    setLightboxIndex(idx)
                    setLightboxOpen(true)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setLightboxIndex(idx)
                      setLightboxOpen(true)
                    }
                  }}
                  aria-label={`Ver imagen de ${t(card.titleKey)}`}
                >
                  <ResponsiveImage
                    alt={t(card.titleKey)}
                    src16x9={card.image16x9}
                    src9x16={card.image9x16}
                    class="vc-menuCard-img"
                  />
                  <div class="vc-menuCard-mediaOverlay">
                    <span class="vc-menuCard-zoomIcon" aria-hidden="true">+</span>
                  </div>
                </div>
                <div class="vc-menuCard-top">
                  <h3 class="vc-menuCard-title">{t(card.titleKey)}</h3>
                  <p class="vc-menuCard-sub">{t(card.subtitleKey)}</p>
                </div>
                <Link
                  href={card.href}
                  className="vc-menuCard-cta btn"
                >
                  {t('menus.preview.view')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {lightboxOpen && (
        <div
          class="vc-menuLightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Galería de menús"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false)
          }}
        >
          <button
            type="button"
            class="vc-menuLightboxClose"
            aria-label="Cerrar"
            onClick={() => setLightboxOpen(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            class="vc-menuLightboxNav vc-menuLightboxPrev"
            aria-label="Imagen anterior"
            onClick={(e) => {
              e.stopPropagation()
              handleLightboxPrev()
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div
            class="vc-menuLightboxContent"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
          >
            <ResponsiveImage
              alt={`Menú ${lightboxIndex + 1} de ${menuImages.length}`}
              src16x9={menuImages[lightboxIndex]['16x9']}
              src9x16={menuImages[lightboxIndex]['9x16']}
              class="vc-menuLightboxImg"
            />
          </div>

          <button
            type="button"
            class="vc-menuLightboxNav vc-menuLightboxNext"
            aria-label="Siguiente imagen"
            onClick={(e) => {
              e.stopPropagation()
              handleLightboxNext()
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div class="vc-menuLightboxCounter">
            {lightboxIndex + 1} / {menuImages.length}
          </div>
        </div>
      )}

      <section class="vc-cta">
        <div class="container vc-cta-inner">
          <h2 class="vc-cta-title">{t('home.cta.title')}</h2>
          <p class="vc-cta-body">{t('home.cta.body')}</p>
          <Link href="/reservas" className="btn primary">
            {t('nav.reserve')}
          </Link>
        </div>
      </section>
    </div>
  )
}

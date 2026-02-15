import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { Link } from 'wouter-preact'
import { apiGetJson } from '../../lib/api'
import { cdnUrl } from '../../lib/cdn'
import { useI18n } from '../../lib/i18n'
import { useMenuVisibility } from '../../lib/menuVisibility'
import type { MenuResponse } from '../../lib/types'

const HERO_VIDEO_FILES = {
  '16:9': ['herosection16:9_1.mp4', 'herosection16:9_2.mp4', 'herosection16:9_3.mp4', 'herosection16:9_4.mp4', 'herosection16:9_5.mp4'],
  '9:16': ['herosection9:16_1.mp4', 'herosection9:16_2.mp4', 'herosection9:16_3.mp4', 'herosection9:16_4.mp4', 'herosection9:16_5.mp4'],
}
const HERO_VIDEO_COUNT = HERO_VIDEO_FILES['16:9'].length
const HERO_FADE_MS = 1200
const HERO_PRE_TRANSITION_MS = 700

const IO_THRESHOLDS = Array.from({ length: 101 }, (_, i) => i / 100)

type MenuCard = {
  key: string
  titleKey: string
  subtitleKey: string
  href: string
  variant?: 'special'
}

function clamp01(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function heroVideoSrc(index: number, ratio: '16:9' | '9:16') {
  const n = index
  const files = HERO_VIDEO_FILES[ratio]
  return cdnUrl(`videos/herosection/${ratio}/${files[n % files.length]}`)
}

function ResponsiveImage(props: {
  alt: string
  src16x9: string
  src9x16: string
  class?: string
}) {
  return (
    <picture>
      <source media="(max-aspect-ratio: 9/16)" srcSet={cdnUrl(props.src9x16)} />
      <img
        src={cdnUrl(props.src16x9)}
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

function ScrollFxAlqueria() {
  const { t } = useI18n()
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const openStart = 0.2
  const openEnd = 0.55
  const holdEnd = 0.92

  const maskScaleX = useTransform(
    scrollYProgress,
    [0, openStart, openEnd, holdEnd, 1],
    reduced ? [1, 1, 1, 1, 1] : [0.52056, 0.52056, 1, 1, 1]
  )
  const maskScaleY = useTransform(
    scrollYProgress,
    [0, openStart, openEnd, holdEnd, 1],
    reduced ? [1, 1, 1, 1, 1] : [0.52056, 0.52056, 1.1, 1.1, 1.1]
  )
  const maskRadius = useTransform(
    scrollYProgress,
    [0, openStart, openEnd, holdEnd, 1],
    reduced ? [24, 24, 24, 24, 24] : [999, 999, 42, 42, 26]
  )
  const imgY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-10, 10])
  const contentScaleX = useTransform(maskScaleX, (v) => (v ? 1 / v : 1))
  const contentScaleY = useTransform(maskScaleY, (v) => (v ? 1 / v : 1))

  const sidesEnd = openStart + 0.12
  const leftX = useTransform(scrollYProgress, [0, sidesEnd], reduced ? [0, 0] : [-80, 0])
  const rightX = useTransform(scrollYProgress, [0, sidesEnd], reduced ? [0, 0] : [80, 0])

  return (
    <section class="scrollFx" ref={sectionRef}>
      <div class="scrollFx__sticky">
        <div class="scrollFx__sides">
          <motion.div style={{ x: leftX }}>{t('home.scrollfx.line1')}</motion.div>
          <motion.div style={{ x: rightX }}>{t('home.scrollfx.line2')}</motion.div>
        </div>
        <div class="scrollFx__sides scrollFx__sides--bottom">
          <motion.div style={{ x: leftX }}>{t('home.scrollfx.line3')}</motion.div>
          <motion.div style={{ x: rightX }}>{t('home.scrollfx.line4')}</motion.div>
        </div>

        <motion.div
          class="scrollFx__mask"
          style={{ scaleX: maskScaleX, scaleY: maskScaleY, borderRadius: maskRadius }}
        >
          <motion.div class="scrollFx__content" style={{ scaleX: contentScaleX, scaleY: contentScaleY }}>
            <motion.div class="scrollFx__photo" style={{ y: imgY }}>
              <ResponsiveImage
                alt=""
                src16x9="images/salones/16:9/IMG_0073.jpg"
                src9x16="images/salones/9:16/IMG_0137.jpg"
                class="scrollFx__img"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
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
        img16x9: 'images/comida/16:9/arroz16:9_1.png',
        img9x16: 'images/comida/16:9/arroz16:9_1.png',
      },
      {
        no: '02',
        titleKey: 'home.showcase.items.2.title',
        bodyKey: 'home.showcase.items.2.body',
        img16x9: 'images/comida/16:9/comida16:9_3.png',
        img9x16: 'images/comida/16:9/comida16:9_3.png',
      },
      {
        no: '03',
        titleKey: 'home.showcase.items.3.title',
        bodyKey: 'home.showcase.items.3.body',
        img16x9: 'images/salones/16:9/IMG_0080.jpg',
        img9x16: 'images/salones/16:9/IMG_0080.jpg',
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
              src16x9="images/salones/16:9/IMG_0073.jpg"
              src9x16="images/salones/9:16/IMG_0137.jpg"
              class="vc-bentoImg"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--tall">
            <img
              src={cdnUrl('images/salones/16:9/IMG_0076.jpg')}
              alt=""
              class="vc-bentoImg"
              loading="eager"
              decoding="async"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--square">
            <img
              src={cdnUrl('images/comida/16:9/croquetas16:9.jpeg')}
              alt=""
              class="vc-bentoImg"
              loading="eager"
              decoding="async"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--square">
            <img
              src={cdnUrl('images/comida/16:9/arroz16:9_1.png')}
              alt=""
              class="vc-bentoImg"
              loading="eager"
              decoding="async"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--wide">
            <img
              src={cdnUrl('images/comida/16:9/comida16:9_3.png')}
              alt=""
              class="vc-bentoImg"
              loading="eager"
              decoding="async"
            />
          </div>

          <div class="vc-bentoTile vc-bentoTile--wideAlt" ref={lastTileRef}>
            <img
              src={cdnUrl('images/salones/16:9/IMG_0080.jpg')}
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
      'images/eventos/bodas/16:9/boda16:9_1.jpg',
      'images/eventos/bodas/16:9/boda16:9_2.jpg',
      'images/eventos/bodas/16:9/boda16:9_3.jpg',
      'images/eventos/bodas/16:9/boda16:9_4.jpg',
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
                src={cdnUrl(path)}
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
            <Link href="/menusdegrupos" className="btn">
              {t('home.events.cta.groups')}
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

  const [dia, setDia] = useState<MenuResponse | null | undefined>(undefined)
  const [finde, setFinde] = useState<MenuResponse | null | undefined>(undefined)

  const showDia = menuVisibility?.menudeldia !== false
  const showFinde = menuVisibility?.menufindesemana !== false

  useEffect(() => {
    let cancelled = false

    if (showDia) {
      apiGetJson<MenuResponse>('/api/menus/dia')
        .then((data) => {
          if (cancelled) return
          setDia(data)
        })
        .catch(() => {
          if (cancelled) return
          setDia(null)
        })
    }

    if (showFinde) {
      apiGetJson<MenuResponse>('/api/menus/finde')
        .then((data) => {
          if (cancelled) return
          setFinde(data)
        })
        .catch(() => {
          if (cancelled) return
          setFinde(null)
        })
    }

    return () => {
      cancelled = true
    }
  }, [showDia, showFinde])

  const menuCards = useMemo<MenuCard[]>(
    () => [
      {
        key: 'menufindesemana',
        titleKey: 'menus.card.weekend.title',
        subtitleKey: 'menus.card.weekend.subtitle',
        href: '/menufindesemana',
      },
      {
        key: 'menudeldia',
        titleKey: 'menus.card.daily.title',
        subtitleKey: 'menus.card.daily.subtitle',
        href: '/menudeldia',
      },
      {
        key: 'menusdegrupos',
        titleKey: 'menus.card.groups.title',
        subtitleKey: 'menus.card.groups.subtitle',
        href: '/menusdegrupos',
      },
      {
        key: 'menusanvalentin',
        titleKey: 'menus.card.valentine.title',
        subtitleKey: 'menus.card.valentine.subtitle',
        href: '/menusanvalentin',
        variant: 'special',
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

      <ScrollFxAlqueria />

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
            {filteredCards.map((card) => (
              <div class={card.variant === 'special' ? 'vc-menuCard special' : 'vc-menuCard'}>
                <div class="vc-menuCard-top">
                  <h3 class="vc-menuCard-title">{t(card.titleKey)}</h3>
                  <p class="vc-menuCard-sub">{t(card.subtitleKey)}</p>
                  <p class="vc-menuCard-meta">
                    {card.key === 'menufindesemana' && showFinde ? (
                      finde?.precio ? (
                        `${t('home.menus.from')} ${finde.precio} €`
                      ) : finde === undefined ? (
                        t('home.menus.loadingPrice')
                      ) : null
                    ) : card.key === 'menudeldia' && showDia ? (
                      dia?.precio ? (
                        `${t('home.menus.from')} ${dia.precio} €`
                      ) : dia === undefined ? (
                        t('home.menus.loadingPrice')
                      ) : null
                    ) : null}
                  </p>
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

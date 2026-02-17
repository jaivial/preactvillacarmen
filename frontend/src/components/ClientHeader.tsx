import { Link, useLocation } from 'wouter-preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import type { MenuVisibility } from '../lib/types'
import { useI18n } from '../lib/i18n'
import { cdnUrl } from '../lib/cdn'
import { MenuPickWidget } from './MenuPickWidget'

type NavItem = {
  href: string
  labelKey: string
  visibilityKey?: string
}

export function ClientHeader(props: { menuVisibility: MenuVisibility | null }) {
  const [location] = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menusOpen, setMenusOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const { lang, setLang, t } = useI18n()

  const isHome = location === '/'
  const isEventosPage = location.startsWith('/eventos')
  const allowTransparentHeader = isHome || isEventosPage
  const solidHeader = !allowTransparentHeader || scrolled
  const showMenuPick = location.startsWith('/menudeldia') || location.startsWith('/menufindesemana')
  const showHeaderActions = !isEventosPage
  const logoSrc = cdnUrl('images/icons/logoblancopng.PNG')
  const logoClass = isEventosPage ? 'brand-logo brand-logo--dark' : 'brand-logo'

  useEffect(() => {
    if (!mobileOpen) setMenusOpen(false)
  }, [mobileOpen])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    if (mobileOpen) {
      nav.removeAttribute('inert')
    } else {
      nav.setAttribute('inert', '')
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) {
      const nav = navRef.current
      const active = document.activeElement
      if (nav && active && nav.contains(active)) {
        menuButtonRef.current?.focus({ preventScroll: true })
      }
    }
  }, [mobileOpen])

  useEffect(() => {
    setMobileOpen(false)
  }, [location])

  useEffect(() => {
    const cls = 'vc-overflow-hidden'
    document.body.classList.toggle(cls, mobileOpen)
    return () => document.body.classList.remove(cls)
  }, [mobileOpen])

  useEffect(() => {
    let raf = 0
    const eventsHeroUnlockThreshold = () => {
      const hero = document.querySelector<HTMLElement>('.evrHero')
      if (!hero) return window.innerHeight * 0.9
      const top = hero.getBoundingClientRect().top + window.scrollY
      return top + hero.offsetHeight * 0.9
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        if (isEventosPage) {
          const unlocked = window.scrollY >= eventsHeroUnlockThreshold()
          setScrolled(unlocked)
          if (!unlocked) setMobileOpen(false)
          return
        }
        setScrolled(window.scrollY > 12)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    window.addEventListener('load', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('load', onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [isEventosPage])

  const eventosHeaderUnlocked = !isEventosPage || scrolled

  const items = useMemo<NavItem[]>(
    () => [
      { href: '/', labelKey: 'nav.home' },
      { href: '/vinos', labelKey: 'nav.wines' },
      { href: '/reservas', labelKey: 'nav.reservations' },
      { href: '/regala', labelKey: 'nav.gift' },
      { href: '/contacto', labelKey: 'nav.contact' },
    ],
    []
  )

  const menuItems = useMemo<NavItem[]>(
    () => [
      { href: '/menufindesemana', labelKey: 'nav.weekendMenu', visibilityKey: 'menufindesemana' },
      { href: '/menudeldia', labelKey: 'nav.dailyMenu', visibilityKey: 'menudeldia' },
      { href: '/menusanvalentin', labelKey: 'nav.valentine', visibilityKey: 'menusanvalentin' },
      { href: '/menusdegrupos', labelKey: 'nav.groupMenus' },
      { href: '/postres', labelKey: 'nav.desserts' },
    ],
    []
  )

  const isMenuSectionActive = menuItems.some((item) => location.startsWith(item.href))

  useEffect(() => {
    if (mobileOpen) setMenusOpen(isMenuSectionActive)
  }, [isMenuSectionActive, mobileOpen])

  const visibleItems = items.filter((item) => {
    if (!item.visibilityKey) return true
    if (!props.menuVisibility) return true
    return props.menuVisibility[item.visibilityKey] !== false
  })

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.visibilityKey) return true
    if (!props.menuVisibility) return true
    return props.menuVisibility[item.visibilityKey] !== false
  })

  const mobileNav = (
    <nav
      ref={navRef}
      class={mobileOpen ? 'navMenuBurger open' : 'navMenuBurger'}
      aria-hidden={!mobileOpen}
    >
      <div class="navMenuBurger__backdrop" onClick={() => setMobileOpen(false)} />
      <div class="container navMenuBurger__panel" onClick={(e) => e.stopPropagation()}>
        <ul class="navMenuBurger__links" aria-label="Principal">
          {visibleItems.map((item) => {
            if (item.href !== '/') return null
            const isActive = location === '/'
            return (
              <li>
                <Link
                  href={item.href}
                  className={isActive ? 'navBurgerLink active' : 'navBurgerLink'}
                  onClick={() => setMobileOpen(false)}
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            )
          })}

          <li class="navBurgerAccordion">
            <button
              type="button"
              class={isMenuSectionActive ? 'navBurgerLink navBurgerAccordionBtn active' : 'navBurgerLink navBurgerAccordionBtn'}
              aria-expanded={menusOpen}
              aria-controls="nav-burger-menus"
              onClick={() => setMenusOpen((v) => !v)}
            >
              <span>{t('nav.menusSection')}</span>
              <span class={menusOpen ? 'navBurgerChevron open' : 'navBurgerChevron'} aria-hidden="true" />
            </button>

            <div
              id="nav-burger-menus"
              class="navBurgerAccordionPanel"
              hidden={!menusOpen}
              role="group"
              aria-label={t('nav.menusSection')}
            >
              <ul class="navBurgerSubLinks" aria-label={t('nav.menusSection')}>
                {visibleMenuItems.map((item) => {
                  const isActive = location.startsWith(item.href)
                  return (
                    <li>
                      <Link
                        href={item.href}
                        className={isActive ? 'navBurgerLink navBurgerSubLink active' : 'navBurgerLink navBurgerSubLink'}
                        onClick={() => setMobileOpen(false)}
                      >
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </li>

          {visibleItems.map((item) => {
            if (item.href === '/') return null
            const isActive = location.startsWith(item.href)
            return (
              <li>
                <Link
                  href={item.href}
                  className={isActive ? 'navBurgerLink active' : 'navBurgerLink'}
                  onClick={() => setMobileOpen(false)}
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            )
          })}

          <li>
            <Link
              href="/eventos"
              className={isEventosPage ? 'navBurgerLink active' : 'navBurgerLink'}
              onClick={() => setMobileOpen(false)}
            >
              {t('nav.weddingsEvents')}
            </Link>
          </li>
        </ul>

        <div class="navMenuBurger__bottom">
          <span class="navMenuBurger__langLabel">{t('nav.lang')}</span>
          <div class="navMenuBurger__lang">
            <button
              type="button"
              class={lang === 'es' ? 'langBtn active' : 'langBtn'}
              onClick={() => setLang('es')}
            >
              ES
            </button>
            <span class="langSep">/</span>
            <button
              type="button"
              class={lang === 'en' ? 'langBtn active' : 'langBtn'}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </nav>
  )

  return (
    <>
      <header class="header" data-solid={solidHeader ? '1' : '0'}>
        <div class="container header-bar">
          <button
            type="button"
            ref={menuButtonRef}
            class={[
              mobileOpen ? 'header__menuBurger open' : 'header__menuBurger',
              !eventosHeaderUnlocked ? 'header__menuBurger--hidden' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            disabled={!eventosHeaderUnlocked}
            tabIndex={eventosHeaderUnlocked ? 0 : -1}
            onClick={() => {
              if (!eventosHeaderUnlocked) return
              setMobileOpen((v) => !v)
            }}
          >
            <i />
            <i />
            <i />
          </button>

          <div class="header__logo">
            <Link href="/" className="brand" aria-label={t('home.hero.title')}>
              <img
                class={logoClass}
                src={logoSrc}
                alt={t('home.hero.title')}
                decoding="async"
                loading="eager"
              />
            </Link>
          </div>

          <div class="header__tools">
            {showHeaderActions ? (
              <div class="header__callAction">
                <a href={isHome ? '#menus' : '/#menus'} class="link link--center">
                  {t('nav.menus')}
                </a>
                <Link href="/reservas" className="link link--center reservaBttn">
                  {t('nav.reserve')}
                </Link>
              </div>
            ) : null}
            {showMenuPick ? <MenuPickWidget /> : null}
          </div>
        </div>
      </header>

      {typeof document === 'undefined' ? mobileNav : createPortal(mobileNav, document.body)}
    </>
  )
}

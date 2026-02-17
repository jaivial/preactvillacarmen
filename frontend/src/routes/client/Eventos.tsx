import { Link } from "wouter-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { BOOT_LOADER_DONE_EVENT } from "../../lib/bootLoader.ts";
import { cdnUrl } from "../../lib/cdn";
import { useI18n } from "../../lib/i18n";
import "./Eventos.css";

type PortfolioCard = {
  image: string;
  titleKey: string;
  metaKey: string;
};

type GalleryTile = {
  image: string;
  className: string;
};

const EVENTS_HERO_16X9 =
  "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_1.webp";
const EVENTS_HERO_9X16 =
  "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/9%3A16/boda9-16_4.webp";
const INTRO_BURST_IMAGES = [
  "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/9%3A16/boda9-16_1.webp",
  "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/9%3A16/boda9-16_2.webp",
  "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/9%3A16/boda9-16_3.webp",
  "https://villacarmenmedia.b-cdn.net/images/eventos/eventos/9%3A16/ChatGPT%20Image%2017%20feb%202026%2C%2002_09_12.webp",
  EVENTS_HERO_9X16,
];

const PORTFOLIO_CARDS: PortfolioCard[] = [
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/eventos/9%3A16/ChatGPT%20Image%2017%20feb%202026%2C%2002_09_12.webp",
    titleKey: "events.portfolio.card1.title",
    metaKey: "events.portfolio.card1.meta",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/eventos/9%3A16/eventos16-9-catering.webp",
    titleKey: "events.portfolio.card2.title",
    metaKey: "events.portfolio.card2.meta",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_5.webp",
    titleKey: "events.portfolio.card3.title",
    metaKey: "events.portfolio.card3.meta",
  },
];

const GALLERY: GalleryTile[] = [
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_2.webp",
    className: "evrTile--a",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/9%3A16/boda9-16_3.webp",
    className: "evrTile--b",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/9%3A16/boda9-16_2.webp",
    className: "evrTile--c",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/bodas/9%3A16/boda9-16_4.webp",
    className: "evrTile--d",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/salones/9%3A16/salones9-16_1.webp",
    className: "evrTile--e",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/eventos/16%3A9/eventos9-16_2.webp",
    className: "evrTile--f",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/salones/9%3A16/salones9-16_4.webp",
    className: "evrTile--g",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/eventos/16%3A9/eventos9-16_7.webp",
    className: "evrTile--h",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/eventos/16%3A9/eventos9-16_8.webp",
    className: "evrTile--i",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/eventos/16%3A9/eventos9-16_6.webp",
    className: "evrTile--j",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/eventos/16%3A9/eventos9-16_5.webp",
    className: "evrTile--k",
  },
  {
    image:
      "https://villacarmenmedia.b-cdn.net/images/eventos/eventos/16%3A9/eventos9-16_4.webp",
    className: "evrTile--l",
  },
];

// All images for the lightbox slider (portfolio + gallery + hero)
const ALL_IMAGES = [
  EVENTS_HERO_16X9,
  EVENTS_HERO_9X16,
  ...PORTFOLIO_CARDS.map((c) => c.image),
  ...GALLERY.map((g) => g.image),
];

function mediaSrc(path: string) {
  return /^https?:\/\//i.test(path) ? path : cdnUrl(path);
}

export function Eventos() {
  const { t } = useI18n();
  const [introDone, setIntroDone] = useState(false);
  const [growStarted, setGrowStarted] = useState(false);
  const [burstIndex, setBurstIndex] = useState(-1);
  const [introRun, setIntroRun] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const fallbackTimerRef = useRef<number | null>(null);
  const growFinishTimerRef = useRef<number | null>(null);
  const introCompletedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const finishIntro = (reason: string) => {
    if (introCompletedRef.current) return;
    introCompletedRef.current = true;
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (growFinishTimerRef.current) {
      window.clearTimeout(growFinishTimerRef.current);
      growFinishTimerRef.current = null;
    }
    console.log("[eventos-intro] introDone", { reason });
    setIntroDone(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const debugPrefix = "[eventos-intro]";
    const STEP_MS = 220;
    const FIRST_FRAME_DELAY_MS = 0;
    const GROW_DELAY_MS = 0;
    const GROW_ANIMATION_MS = 1050;
    const PRELOAD_GATE_MS = 650;
    introCompletedRef.current = false;
    console.log(`${debugPrefix} mount`, {
      href: window.location.href,
      ts: Date.now(),
      readyState: document.readyState,
    });

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      console.log(`${debugPrefix} reduced-motion detected -> skipping intro`);
      setGrowStarted(true);
      finishIntro("reduced-motion");
      return;
    }

    let idx = 0;
    let growDelayTimer = 0;
    let frameTimer = 0;
    let preloadGateTimer = 0;
    let sequenceStarted = false;
    let introStarted = false;
    let isActive = true;
    let preloaders: HTMLImageElement[] = [];
    let domReady = document.readyState === "complete";
    let bootReady = false;
    let loadHandler: (() => void) | null = null;
    let bootDoneHandler: ((event: Event) => void) | null = null;

    const scheduleGrowFinishFallback = () => {
      if (!isActive || introCompletedRef.current) return;
      if (growFinishTimerRef.current)
        window.clearTimeout(growFinishTimerRef.current);
      growFinishTimerRef.current = window.setTimeout(() => {
        if (!isActive || introCompletedRef.current) return;
        console.warn(`${debugPrefix} grow timeout -> forcing introDone`);
        finishIntro("grow-timeout");
      }, GROW_ANIMATION_MS + 450);
    };

    const runFrame = () => {
      if (!isActive || introCompletedRef.current) return;
      if (idx >= INTRO_BURST_IMAGES.length) {
        console.log(`${debugPrefix} burst completed -> grow starts soon`, {
          idx,
        });
        const triggerGrow = () => {
          if (!isActive || introCompletedRef.current) return;
          console.log(`${debugPrefix} grow trigger`);
          setGrowStarted(true);
          scheduleGrowFinishFallback();
        };
        if (GROW_DELAY_MS <= 0) {
          triggerGrow();
        } else {
          growDelayTimer = window.setTimeout(triggerGrow, GROW_DELAY_MS);
        }
        return;
      }
      console.log(`${debugPrefix} burst frame`, {
        idx,
        src: INTRO_BURST_IMAGES[idx],
      });
      setBurstIndex(idx);
      idx += 1;
      frameTimer = window.setTimeout(runFrame, STEP_MS);
    };

    const startSequence = (
      startReason: "preload-settled" | "preload-gate-timeout",
    ) => {
      if (!isActive || introCompletedRef.current || sequenceStarted) return;
      sequenceStarted = true;
      console.log(`${debugPrefix} sequence start`, {
        startReason,
        stepMs: STEP_MS,
        firstFrameDelayMs: FIRST_FRAME_DELAY_MS,
        totalFrames: INTRO_BURST_IMAGES.length,
        introRun: introRun + 1,
      });
      frameTimer = window.setTimeout(runFrame, FIRST_FRAME_DELAY_MS);
    };

    const startIntro = (gateReason: string) => {
      if (!isActive || introCompletedRef.current || introStarted) return;
      introStarted = true;
      console.log(`${debugPrefix} prerequisites satisfied -> intro start`, {
        gateReason,
      });

      setIntroDone(false);
      setGrowStarted(false);
      setBurstIndex(-1);
      setIntroRun((v) => v + 1);

      preloaders = INTRO_BURST_IMAGES.map((src, preloadIdx) => {
        const img = new Image();
        img.decoding = "async";
        img.addEventListener("load", () =>
          console.debug(`${debugPrefix} preloaded`, { idx: preloadIdx, src }),
        );
        img.addEventListener("error", () =>
          console.warn(`${debugPrefix} preload failed`, {
            idx: preloadIdx,
            src,
          }),
        );
        img.src = src;
        return img;
      });

      Promise.allSettled(
        preloaders.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              const done = () => resolve();
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            }),
        ),
      ).then(() => {
        if (!isActive || introCompletedRef.current) return;
        if (preloadGateTimer) {
          window.clearTimeout(preloadGateTimer);
          preloadGateTimer = 0;
        }
        console.log(`${debugPrefix} preload settled`);
        startSequence("preload-settled");
      });

      preloadGateTimer = window.setTimeout(() => {
        if (!isActive || introCompletedRef.current) return;
        console.warn(`${debugPrefix} preload gate timeout -> continue`);
        startSequence("preload-gate-timeout");
      }, PRELOAD_GATE_MS);

      const fallbackMs =
        PRELOAD_GATE_MS +
        FIRST_FRAME_DELAY_MS +
        INTRO_BURST_IMAGES.length * STEP_MS +
        GROW_DELAY_MS +
        GROW_ANIMATION_MS +
        1200;
      fallbackTimerRef.current = window.setTimeout(() => {
        if (!isActive || introCompletedRef.current) return;
        console.warn(`${debugPrefix} fallback timeout -> forcing introDone`);
        finishIntro("global-fallback-timeout");
      }, fallbackMs);
    };

    const tryStartIntro = (trigger: string) => {
      console.log(`${debugPrefix} gate check`, {
        trigger,
        domReady,
        bootReady,
        readyState: document.readyState,
      });
      if (!domReady || !bootReady) return;
      startIntro(trigger);
    };

    if (domReady) {
      console.log(`${debugPrefix} dom ready at mount`);
    } else {
      console.log(`${debugPrefix} waiting for window load`);
      loadHandler = () => {
        if (!isActive) return;
        domReady = true;
        console.log(`${debugPrefix} window load received`);
        tryStartIntro("window-load");
      };
      window.addEventListener("load", loadHandler, { once: true });
    }

    const bootOverlay = document.getElementById("vc-boot");
    bootReady = !bootOverlay;
    if (bootReady) {
      console.log(`${debugPrefix} boot ready`, {
        reason: "overlay-missing",
      });
    } else {
      const overlayDone = bootOverlay?.dataset.done === "1";
      console.log(`${debugPrefix} waiting for boot completion`, {
        event: BOOT_LOADER_DONE_EVENT,
        overlayDone,
      });
      bootDoneHandler = (event: Event) => {
        if (!isActive) return;
        bootReady = true;
        const detail = (event as CustomEvent).detail;
        console.log(`${debugPrefix} boot done received`, { detail });
        tryStartIntro("boot-done-event");
      };
      window.addEventListener(
        BOOT_LOADER_DONE_EVENT,
        bootDoneHandler as EventListener,
        { once: true },
      );
    }

    tryStartIntro("mount");

    return () => {
      isActive = false;
      console.log(`${debugPrefix} cleanup`);
      if (loadHandler) window.removeEventListener("load", loadHandler);
      if (bootDoneHandler)
        window.removeEventListener(
          BOOT_LOADER_DONE_EVENT,
          bootDoneHandler as EventListener,
        );
      if (frameTimer) window.clearTimeout(frameTimer);
      if (growDelayTimer) window.clearTimeout(growDelayTimer);
      if (preloadGateTimer) window.clearTimeout(preloadGateTimer);
      if (fallbackTimerRef.current)
        window.clearTimeout(fallbackTimerRef.current);
      if (growFinishTimerRef.current)
        window.clearTimeout(growFinishTimerRef.current);
      fallbackTimerRef.current = null;
      growFinishTimerRef.current = null;
      preloaders.length = 0;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    console.log("[eventos-intro] state", {
      burstIndex,
      growStarted,
      introDone,
      introRun,
    });
  }, [burstIndex, growStarted, introDone, introRun]);

  const currentBurstSrc =
    burstIndex >= 0
      ? INTRO_BURST_IMAGES[Math.min(burstIndex, INTRO_BURST_IMAGES.length - 1)]
      : null;

  return (
    <div class={introDone ? "evrPage evrPage--introDone" : "evrPage"}>
      <div
        class={introDone ? "evrIntroFigure is-done" : "evrIntroFigure"}
        aria-hidden="true"
      >
        <div class="evrIntroGrow">
          <div class="evrIntroBurst">
            {currentBurstSrc ? (
              <figure
                class={
                  growStarted
                    ? "evrIntroBurstShot evrIntroBurstShot--done"
                    : "evrIntroBurstShot"
                }
                key={`burst-${introRun}-${burstIndex}`}
                style={{
                  ["--burst-base-scale" as string]: (
                    0.56 +
                    Math.max(0, burstIndex) * 0.1
                  ).toFixed(2),
                }}
                onAnimationStart={() =>
                  console.debug("[eventos-intro] burst animation start", {
                    burstIndex,
                    src: currentBurstSrc,
                  })
                }
                onAnimationEnd={() =>
                  console.debug("[eventos-intro] burst animation end", {
                    burstIndex,
                    src: currentBurstSrc,
                  })
                }
              >
                <img
                  src={currentBurstSrc}
                  alt=""
                  loading="eager"
                  decoding="async"
                />
              </figure>
            ) : null}
          </div>
          <figure
            class={
              growStarted
                ? "evrIntroGrowMedia evrIntroGrowMedia--start"
                : "evrIntroGrowMedia"
            }
            onAnimationStart={() =>
              console.log("[eventos-intro] grow animation start")
            }
            onAnimationEnd={() => finishIntro("grow-animation-end")}
          >
            <img
              src={EVENTS_HERO_9X16}
              alt=""
              loading="eager"
              decoding="async"
            />
          </figure>
        </div>
      </div>

      <section class="evrHero">
        <picture class="evrHeroPicture">
          <source media="(max-aspect-ratio: 9/16)" srcSet={EVENTS_HERO_9X16} />
          <img
            class="evrHeroImage"
            src={EVENTS_HERO_16X9}
            alt={t("events.hero.alt")}
            loading="eager"
            decoding="async"
          />
        </picture>

        <div class="evrHeroWords" aria-hidden="true">
          <span class="evrWord evrWord--1">{t("events.hero.word1")}</span>
          <span class="evrWord evrWord--2">{t("events.hero.word2")}</span>
          <span class="evrWord evrWord--3">{t("events.hero.word3")}</span>
          <span class="evrWord evrWord--4">{t("events.hero.word4")}</span>
        </div>
      </section>

      <section class="evrIntro">
        <div class="evrWrap">
          <p>{t("events.intro.statement")}</p>
        </div>
      </section>

      <section class="evrPortfolio">
        <div class="evrWrap">
          <div class="evrSectionHead">
            <p class="evrKicker">{t("events.portfolio.kicker")}</p>
            <h2>{t("events.portfolio.title")}</h2>
          </div>

          <div class="evrPortfolioGrid">
            {PORTFOLIO_CARDS.map((card, idx) => (
              <article class="evrPortfolioCard" key={card.titleKey}>
                <div class="evrPortfolioMedia">
                  <img
                    src={mediaSrc(card.image)}
                    alt={t(card.titleKey)}
                    loading="lazy"
                    decoding="async"
                    onClick={() => {
                      const globalIdx = ALL_IMAGES.indexOf(card.image);
                      setLightboxIndex(globalIdx >= 0 ? globalIdx : 2 + idx);
                      setLightboxOpen(true);
                    }}
                  />
                </div>
                <div class="evrPortfolioMeta">
                  <h3>{t(card.titleKey)}</h3>
                  <p>{t(card.metaKey)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section class="evrRibbon" aria-hidden="true">
        <div class="evrWrap">
          <p>{t("events.ribbon")}</p>
        </div>
      </section>

      <section class="evrGallery" id="eventos-galeria">
        <div class="evrWrap">
          <div class="evrSectionHead">
            <p class="evrKicker">{t("events.gallery.kicker")}</p>
            <h2>{t("events.gallery.title")}</h2>
          </div>

          <div class="evrGalleryGrid">
            {GALLERY.map((tile, index) => (
              <figure
                class={`evrTile ${tile.className}`}
                key={`${tile.image}-${index}`}
              >
                <img
                  src={mediaSrc(tile.image)}
                  alt={`${t("events.gallery.alt")} ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  onClick={() => {
                    const globalIdx = ALL_IMAGES.indexOf(tile.image);
                    setLightboxIndex(globalIdx);
                    setLightboxOpen(true);
                  }}
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section class="evrClosing">
        <div class="evrWrap evrClosingInner">
          <p class="evrKicker">{t("events.cta.kicker")}</p>
          <h2>{t("events.cta.title")}</h2>
          <p>{t("events.cta.body")}</p>
          <div class="evrActions">
            <Link href="/reservas" className="evrBtn evrBtn--solid">
              {t("nav.reserve")}
            </Link>
            <Link href="/contacto" className="evrBtn">
              {t("nav.contact")}
            </Link>
          </div>
        </div>
      </section>

      {lightboxOpen && (
        <div
          class="evrLightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Galería de imágenes"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <button
            type="button"
            class="evrLightboxClose"
            aria-label="Cerrar"
            onClick={() => setLightboxOpen(false)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            class="evrLightboxNav evrLightboxPrev"
            aria-label="Imagen anterior"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i > 0 ? i - 1 : ALL_IMAGES.length - 1));
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div class="evrLightboxContent" onClick={(e) => e.stopPropagation()}>
            <img
              src={ALL_IMAGES[lightboxIndex]}
              alt={`Imagen ${lightboxIndex + 1} de ${ALL_IMAGES.length}`}
              decoding="async"
            />
          </div>

          <button
            type="button"
            class="evrLightboxNav evrLightboxNext"
            aria-label="Siguiente imagen"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i < ALL_IMAGES.length - 1 ? i + 1 : 0));
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div class="evrLightboxCounter">
            {lightboxIndex + 1} / {ALL_IMAGES.length}
          </div>
        </div>
      )}
    </div>
  );
}

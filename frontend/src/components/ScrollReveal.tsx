import { useEffect, useRef, useState } from "preact/hooks";

type ScrollRevealProps = {
  initialSize?: number; // initial hole size in px
  maxSizePercent?: number; // max size as percentage of viewport
  height?: string; // default '130vh'
  borderRadius?: string; // default '1rem'
};

export function ScrollReveal({
  initialSize = 0,
  maxSizePercent = 90,
  height = "200vh",
  borderRadius = "1rem",
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1920,
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 1080,
  );

  // Detect portrait vs landscape
  const isPortrait = viewportHeight > viewportWidth;
  const aspectRatio = isPortrait ? 16 / 9 : 9 / 16;

  // Responsive image URLs based on viewport ratio
  const imageSrc = isPortrait
    ? "https://villacarmenmedia.b-cdn.net/images/salones/9%3A16/salones9-16_1.webp"
    : "https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_4.webp";

  // Track scroll progress, viewport width and height
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateProgress = () => {
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const start = -rect.height + windowHeight;
      const end = 0;
      const current = -rect.top;

      const p = Math.max(0, Math.min(1, (current - start) / (end - start)));
      setProgress(p);
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress);
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  // Calculate hole size: starts at initialSize px, grows to maxSizePercent % of viewport width
  // Apply aspect ratio: portrait = 9:16, landscape = 16:9
  const maxSizePx = (maxSizePercent / 100) * viewportWidth;
  const holeWidth = initialSize + (maxSizePx - initialSize) * progress;
  const holeHeight = holeWidth * aspectRatio;

  // Text animation calculations
  const textOpacity = 1 - progress;
  const translateXLeft = -100 * progress; // Left word moves left
  const translateXRight = 100 * progress; // Right word moves right
  const translateYBottom = 50 * progress; // Bottom text moves toward center Y

  return (
    <section ref={containerRef} style={{ height, position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: "78px",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Layer 1: Image below */}
        <img
          src={imageSrc}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            paddingBottom: "10px",
          }}
        />

        {/* Layer 2: bg color layer with SVG mask creating a hole */}
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <mask id="hole-mask">
              {/* Full white = visible */}
              <rect width="100%" height="100%" fill="white" />
              {/* Black rect = hole (hidden) - grows with scroll */}
              <rect
                x="50%"
                y="50%"
                width={holeWidth}
                height={holeHeight}
                rx={borderRadius}
                fill="black"
                transform={`translate(${-holeWidth / 2}, ${-holeHeight / 2})`}
              />
            </mask>
          </defs>
          {/* bg color rect with mask applied */}
          <rect
            width="100%"
            height="100%"
            fill="var(--bg)"
            mask="url(#hole-mask)"
          />
        </svg>

        {/* Corner text animations */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "5%",
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.5rem, 4vw, 3rem)",
            color: "var(--text)",
            opacity: textOpacity,
            transform: `translateX(${translateXLeft}%)`,
            transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
            whiteSpace: "nowrap",
          }}
        >
          Tradicion
        </div>
        <div
          style={{
            position: "absolute",
            top: "15%",
            right: "5%",
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.5rem, 4vw, 3rem)",
            color: "var(--text)",
            opacity: textOpacity,
            transform: `translateX(${translateXRight}%)`,
            transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
            whiteSpace: "nowrap",
          }}
        >
          Gastronomia
        </div>

        {/* Bottom text - moves to center Y axis */}
        <div
          style={{
            position: "absolute",
            top: "calc(50% + " + (holeHeight / 2 + 40) + "px)",
            left: "50%",
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1rem, 3vw, 2rem)",
            color: "var(--text)",
            opacity: textOpacity,
            transform: `translate(-50%, ${translateYBottom}%)`,
            transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
            whiteSpace: "nowrap",
            textAlign: "center",
          }}
        >
          Eventos y Elegancia
        </div>
      </div>
    </section>
  );
}

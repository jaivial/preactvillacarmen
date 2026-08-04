import { useSetAtom } from "jotai";
import { forkyOpenAtom } from "./atoms";

/**
 * Public-site Forky button. Plain preact button (no motion/react: the public
 * shell renders with preact, and the bounce is done in CSS with
 * prefers-reduced-motion respected).
 */
export function ForkyButton() {
  const setOpen = useSetAtom(forkyOpenAtom);

  return (
    <>
      <style>{`
        @keyframes forky-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .forky-bounce {
          animation: forky-bounce 2.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .forky-bounce { animation: none; }
        }
      `}</style>
      <button
        type="button"
        data-testid="forky-button"
        aria-label="Abrir asistente Forky"
        onClick={() => {
          console.log('[forky-button] clicked')
          setOpen(true)
        }}
        className="forky-bounce fixed bottom-6 right-6 z-[80] flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/80 p-1 shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c5cff]"
      >
        <img
          src="/assets/forky/forky-preview.png"
          alt=""
          draggable={false}
          className="h-full w-full rounded-full object-cover"
        />
      </button>
    </>
  );
}

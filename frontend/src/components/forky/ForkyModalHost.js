// ForkyModalHost.js — plain-JS bridge between the preact shell and the
// real-React assistant island.
//
// assistant-ui 0.15's tap runtime is incompatible with preact/compat, so the
// modal (assistant-ui chat + 3D viewer) runs in a lazily mounted React root
// (react/react-dom re-aliased to the real packages by the forky-real-react
// vite plugin, overriding the preact preset's compat aliases). This file stays
// out of the TS type graph (the react files under src/components/forky are
// checked by tsconfig.forky.json against real React types).
import { useEffect, useRef } from 'preact/hooks'
import { useAtomValue } from 'jotai'
import { forkyOpenAtom } from './atoms'
// Real React element factory for the island (preact's h() produces vnodes
// React cannot render).
import { createElement as reactCreateElement } from 'react'

export function ForkyModalHost() {
  const open = useAtomValue(forkyOpenAtom)
  const containerRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let root = null

    ;(async () => {
      const reactMod = await import('react')
      const reactDomMod = await import('react-dom/client')
      const { ForkyModal } = await import('./ForkyModal')
      console.log('[forky-host] react:', reactMod.default?.version ?? reactMod.version, 'createRoot:', typeof reactDomMod.createRoot, 'container:', !!containerRef.current)
      if (cancelled || !containerRef.current) return
      root = reactDomMod.createRoot(containerRef.current)
      rootRef.current = root
      root.render(reactCreateElement(ForkyModal))
      console.log('[forky-host] render called')
    })().catch((err) => {
      console.error('[forky-host] island error:', String(err?.message ?? err).slice(0, 300))
    })

    return () => {
      cancelled = true
      if (root) {
        root.unmount()
        rootRef.current = null
      }
    }
  }, [open])

  // Close requested while the island is mounted (atom reset from the modal's
  // Esc handler or close button).
  useEffect(() => {
    if (!open && rootRef.current) {
      rootRef.current.unmount()
      rootRef.current = null
    }
  }, [open])

  return reactCreateElement('div', { ref: containerRef, 'data-testid': 'forky-modal-host' })
}

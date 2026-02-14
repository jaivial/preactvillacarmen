import { Link } from 'wouter-preact'
import type { ComponentChildren } from 'preact'

export function BackofficeLayout(props: { children: ComponentChildren }) {
  return (
    <div class="backoffice">
      <header class="bo-header">
        <div class="container bo-bar">
          <Link href="/" className="bo-brand">
            Volver al sitio
          </Link>
          <Link href="/backoffice" className="bo-link">
            Backoffice
          </Link>
        </div>
      </header>
      <main class="bo-main">{props.children}</main>
    </div>
  )
}

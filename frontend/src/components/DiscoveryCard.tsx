import { Link } from 'wouter-preact'
import './DiscoveryCard.css'

type Props = { href: string; title: string; description: string; image: string; imageAlt: string; action: string; testId?: string }

export function DiscoveryCard(props: Props) {
  const content = <>
    <span class="discovery-card__media"><img src={props.image} alt={props.imageAlt} width="1200" height="900" loading="lazy" decoding="async" /></span>
    <span class="discovery-card__body">
      <span class="discovery-card__title">{props.title}</span>
      <span class="discovery-card__description">{props.description}</span>
      <span class="discovery-card__action">{props.action}<span aria-hidden="true"> →</span></span>
    </span>
  </>
  return props.href.startsWith('/')
    ? <Link href={props.href} className="discovery-card" data-testid={props.testId}>{content}</Link>
    : <a href={props.href} class="discovery-card" data-testid={props.testId}>{content}</a>
}

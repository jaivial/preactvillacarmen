import { Coffee } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  message?: string
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  message,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      class={`cafeEmpty${className ? ` ${className}` : ''}`}
      data-ui="empty-state"
      role="status"
      aria-live="polite"
    >
      <div class="cafeEmptyInner" data-ui="empty-state-inner">
        <div class="cafeEmptyIcon" data-ui="empty-state-icon" aria-hidden="true">
          {icon ?? <Coffee size={32} strokeWidth={1.4} />}
        </div>
        {title && (
          <p class="cafeEmptyTitle" data-slot="empty-state-title">
            {title}
          </p>
        )}
        {message && (
          <p class="cafeEmptyMessage" data-slot="empty-state-message">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

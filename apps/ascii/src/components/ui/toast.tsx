import { cn } from '@cyberdeck/deck-kit/utils'
import type { ToastVariant } from '../../hooks/use-toast'

interface Props {
  message: string
  variant: ToastVariant
  onDismiss: () => void
}

const variantStyles: Record<
  ToastVariant,
  { border: string; shadow: string; iconClass: string; icon: string }
> = {
  error: {
    border: 'border-hot-pink',
    shadow: '0 0 12px rgba(255, 45, 120, 0.15)',
    iconClass: 'text-danger',
    icon: '✕',
  },
  info: {
    border: 'border-cyan',
    shadow: '0 0 12px rgba(0, 229, 255, 0.15)',
    iconClass: 'text-info',
    icon: 'ℹ',
  },
  warn: {
    border: 'border-electric',
    shadow: '0 0 12px rgba(255, 230, 0, 0.15)',
    iconClass: 'text-warning',
    icon: '⚠',
  },
}

export default function Toast({ message, variant, onDismiss }: Props) {
  const { border, shadow, iconClass, icon } = variantStyles[variant]

  return (
    <div
      role="alert"
      className={cn('flex items-start gap-sm p-sm bg-shadow border rounded-xs', border)}
      style={{
        minWidth: '260px',
        maxWidth: '360px',
        boxShadow: shadow,
      }}
    >
      <span className={cn(iconClass, 'text-xs shrink-0')}>{icon}</span>
      <span className="text-fg text-xs flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="dismiss"
        className="text-fg-subtle text-xs cursor-pointer shrink-0 leading-tight bg-transparent border-none p-0"
      >
        ×
      </button>
    </div>
  )
}

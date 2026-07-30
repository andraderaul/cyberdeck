import type { ToastVariant } from '../hooks/use-toast'
import { cn } from '../utils/cn'

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
    border: 'border-danger',
    shadow: '0 0 12px color-mix(in srgb, var(--color-danger) 15%, transparent)',
    iconClass: 'text-danger',
    icon: '✕',
  },
  info: {
    border: 'border-info',
    shadow: '0 0 12px color-mix(in srgb, var(--color-info) 15%, transparent)',
    iconClass: 'text-info',
    icon: 'ℹ',
  },
  warn: {
    border: 'border-warning',
    shadow: '0 0 12px color-mix(in srgb, var(--color-warning) 15%, transparent)',
    iconClass: 'text-warning',
    icon: '⚠',
  },
}

export default function Toast({ message, variant, onDismiss }: Props) {
  const { border, shadow, iconClass, icon } = variantStyles[variant]

  return (
    <div
      role="alert"
      className={cn('flex items-start gap-sm p-sm bg-bg-elevated border rounded-xs', border)}
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
        // The negative margins are load-bearing: a 44px button inside `p-sm` would take a one-line
        // toast from ~37px to ~60px. They let it overflow the padding box instead, so the target is
        // the full 44 square and the toast grows by a few pixels.
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center -my-2xs -mr-2xs text-fg-subtle text-xs cursor-pointer bg-transparent border-none"
      >
        ×
      </button>
    </div>
  )
}

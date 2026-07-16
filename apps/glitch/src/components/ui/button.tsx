import { cn } from '../../utils/cn'

const VARIANT_CLASSES = {
  primary: 'border-2 border-violet bg-accent-bg text-violet font-bold',
  secondary: 'border border-info bg-info-bg text-info font-medium',
  danger: 'border border-hot-pink bg-danger-ghost text-hot-pink font-bold',
  record: 'border border-hot-pink bg-transparent text-hot-pink font-medium',
  analyze: 'border border-violet bg-accent-ghost text-violet',
  ghost: 'border border-base bg-transparent text-fg-muted',
} as const

interface Props extends React.ComponentProps<'button'> {
  variant: keyof typeof VARIANT_CLASSES
}

export default function Button({ variant, className, children, ...props }: Props) {
  return (
    <button
      {...props}
      data-variant={variant}
      type="button"
      className={cn(
        'min-h-[44px] font-mono tracking-wide rounded-xs cursor-pointer transition-all duration-fast',
        '[padding:var(--btn-secondary-padding)] [font-size:var(--btn-secondary-size)]',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

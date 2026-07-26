import { cn } from '@cyberdeck/deck-kit/utils'

const VARIANT_CLASSES = {
  neutral: 'border-transparent text-fg-subtle hover:border-base hover:text-fg',
  'accent-text': 'border-transparent text-accent hover:border-accent',
  'accent-fill': 'border-accent bg-accent-ghost text-accent hover:bg-accent-dim',
} as const

interface Props extends React.ComponentProps<'button'> {
  variant: keyof typeof VARIANT_CLASSES
}

export default function HeaderButton({ variant, className, children, ...props }: Props) {
  return (
    <button
      {...props}
      type="button"
      className={cn(
        'flex min-h-[44px] min-w-[44px] items-center justify-center',
        'rounded-pill border bg-transparent px-xs py-2xs',
        'font-mono text-xs tracking-wide',
        'cursor-pointer transition-all duration-fast',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

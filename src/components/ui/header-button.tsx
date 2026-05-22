import { cn } from '../../utils/cn'

const VARIANT_CLASSES = {
  neutral: 'border-transparent text-fg-subtle hover:border-base hover:text-ghost',
  'accent-text': 'border-transparent text-violet hover:border-violet',
  'accent-fill': 'border-violet bg-accent-ghost text-violet hover:bg-accent-dim',
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
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

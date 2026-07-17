import { cn } from '../../utils/cn'

interface Props extends React.ComponentProps<'button'> {
  selected: boolean
}

export default function Chip({ selected, className, children, ...props }: Props) {
  return (
    <button
      {...props}
      type="button"
      aria-pressed={selected}
      className={cn(
        'flex items-center gap-2xs px-sm py-2xs rounded-xs border font-mono text-xs transition-colors min-h-[44px]',
        selected ? 'border-violet text-violet' : 'border-base text-fg-muted hover:border-dim',
        props.disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  )
}

import { cn } from '../utils/cn'

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
        // A Chip pays for its target in layout rather than in an overlay (`ui/touch-target.ts`):
        // it stands in a scrolling row of its own kind, where a centred overlay would reach into
        // its neighbour's. The width is the half that gets forgotten — a Chip whose label is two
        // characters (`1×`, `VHS`, `+`) draws ~31px and only the height was ever held.
        'flex items-center justify-center gap-2xs px-sm py-2xs rounded-xs border font-mono text-xs transition-colors min-h-[44px] min-w-[44px]',
        selected ? 'border-accent text-accent' : 'border-base text-fg-muted hover:border-fg-muted',
        props.disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  )
}

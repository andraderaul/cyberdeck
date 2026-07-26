import { cn } from '@cyberdeck/deck-kit/utils'
import type { ScaleUnit } from '../atlas/scale'

interface Props {
  reader: ScaleUnit
  overflow: boolean
}

/**
 * The always-visible scale reader (ADR 0021): the number *is* the vertigo, so it stays on screen
 * and updates live with every gesture tick — without it the slide is just a dimmer. In OVERFLOW it
 * flips to a warning voice: the map is honestly blown out, and the reader says so rather than faking
 * an error. It brings its own opaque background because it floats over the canvas (ADR 0013).
 */
export default function ScaleReader({ reader, overflow }: Props) {
  return (
    <div
      aria-live="polite"
      className={cn(
        'absolute top-xs left-xs flex items-center gap-xs',
        'font-mono text-xs px-sm py-2xs rounded-xs bg-bg select-none pointer-events-none',
        overflow ? 'text-warning border border-warning' : 'text-info border border-info',
      )}
    >
      <span>{reader.text}</span>
      {overflow && (
        <span className="font-bold tracking-wide" data-testid="overflow-flag">
          · OVERFLOW
        </span>
      )}
    </div>
  )
}

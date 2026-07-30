import { TOUCH_TARGET_HEIGHT } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'

interface Props {
  on: boolean
  onToggle: () => void
}

/**
 * The key that brings the earned basemap (#229). A press of `B` toggles it; this chip makes that key
 * discoverable and gives touch — which has no key — the same reach. Deliberately minimal chrome: the
 * first screen is still pure light on dark, and this only offers the *confirmation*, never draws the
 * outline itself. Brings its own opaque background over the canvas (ADR 0013).
 */
export default function BasemapToggle({ on, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        'absolute bottom-xs left-xs font-mono text-xs px-sm py-2xs rounded-xs bg-bg select-none',
        'cursor-pointer transition-colors duration-fast',
        // The target grows, the chip does not: the first screen is the piece (ADR 0021), and this
        // only offers the confirmation — it must not start taking room from the light.
        TOUCH_TARGET_HEIGHT,
        on
          ? 'border border-info text-info'
          : 'border border-base text-fg-muted hover:text-fg hover:border-strong',
      )}
    >
      <span className="opacity-60">[B]</span> outline {on ? 'on' : 'off'}
    </button>
  )
}

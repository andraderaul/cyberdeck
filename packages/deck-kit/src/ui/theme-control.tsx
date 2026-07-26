import { useTheme } from '../theme/use-theme'
import { cn } from '../utils/cn'

interface Props {
  className?: string
}

/**
 * The deck's Theme picker, as a control that cycles (ADR 0024). It lives in the header — the one
 * surface all the programs share, and the one that already carries deck-level rather than
 * program-level controls — and it shows the Theme in force rather than the one it would move to,
 * because the label has to answer "what am I looking at" before "what happens if I press it".
 *
 * Born in the kit rather than duplicated first: the usual discipline is to extract at the second
 * caller once the diff is empty (ADR 0014), but the callers are known to be identical on day one
 * and there is no per-program variation to discover, so duplicating would be ceremony.
 */
export default function ThemeControl({ className }: Props) {
  const { theme, cycle } = useTheme()

  return (
    <button
      type="button"
      onClick={cycle}
      // The visible label is the Theme's name, so the accessible name has to contain it as well as
      // say what the control is (WCAG 2.5.3).
      aria-label={`theme: ${theme}`}
      title="cycle the deck's theme"
      className={cn(
        'flex min-h-[44px] items-center justify-center gap-2xs',
        'rounded-pill border border-transparent bg-transparent px-xs py-2xs',
        'font-mono text-fg-subtle text-xs tracking-wide',
        'cursor-pointer transition-all duration-fast',
        'hover:border-base hover:text-fg',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        className,
      )}
    >
      <span aria-hidden="true">◐</span>
      {theme}
    </button>
  )
}

import { cn } from '@cyberdeck/deck-kit/utils'
import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  children?: ReactNode
  className?: string
  /**
   * Whether the body is the thing that scrolls. False where the child brings its own scroller —
   * the Console's log, the Source listing, the Terminal's output all size themselves against a
   * fixed sibling — so the tab stop goes on that element instead of here and a keyboard user is
   * not walked through a wrapper that never moves.
   */
  bodyScrolls?: boolean
}

/**
 * What a region that scrolls needs to be reachable by keyboard (`scrollable-region-focusable`,
 * WCAG 2.1.1) — a tab stop and a focus ring, spelled the way this program's inputs already spell
 * one. `ring-inset` because the panel clips its overflow and an outset ring would be cut off.
 *
 * It complements ADR 0018 rather than competing with it: a tab stop scrolls a read-only surface
 * and drives nothing, so the Console is still the only grammar. #355 is the case for it — a
 * keyboard user could drive the machine and not scroll back through what it printed, in the one
 * program on the deck whose entire interface is a keyboard.
 */
export const KEYBOARD_SCROLLABLE =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset'

/**
 * A titled surface for machine state. Read-only by construction — it renders no interactive
 * element and takes no handler, because the Console is the program's only control grammar
 * (ADR 0018). If a panel ever needs to accept input, that is a signal the command is missing.
 */
export default function Panel({ title, children, className, bodyScrolls = true }: PanelProps) {
  return (
    <section
      className={cn(
        // A floor for the stacked mobile layout, where the grid rows no longer size these.
        'flex min-h-0 flex-col overflow-hidden border border-base bg-bg-surface',
        'min-h-[8rem] lg:min-h-0',
        className,
      )}
      aria-label={title}
    >
      <h2 className="shrink-0 border-base border-b px-item py-tight font-semibold text-fg-muted text-xs uppercase tracking-widest">
        {title}
      </h2>
      <div
        tabIndex={bodyScrolls ? 0 : undefined}
        className={cn(
          'min-h-0 flex-1 overflow-auto p-item text-sm',
          bodyScrolls && KEYBOARD_SCROLLABLE,
        )}
      >
        {children}
      </div>
    </section>
  )
}

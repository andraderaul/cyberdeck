import { cn } from '@cyberdeck/deck-kit/utils'
import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  children?: ReactNode
  className?: string
}

/**
 * A titled surface for machine state. Read-only by construction — it renders no interactive
 * element and takes no handler, because the Console is the program's only control grammar
 * (ADR 0018). If a panel ever needs to accept input, that is a signal the command is missing.
 */
export default function Panel({ title, children, className }: PanelProps) {
  return (
    <section
      className={cn(
        // A floor for the stacked mobile layout, where the grid rows no longer size these.
        'flex min-h-0 flex-col overflow-hidden border border-base bg-surface',
        'min-h-[8rem] lg:min-h-0',
        className,
      )}
      aria-label={title}
    >
      <h2 className="shrink-0 border-base border-b px-sm py-xs font-semibold text-fg-muted text-xs uppercase tracking-widest">
        {title}
      </h2>
      <div className="min-h-0 flex-1 overflow-auto p-sm text-sm">{children}</div>
    </section>
  )
}

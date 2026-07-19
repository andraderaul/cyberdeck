import { cn } from '@cyberdeck/deck-kit/utils'
import { useEffect, useRef } from 'react'
import Panel from './panel'

type SourceEditorProps = {
  source: string
  editable: boolean
  breakpoints: ReadonlySet<number>
  currentLine: number | null
  onChange: (source: string) => void
}

/**
 * The Source, and the only writable surface on the page. Locking it while a Machine exists is
 * the visible half of the three-state model — the invariant itself lives in `useConsole`.
 *
 * Once locked it stops being a textarea and becomes a listing, which is what makes room for the
 * gutter: the line the PC is on, and the lines carrying a breakpoint. Both are read-only marks —
 * a breakpoint is set with `break`, never by clicking (ADR 0018).
 */
export default function SourceEditor({
  source,
  editable,
  breakpoints,
  currentLine,
  onChange,
}: SourceEditorProps) {
  return (
    // Taller than the default floor when stacked: reading the program is the point of
    // opening a shared link on a phone.
    <Panel title={editable ? 'Source' : 'Source — locked'} className="min-h-[16rem] lg:min-h-0">
      <div className="flex h-full min-h-0 flex-col gap-2">
        {/* Says why, not just that: a disabled box with no explanation reads as a broken page. */}
        {!editable && (
          <p className="shrink-0 border-violet border-l-2 bg-violet/10 px-2 py-1 text-fg-muted text-xs">
            A Machine is running this code. <code className="text-violet">reset</code> to edit.
          </p>
        )}

        {editable ? (
          <textarea
            value={source}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            aria-label="Assembly source"
            className="min-h-0 flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed outline-none focus-visible:ring-1 focus-visible:ring-violet"
          />
        ) : (
          <Listing source={source} breakpoints={breakpoints} currentLine={currentLine} />
        )}
      </div>
    </Panel>
  )
}

function Listing({
  source,
  breakpoints,
  currentLine,
}: Pick<SourceEditorProps, 'source' | 'breakpoints' | 'currentLine'>) {
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Follows the PC out of view during a run, so control flow stays watchable without scrolling.
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    // Unnamed on purpose: the Panel already announces this region as "Source — locked", and a
    // second name here would only repeat it.
    <div className="min-h-0 flex-1 overflow-auto font-mono text-sm leading-relaxed">
      {source.split('\n').map((text, index) => {
        const line = index + 1
        const active = line === currentLine
        const broken = breakpoints.has(line)

        return (
          <div
            // Lines are identified by position — two identical lines are genuinely different rows.
            key={line}
            ref={active ? activeRef : undefined}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex gap-2 whitespace-pre',
              // Violet fill rather than a text colour, so the marker stays legible against the
              // dimmed listing instead of competing with it.
              active && 'bg-violet/20 text-fg',
              !active && 'text-fg-muted',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'w-10 shrink-0 select-none pr-1 text-right text-xs',
                broken ? 'text-danger' : 'text-fg-subtle',
              )}
            >
              {broken ? '● ' : ''}
              {line}
            </span>
            <span className="min-w-0">{text || ' '}</span>
          </div>
        )
      })}
    </div>
  )
}

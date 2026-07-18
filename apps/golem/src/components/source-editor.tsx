import { cn } from '@cyberdeck/deck-kit/utils'
import Panel from './panel'

type SourceEditorProps = {
  source: string
  editable: boolean
  onChange: (source: string) => void
}

/**
 * The Source, and the only writable surface on the page. Locking it while a Machine exists is
 * the visible half of the three-state model — the invariant itself lives in `useConsole`.
 */
export default function SourceEditor({ source, editable, onChange }: SourceEditorProps) {
  return (
    <Panel title={editable ? 'Source' : 'Source — locked'}>
      <div className="flex h-full min-h-0 flex-col gap-2">
        {/* Says why, not just that: a disabled box with no explanation reads as a broken page. */}
        {!editable && (
          <p className="shrink-0 border-violet border-l-2 bg-violet/10 px-2 py-1 text-fg-muted text-xs">
            A Machine is running this code. <code className="text-violet">reset</code> to edit.
          </p>
        )}
        <textarea
          value={source}
          onChange={(event) => onChange(event.target.value)}
          readOnly={!editable}
          spellCheck={false}
          aria-label="Assembly source"
          className={cn(
            'min-h-0 flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed outline-none',
            'focus-visible:ring-1 focus-visible:ring-violet',
            !editable && 'cursor-not-allowed text-fg-muted',
          )}
        />
      </div>
    </Panel>
  )
}

import { cn } from '@cyberdeck/deck-kit/utils'
import { useEffect, useRef, useState } from 'react'
import type { ConsoleLine } from '../hooks/use-console'
import Panel from './panel'

type ConsoleProps = {
  lines: ConsoleLine[]
  history: string[]
  onSubmit: (input: string) => void
}

const LINE_STYLES: Record<ConsoleLine['kind'], string> = {
  echo: 'text-fg-muted',
  info: 'text-fg',
  error: 'text-danger',
}

/**
 * The operator's surface — the program's only control grammar (ADR 0018). Everything here is
 * the tool talking; anything the running program prints belongs to the Terminal instead.
 */
export default function Console({ lines, history, onSubmit }: ConsoleProps) {
  const [input, setInput] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  // How far back through history the arrows have walked. `null` means "at the live input", which
  // is distinct from being at the newest entry — coming back down has to restore what was typed.
  const [recalled, setRecalled] = useState<number | null>(null)
  const draftRef = useRef('')

  const walkHistory = (direction: -1 | 1) => {
    if (history.length === 0) {
      return
    }

    if (recalled === null) {
      if (direction === 1) {
        return
      }
      draftRef.current = input
      setRecalled(history.length - 1)
      setInput(history[history.length - 1])
      return
    }

    const next = recalled + direction
    if (next < 0) {
      return
    }
    if (next >= history.length) {
      setRecalled(null)
      setInput(draftRef.current)
      return
    }
    setRecalled(next)
    setInput(history[next])
  }

  useEffect(() => {
    // Newest line is the one worth reading; keep it in view as output accumulates.
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [])

  return (
    <Panel title="Console">
      <div className="flex h-full min-h-0 flex-col gap-2 font-mono text-xs">
        <div ref={logRef} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {lines.map((line) => (
            <p
              key={line.id}
              className={cn('whitespace-pre-wrap break-words', LINE_STYLES[line.kind])}
            >
              {line.text}
            </p>
          ))}
        </div>

        <form
          className="flex shrink-0 items-center gap-2 border-base border-t pt-2"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(input)
            setInput('')
            setRecalled(null)
            draftRef.current = ''
          }}
        >
          <span aria-hidden className="text-violet">
            &gt;
          </span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
                return
              }
              // Prevented so the caret stays put instead of jumping to one end of the field.
              event.preventDefault()
              walkHistory(event.key === 'ArrowUp' ? -1 : 1)
            }}
            aria-label="Console input"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent outline-none focus-visible:ring-1 focus-visible:ring-violet"
          />
        </form>
      </div>
    </Panel>
  )
}

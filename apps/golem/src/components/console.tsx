import { cn } from '@cyberdeck/deck-kit/utils'
import { useEffect, useRef, useState } from 'react'
import type { ConsoleLine } from '../hooks/use-console'
import Panel from './panel'

type ConsoleProps = {
  lines: ConsoleLine[]
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
export default function Console({ lines, onSubmit }: ConsoleProps) {
  const [input, setInput] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

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
          }}
        >
          <span aria-hidden className="text-violet">
            &gt;
          </span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
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

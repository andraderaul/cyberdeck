import { useEffect, useRef } from 'react'
import type { Machine } from '../golem/machine'
import Panel from './panel'

type TerminalProps = {
  machine: Machine | null
}

/**
 * The machine's own output surface — diegetic, where the Console is not. Everything here was
 * written by the running program via `stb` to the memory-mapped Terminal address; everything in
 * the Console is the tool talking to the operator. A reader must never have to work out which
 * of the two wrote a given line, which is why they never share a surface.
 *
 * Read-only, like every panel but the Source (ADR 0018).
 */
export default function Terminal({ machine }: TerminalProps) {
  const output = machine?.terminal ?? ''
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [])

  return (
    <Panel title="Terminal">
      <div className="flex h-full min-h-0 flex-col">
        {output === '' ? (
          <p className="text-fg-muted text-xs">
            {machine === null
              ? 'No machine. Anything your program prints appears here.'
              : 'Nothing printed yet.'}
          </p>
        ) : (
          // `pre-wrap` so the program's own newlines and spacing render as written. Cyan marks
          // this as the machine's voice — the Console answers in the foreground colour.
          <output className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono text-cyan text-sm leading-snug">
            {output}
          </output>
        )}
        <div ref={endRef} />
      </div>
    </Panel>
  )
}

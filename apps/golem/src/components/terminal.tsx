import { cn } from '@cyberdeck/deck-kit/utils'
import { useEffect, useRef } from 'react'
import type { Machine } from '../golem/machine'
import Panel, { KEYBOARD_SCROLLABLE } from './panel'

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
    // Follows the program's output as it prints, rather than stranding the reader at the top.
    if (output === '') {
      return
    }
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [output])

  return (
    <Panel title="Terminal" bodyScrolls={false}>
      <div className="flex h-full min-h-0 flex-col">
        {output === '' ? (
          <p className="text-fg-muted text-xs">
            {machine === null
              ? 'No machine. Anything your program prints appears here.'
              : 'Nothing printed yet.'}
          </p>
        ) : (
          // `pre-wrap` so the program's own newlines and spacing render as written. The phosphor
          // marks this as the machine's voice — the Console answers in the foreground colour. It is
          // its own role rather than "info" (ADR 0024): what it says is not information the tool is
          // offering, it is the machine talking, and a Theme is free to make it green.
          <output
            // The panel #355 names first: the machine's own output, which a keyboard could not
            // scroll back through. See `KEYBOARD_SCROLLABLE` in `panel.tsx`.
            // biome-ignore lint/a11y/noNoninteractiveTabindex: WCAG 2.1.1 outranks the rule here
            tabIndex={0}
            className={cn(
              'min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono text-phosphor text-sm leading-snug',
              KEYBOARD_SCROLLABLE,
            )}
          >
            {output}
          </output>
        )}
        <div ref={endRef} />
      </div>
    </Panel>
  )
}

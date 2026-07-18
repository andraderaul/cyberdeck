// The impure shell. Owns `Source → Image → Machine` and nothing else — every decision it makes
// is delegated to a pure function in `src/golem/`.

import { useCallback, useState } from 'react'
import { assemble, type Image } from '../golem/assembler'
import { parseCommand } from '../golem/command'
import { createMachine, type Machine, step } from '../golem/machine'

/** A line in the Console log. `echo` is what the operator typed, the rest is the tool answering. */
export interface ConsoleLine {
  id: number
  kind: 'echo' | 'info' | 'error'
  text: string
}

export interface ConsoleState {
  source: string
  machine: Machine | null
  image: Image | null
  lines: ConsoleLine[]
  /**
   * The editor is writable exactly while no Machine exists. Divergence between the source on
   * screen and the code executing is impossible by construction, not prevented by syncing.
   */
  editable: boolean
  setSource: (source: string) => void
  submit: (input: string) => void
}

const GREETING = 'GOLEM ready. Commands: asm, step, reset.'

export function useConsole(initialSource: string): ConsoleState {
  const [source, setSourceState] = useState(initialSource)
  const [machine, setMachine] = useState<Machine | null>(null)
  const [image, setImage] = useState<Image | null>(null)
  const [lines, setLines] = useState<ConsoleLine[]>([{ id: 0, kind: 'info', text: GREETING }])

  const append = useCallback((entries: Omit<ConsoleLine, 'id'>[]) => {
    setLines((previous) => [
      ...previous,
      ...entries.map((entry, offset) => ({ ...entry, id: previous.length + offset })),
    ])
  }, [])

  const setSource = useCallback(
    (next: string) => {
      // Guarded rather than merely disabled in the DOM: the lock is the invariant, not the styling.
      if (machine !== null) {
        return
      }
      setSourceState(next)
    },
    [machine],
  )

  const submit = useCallback(
    (input: string) => {
      const command = parseCommand(input)
      if (command.kind === 'empty') {
        return
      }

      const output: Omit<ConsoleLine, 'id'>[] = [{ kind: 'echo', text: `> ${input.trim()}` }]

      switch (command.kind) {
        case 'asm': {
          const result = assemble(source)
          if (!result.ok) {
            output.push(
              ...result.errors.map((error) => ({
                kind: 'error' as const,
                text: `line ${error.line}: ${error.message}`,
              })),
            )
            break
          }
          setImage(result.image)
          setMachine(createMachine(result.image))
          output.push({
            kind: 'info',
            text: `assembled ${result.image.words.length} words — editor locked, reset to edit`,
          })
          break
        }

        case 'step': {
          if (machine === null) {
            output.push({ kind: 'error', text: 'no machine — run asm first' })
            break
          }
          if (machine.halted) {
            output.push({ kind: 'info', text: 'machine halted — reset to run again' })
            break
          }
          const next = step(machine)
          setMachine(next)
          output.push({
            kind: 'info',
            text: next.halted
              ? 'halted'
              : `pc = 0x${next.registers[32].toString(16).padStart(8, '0')}`,
          })
          break
        }

        case 'reset': {
          setMachine(null)
          setImage(null)
          output.push({ kind: 'info', text: 'machine destroyed — editor unlocked' })
          break
        }

        case 'bad-arity':
          output.push({ kind: 'error', text: command.message })
          break

        case 'unknown':
          output.push({
            kind: 'error',
            text: command.suggestion
              ? `unknown command "${command.input}" — did you mean "${command.suggestion}"?`
              : `unknown command "${command.input}"`,
          })
          break
      }

      append(output)
    },
    [append, machine, source],
  )

  return {
    source,
    machine,
    image,
    lines,
    editable: machine === null,
    setSource,
    submit,
  }
}

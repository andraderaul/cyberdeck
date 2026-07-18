// The impure shell. Owns `Source → Image → Machine` and nothing else — every decision it makes
// is delegated to a pure function in `src/golem/`.

import { useCallback, useRef, useState } from 'react'
import { assemble, type Image } from '../golem/assembler'
import { type Command, parseCommand } from '../golem/command'
import { formatMemoryDump, formatRegister } from '../golem/inspect'
import { registerIndex } from '../golem/isa'
import { createMachine, type Machine, step } from '../golem/machine'
import { type ClockRate, useClock } from './use-clock'

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
  running: boolean
  rate: ClockRate
  /**
   * The editor is writable exactly while no Machine exists. Divergence between the source on
   * screen and the code executing is impossible by construction, not prevented by syncing.
   */
  editable: boolean
  setSource: (source: string) => void
  submit: (input: string) => void
}

const GREETING = 'GOLEM ready. Commands: asm, run, stop, step, clock, reset.'

export function useConsole(initialSource: string): ConsoleState {
  const [source, setSourceState] = useState(initialSource)
  const [machine, setMachineState] = useState<Machine | null>(null)
  const [image, setImage] = useState<Image | null>(null)
  const [lines, setLines] = useState<ConsoleLine[]>([{ id: 0, kind: 'info', text: GREETING }])

  // The clock steps far faster than React should re-render, so the ref is the machine of record
  // and the state is a mirror for the panels. React batches the mirror updates within a frame.
  const machineRef = useRef<Machine | null>(null)

  const setMachine = useCallback((next: Machine | null) => {
    machineRef.current = next
    setMachineState(next)
  }, [])

  const append = useCallback((entries: Omit<ConsoleLine, 'id'>[]) => {
    setLines((previous) => [
      ...previous,
      ...entries.map((entry, offset) => ({ ...entry, id: previous.length + offset })),
    ])
  }, [])

  // One instruction. Returns false when there is nothing left to run, which stops the clock.
  const advance = useCallback((): boolean => {
    const current = machineRef.current
    if (current === null || current.halted) {
      return false
    }
    const next = step(current)
    setMachine(next)
    return !next.halted
  }, [setMachine])

  const clock = useClock(advance)

  const setSource = useCallback((next: string) => {
    // Guarded rather than merely disabled in the DOM: the lock is the invariant, not the styling.
    if (machineRef.current !== null) {
      return
    }
    setSourceState(next)
  }, [])

  /** Assembles and instantiates, reporting either way. Returns whether a Machine now exists. */
  const build = useCallback(
    (output: Omit<ConsoleLine, 'id'>[]): boolean => {
      if (machineRef.current !== null) {
        return true
      }

      const result = assemble(source)
      if (!result.ok) {
        output.push(
          ...result.errors.map((error) => ({
            kind: 'error' as const,
            text: `line ${error.line}: ${error.message}`,
          })),
        )
        return false
      }

      setImage(result.image)
      setMachine(createMachine(result.image))
      output.push({
        kind: 'info',
        text: `assembled ${result.image.words.length} words — editor locked, reset to edit`,
      })
      return true
    },
    [setMachine, source],
  )

  const dispatch = useCallback(
    (command: Command, output: Omit<ConsoleLine, 'id'>[]): void => {
      switch (command.kind) {
        case 'asm':
          build(output)
          break

        case 'run': {
          if (!build(output)) {
            break
          }
          if (machineRef.current?.halted) {
            output.push({ kind: 'info', text: 'machine halted — reset to run again' })
            break
          }
          clock.start()
          output.push({
            kind: 'info',
            text: `running at ${clock.rate === 'max' ? 'max' : `${clock.rate}/s`} — stop to pause`,
          })
          break
        }

        case 'stop':
          if (!clock.running) {
            output.push({ kind: 'info', text: 'not running' })
            break
          }
          clock.stop()
          output.push({ kind: 'info', text: 'stopped' })
          break

        case 'clock':
          clock.setRate(command.rate)
          output.push({
            kind: 'info',
            text: `clock set to ${command.rate === 'max' ? 'max' : `${command.rate} steps/s`}`,
          })
          break

        case 'step': {
          clock.stop()
          const current = machineRef.current
          if (current === null) {
            output.push({ kind: 'error', text: 'no machine — run asm first' })
            break
          }
          if (current.halted) {
            output.push({ kind: 'info', text: 'machine halted — reset to run again' })
            break
          }
          const next = step(current)
          setMachine(next)
          output.push({
            kind: 'info',
            text: next.halted
              ? 'halted'
              : `pc = 0x${next.registers[32].toString(16).padStart(8, '0')}`,
          })
          break
        }

        case 'reset':
          // The Clock is presentation state, not part of the Machine — its rate survives a reset.
          clock.stop()
          setMachine(null)
          setImage(null)
          output.push({ kind: 'info', text: 'machine destroyed — editor unlocked' })
          break

        case 'reg': {
          const current = machineRef.current
          if (current === null) {
            output.push({ kind: 'error', text: 'no machine — run asm first' })
            break
          }
          const index = registerIndex(command.name)
          if (index === null) {
            output.push({
              kind: 'error',
              text: `no register called "${command.name}" — try r0..r31, or pc, ir, er, fr, cr, ipc`,
            })
            break
          }
          output.push({ kind: 'info', text: formatRegister(index, current.registers[index]) })
          break
        }

        case 'mem': {
          const current = machineRef.current
          if (current === null) {
            output.push({ kind: 'error', text: 'no machine — run asm first' })
            break
          }
          const lines = formatMemoryDump(current.memory, command.start, command.count, command.unit)
          output.push(...lines.map((text) => ({ kind: 'info' as const, text })))
          break
        }

        case 'bad-usage':
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
    },
    [build, clock, setMachine],
  )

  const submit = useCallback(
    (input: string) => {
      const command = parseCommand(input)
      if (command.kind === 'empty') {
        return
      }

      const output: Omit<ConsoleLine, 'id'>[] = [{ kind: 'echo', text: `> ${input.trim()}` }]
      dispatch(command, output)
      append(output)
    },
    [append, dispatch],
  )

  return {
    source,
    machine,
    image,
    lines,
    running: clock.running,
    rate: clock.rate,
    editable: machine === null,
    setSource,
    submit,
  }
}

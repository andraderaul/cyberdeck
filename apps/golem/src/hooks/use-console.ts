// The impure shell. Owns `Source → Image → Machine` and nothing else — every decision it makes
// is delegated to a pure function in `src/golem/`.

import { useCallback, useRef, useState } from 'react'
import { downloadText, outputFilename } from '../export/output'
import { assemble, type Image } from '../golem/assembler'
import { type Command, parseCommand } from '../golem/command'
import { GREETING, helpFor, helpLines } from '../golem/help'
import { formatMemoryDump, formatRegister } from '../golem/inspect'
import { registerIndex } from '../golem/isa'
import { createMachine, type Machine, step } from '../golem/machine'
import { encode } from '../golem/share'
import { formatHex, formatStep, TRACE_END, TRACE_START } from '../golem/trace'
import { type ClockRate, useClock } from './use-clock'
import { saveSource } from './use-source-loading'

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
  /** Commands already entered, oldest first — the Console walks these with the arrow keys. */
  history: string[]
  /**
   * The editor is writable exactly while no Machine exists. Divergence between the source on
   * screen and the code executing is impossible by construction, not prevented by syncing.
   */
  editable: boolean
  setSource: (source: string) => void
  /** Replaces the Source wholesale — used when a share link or saved work resolves. */
  replaceSource: (source: string) => void
  /** Writes a line to the Console without it having been typed. */
  note: (text: string, kind?: 'info' | 'error') => void
  submit: (input: string) => void
}

// All five reference programs run in under 400 instructions; this is generous enough that a real
// program is never truncated, and bounded so `clock max` on an endless loop cannot exhaust memory.
const TRACE_LIMIT = 100_000

/** Frames the recorded lines the way the reference emulator frames a run, so the two can diff. */
function wrapTrace(lines: string[]): string {
  const body =
    lines.length < TRACE_LIMIT ? lines : [...lines, `[TRACE TRUNCATED AT ${TRACE_LIMIT}]`]
  return [TRACE_START, ...body, TRACE_END].join('\n')
}

/**
 * Builds the share URL and puts it on the clipboard, reporting either way. The URL is printed
 * whether or not the copy works, so a browser that blocks clipboard access still leaves something
 * to select by hand.
 */
async function shareSource(
  source: string,
  append: (entries: Omit<ConsoleLine, 'id'>[]) => void,
): Promise<void> {
  try {
    const fragment = await encode(source)
    const url = `${window.location.origin}${window.location.pathname}#${fragment}`
    window.history.replaceState(null, '', `#${fragment}`)

    let copied = false
    try {
      await navigator.clipboard.writeText(url)
      copied = true
    } catch {
      // Clipboard blocked, or no permission — the URL below is still usable.
    }

    append([
      { kind: 'info', text: copied ? 'link copied to the clipboard:' : 'link (copy it by hand):' },
      { kind: 'info', text: url },
    ])
  } catch {
    append([{ kind: 'error', text: 'could not build a share link for this program' }])
  }
}

export function useConsole(initialSource: string): ConsoleState {
  const [source, setSourceState] = useState(initialSource)
  const [machine, setMachineState] = useState<Machine | null>(null)
  const [image, setImage] = useState<Image | null>(null)
  const [lines, setLines] = useState<ConsoleLine[]>([{ id: 0, kind: 'info', text: GREETING }])

  // The clock steps far faster than React should re-render, so the ref is the machine of record
  // and the state is a mirror for the panels. React batches the mirror updates within a frame.
  const machineRef = useRef<Machine | null>(null)

  // Formatted as it happens rather than by retaining every intermediate Machine: each one carries
  // a full memory array, so keeping them would cost megabytes a second under `clock max`.
  const traceRef = useRef<string[]>([])
  const imageRef = useRef<Image | null>(null)

  // What the operator has typed, oldest first — `step`, `reg r1`, `step` is the real rhythm here.
  const historyRef = useRef<string[]>([])
  const [history, setHistory] = useState<string[]>([])

  const setMachine = useCallback((next: Machine | null) => {
    machineRef.current = next
    setMachineState(next)
  }, [])

  /** Advances one instruction and records the trace line for it. */
  const stepRecording = useCallback(
    (current: Machine): Machine => {
      const next = step(current)
      if (traceRef.current.length < TRACE_LIMIT) {
        traceRef.current.push(formatStep(current, next))
      }
      setMachine(next)
      return next
    },
    [setMachine],
  )

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
    return !stepRecording(current).halted
  }, [stepRecording])

  const clock = useClock(advance)

  const setSource = useCallback((next: string) => {
    // Guarded rather than merely disabled in the DOM: the lock is the invariant, not the styling.
    if (machineRef.current !== null) {
      return
    }
    setSourceState(next)
    saveSource(next)
  }, [])

  // A Source arriving from a share link or from storage lands after the first render, since
  // decoding is asynchronous.
  const replaceSource = useCallback((next: string) => {
    setSourceState(next)
  }, [])

  const note = useCallback(
    (text: string, kind: 'info' | 'error' = 'info') => append([{ kind, text }]),
    [append],
  )

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

      imageRef.current = result.image
      traceRef.current = []
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
          const next = stepRecording(current)
          output.push({
            kind: 'info',
            text: next.halted
              ? 'halted'
              : `pc = 0x${next.registers[32].toString(16).padStart(8, '0')}`,
          })
          break
        }

        case 'export': {
          if (command.what === 'hex') {
            const current = imageRef.current
            if (current === null) {
              output.push({ kind: 'error', text: 'no image — run asm first' })
              break
            }
            const filename = outputFilename('hex-export')
            downloadText(filename, formatHex(current.words))
            output.push({ kind: 'info', text: `wrote ${filename}` })
            break
          }

          if (machineRef.current === null) {
            output.push({ kind: 'error', text: 'no machine — run asm first' })
            break
          }
          const filename = outputFilename('trace-export')
          downloadText(filename, `${wrapTrace(traceRef.current)}\n`)
          output.push({
            kind: 'info',
            text: `wrote ${filename} — ${traceRef.current.length} instructions`,
          })
          break
        }

        case 'reset':
          // The Clock is presentation state, not part of the Machine — its rate survives a reset.
          clock.stop()
          imageRef.current = null
          traceRef.current = []
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

        // Asynchronous, so it appends its own line when the codec finishes rather than joining
        // this command's output.
        case 'share':
          void shareSource(source, append)
          break

        case 'help':
          output.push(
            ...(command.topic === null ? helpLines() : helpFor(command.topic)).map((text) => ({
              kind: 'info' as const,
              text,
            })),
          )
          break

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
    [append, build, clock, setMachine, source, stepRecording],
  )

  const submit = useCallback(
    (input: string) => {
      const command = parseCommand(input)
      if (command.kind === 'empty') {
        return
      }

      historyRef.current = [
        ...historyRef.current.filter((entry) => entry !== input.trim()),
        input.trim(),
      ]
      setHistory(historyRef.current)

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
    history,
    running: clock.running,
    rate: clock.rate,
    editable: machine === null,
    setSource,
    replaceSource,
    note,
    submit,
  }
}

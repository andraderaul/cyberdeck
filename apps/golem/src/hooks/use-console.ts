// The impure shell. Holds the model in a ref (the clock steps far faster than React should
// re-render, so the ref is the machine of record and the state is a mirror for the panels), drives
// the clock, accumulates the trace, and runs the Effects the pure reducer returns. Every decision
// it makes is delegated to `console-reducer.ts` — this file owns nothing but the impurity.

import { useCallback, useRef, useState } from 'react'
import { downloadText } from '../export/output'
import type { Image } from '../golem/assembler'
import type { CacheAccess } from '../golem/cache'
import { parseCommand } from '../golem/command'
import {
  advanceOnce,
  type ClockRate,
  type ConsoleEntry,
  type ConsoleModel,
  type Effect,
  lineOfPc,
  reduceCommand,
  TRACE_LIMIT,
  wrapTrace,
} from '../golem/console-reducer'
import { GREETING, helpLines } from '../golem/help'
import type { Machine } from '../golem/machine'
import { encode } from '../golem/share'
import { useClock } from './use-clock'
import { clearShareFragment, saveSource } from './use-source-loading'

/** A line in the Console log. `echo` is what the operator typed, the rest is the tool answering. */
export interface ConsoleLine extends ConsoleEntry {
  id: number
}

export interface ConsoleState {
  source: string
  machine: Machine | null
  image: Image | null
  lines: ConsoleLine[]
  running: boolean
  rate: ClockRate
  /** The access the CACHE panel foregrounds — the last Step's data access, or its fetch. */
  cacheSpotlight: CacheAccess | null
  /** Commands already entered, oldest first — the Console walks these with the arrow keys. */
  history: string[]
  /** Source lines carrying a breakpoint. Presentation state: they outlive the Machine. */
  breakpoints: ReadonlySet<number>
  /** The source line the PC currently sits on, or null when nothing is loaded. */
  currentLine: number | null
  /**
   * The editor is writable exactly while no Machine exists. Divergence between the source on screen
   * and the code executing is impossible by construction, not prevented by syncing.
   */
  editable: boolean
  setSource: (source: string) => void
  /** Replaces the Source wholesale — used when a share link or saved work resolves. */
  replaceSource: (source: string) => void
  /** Writes a line to the Console without it having been typed. */
  note: (text: string, kind?: 'info' | 'error') => void
  submit: (input: string) => void
}

/**
 * Builds the share URL and puts it on the clipboard, reporting either way. The URL is printed
 * whether or not the copy works, so a browser that blocks clipboard access still leaves something
 * to select by hand.
 */
async function shareSource(
  source: string,
  append: (entries: ConsoleEntry[]) => void,
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
  const modelRef = useRef<ConsoleModel>({
    source: initialSource,
    machine: null,
    image: null,
    cacheMode: true,
    pendingLoad: null,
    breakpoints: new Set(),
    pausedPc: null,
    cacheSpotlight: null,
  })
  const [model, setModelState] = useState<ConsoleModel>(() => modelRef.current)

  // The reference itself, not just a pointer to it: the Console is the only control grammar, so a
  // visitor has to be able to discover the commands without going looking (#140, PRD story 2).
  const [lines, setLines] = useState<ConsoleLine[]>(() =>
    [GREETING, ...helpLines()].map((text, id) => ({ id, kind: 'info' as const, text })),
  )

  // Formatted as it happens rather than by retaining every intermediate Machine: each carries a full
  // memory array, so keeping them would cost megabytes a second under `clock max`.
  const traceRef = useRef<string[]>([])

  // What the operator has typed, oldest first — `step`, `reg r1`, `step` is the real rhythm here.
  const historyRef = useRef<string[]>([])
  const [history, setHistory] = useState<string[]>([])

  const setModel = useCallback((next: ConsoleModel) => {
    modelRef.current = next
    setModelState(next)
  }, [])

  const append = useCallback((entries: ConsoleEntry[]) => {
    if (entries.length === 0) {
      return
    }
    setLines((previous) => [
      ...previous,
      ...entries.map((entry, offset) => ({ ...entry, id: previous.length + offset })),
    ])
  }, [])

  const pushTrace = useCallback((delta: readonly string[]) => {
    for (const line of delta) {
      if (traceRef.current.length < TRACE_LIMIT) {
        traceRef.current.push(line)
      }
    }
  }, [])

  // One instruction. Returns false when there is nothing left to run, which stops the clock. The
  // pure decision — breakpoint, resume-skip, halt — lives in `advanceOnce`; this only applies it.
  const advance = useCallback((): boolean => {
    const result = advanceOnce(modelRef.current)
    if (result.kind === 'idle') {
      return false
    }
    setModel(result.model)
    append(result.lines)
    if (result.kind === 'stepped' || result.kind === 'halted') {
      pushTrace(result.trace)
    }
    return result.kind === 'stepped'
  }, [append, pushTrace, setModel])

  const clock = useClock(advance)

  const runEffects = useCallback(
    (effects: readonly Effect[]) => {
      for (const effect of effects) {
        switch (effect.kind) {
          case 'start-clock':
            clock.start()
            break
          case 'stop-clock':
            clock.stop()
            break
          case 'set-rate':
            clock.setRate(effect.rate)
            break
          case 'download':
            downloadText(effect.filename, effect.text)
            break
          case 'export-trace': {
            // The reducer only emits this with a Machine alive, so its terminal and cache are here.
            const machine = modelRef.current.machine
            downloadText(
              effect.filename,
              `${wrapTrace(traceRef.current, machine?.terminal ?? '', machine?.cache)}\n`,
            )
            break
          }
          case 'share':
            void shareSource(effect.source, append)
            break
          case 'persist-source':
            saveSource(effect.source)
            clearShareFragment()
            break
          case 'reset-trace':
            traceRef.current = []
            break
        }
      }
    },
    [append, clock],
  )

  const setSource = useCallback(
    (next: string) => {
      // Guarded rather than merely disabled in the DOM: the lock is the invariant, not the styling.
      if (modelRef.current.machine !== null) {
        return
      }
      setModel({ ...modelRef.current, source: next })
      saveSource(next)
      clearShareFragment()
    },
    [setModel],
  )

  // A Source arriving from a share link or from storage lands after the first render, since decoding
  // is asynchronous.
  const replaceSource = useCallback(
    (next: string) => {
      setModel({ ...modelRef.current, source: next })
    },
    [setModel],
  )

  const note = useCallback(
    (text: string, kind: 'info' | 'error' = 'info') => append([{ kind, text }]),
    [append],
  )

  const submit = useCallback(
    (input: string) => {
      const command = parseCommand(input)
      if (command.kind === 'empty') {
        return
      }

      const entry = input.trim()
      historyRef.current = [...historyRef.current.filter((item) => item !== entry), entry]
      setHistory(historyRef.current)

      const result = reduceCommand(modelRef.current, command, {
        running: clock.running,
        rate: clock.rate,
        traceLength: traceRef.current.length,
        initialSource,
      })
      setModel(result.model)
      append([{ kind: 'echo', text: `> ${entry}` }, ...result.lines])
      pushTrace(result.trace)
      runEffects(result.effects)
    },
    [append, clock, initialSource, pushTrace, runEffects, setModel],
  )

  return {
    source: model.source,
    machine: model.machine,
    image: model.image,
    lines,
    history,
    breakpoints: model.breakpoints,
    currentLine: lineOfPc(model.machine, model.image),
    running: clock.running,
    rate: clock.rate,
    cacheSpotlight: model.cacheSpotlight,
    editable: model.machine === null,
    setSource,
    replaceSource,
    note,
    submit,
  }
}

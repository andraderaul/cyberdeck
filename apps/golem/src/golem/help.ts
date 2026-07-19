// The command reference. With no buttons to click (ADR 0018), discoverability is paid for
// explicitly, and this is where that debt is settled: `help` is the Console's first line, and
// `help <command>` explains one.

import { COMMAND_NAMES } from './command'

interface Entry {
  usage: string
  summary: string
  /** The longer explanation `help <command>` adds — omitted where the summary says it all. */
  detail?: string
}

const HELP: Record<(typeof COMMAND_NAMES)[number], Entry> = {
  asm: {
    usage: 'asm',
    summary: 'assemble the Source and create a Machine',
    detail:
      'Freezes the Source and locks the editor: from here on, the code you are watching is the code that is running. `reset` gives editing back.',
  },
  run: {
    usage: 'run',
    summary: 'execute continuously at the current clock rate',
    detail:
      'Assembles first if there is no Machine yet. Runs until `int 0`, a breakpoint, or `stop`.',
  },
  stop: {
    usage: 'stop',
    summary: 'pause a run',
    detail:
      'Always lands, including on a program that never terminates — the clock yields to the browser between frames.',
  },
  step: {
    usage: 'step',
    summary: 'execute exactly one instruction',
    detail:
      'Stops a run first, so `step` after `run` advances a single instruction from where it paused.',
  },
  clock: {
    usage: 'clock <steps per second | max>',
    summary: 'set the execution rate',
    detail:
      'The default is slow enough to follow by eye. `clock max` runs as fast as the frame budget allows. The rate survives `reset`.',
  },
  reg: {
    usage: 'reg <name>',
    summary: 'print one register, in hex and decimal',
    detail: 'Takes r0..r31 or a special register: pc, ir, er, fr, cr, ipc.',
  },
  mem: {
    usage: 'mem <start> [count] [words|bytes]',
    summary: 'dump a range of memory',
    detail:
      'Defaults to 8 words. A byte dump carries an ASCII gutter, which makes a string in memory legible: `mem 60 16 bytes`.',
  },
  export: {
    usage: 'export <hex|trace>',
    summary: 'download the assembled Image, or the execution log',
    detail:
      'The hex runs in another implementation of this ISA; the trace can be diffed against a reference emulator.',
  },
  share: {
    usage: 'share',
    summary: 'produce a link containing this program',
    detail:
      'The program is compressed into the URL fragment and never leaves your browser. Opening the link loads it ready to run.',
  },
  reset: {
    usage: 'reset',
    summary: 'destroy the Machine and unlock the editor',
    detail: 'Breakpoints and the clock rate survive; the Machine and its Terminal do not.',
  },
  help: {
    usage: 'help [command]',
    summary: 'this list, or one command in detail',
  },
}

/** The one-line prompt shown on first render — the whole point is that it names `help`. */
export const GREETING = 'GOLEM ready. Type `help` for commands, or `run` to watch the example.'

/** The full reference, one command per line. */
export function helpLines(): string[] {
  const width = Math.max(...COMMAND_NAMES.map((name) => HELP[name].usage.length))

  return [
    'commands:',
    ...COMMAND_NAMES.map((name) => `  ${HELP[name].usage.padEnd(width)}  ${HELP[name].summary}`),
    '',
    'try `help <command>` for one of them in detail.',
  ]
}

/**
 * The detail for a single command, or a nudge when the name is not one. Returns lines rather than
 * a blob so the Console renders each on its own row.
 */
export function helpFor(name: string): string[] {
  const entry = HELP[name as (typeof COMMAND_NAMES)[number]]
  if (!entry) {
    return [`no command called "${name}" — type \`help\` for the list.`]
  }

  return [entry.usage, `  ${entry.summary}.`, ...(entry.detail ? [`  ${entry.detail}`] : [])]
}

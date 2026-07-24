// The whole Console grammar. Pure text → typed union; the component dispatches and never parses.
// The Console is the only control grammar on this program (ADR 0018), so this is the entire
// control surface.

import type { MemoryUnit } from './inspect'

export type Command =
  | { kind: 'asm' }
  | { kind: 'step' }
  | { kind: 'reset' }
  | { kind: 'run' }
  | { kind: 'stop' }
  | { kind: 'clock'; rate: number | 'max' }
  | { kind: 'reg'; name: string }
  | { kind: 'mem'; start: number; count: number; unit: MemoryUnit }
  | { kind: 'export'; what: 'hex' | 'trace' }
  /** `null` when unargued, which lists the available programs rather than failing. */
  | { kind: 'load'; name: string | null }
  | { kind: 'share' }
  | { kind: 'help'; topic: string | null }
  | { kind: 'break'; line: number }
  | { kind: 'breaks' }
  | { kind: 'unbreak'; line: number | 'all' }
  | { kind: 'empty' }
  | { kind: 'unknown'; input: string; suggestion: string | null }
  | { kind: 'bad-usage'; name: string; message: string }

/** Every command name, in the order `help` should list them. */
export const COMMAND_NAMES = [
  'asm',
  'run',
  'stop',
  'step',
  'clock',
  'reg',
  'mem',
  'export',
  'load',
  'share',
  'break',
  'breaks',
  'unbreak',
  'reset',
  'help',
] as const

const NO_ARGUMENT_COMMANDS = ['asm', 'step', 'reset', 'run', 'stop', 'share', 'breaks'] as const

const DEFAULT_DUMP_COUNT = 8
const MAX_DUMP_COUNT = 256

// Grammar-owned so the pure core never imports from the shell; the Clock driver just obeys what
// `clock N` was allowed to say.
export const MIN_RATE = 1
export const MAX_RATE = 10000

/**
 * Parses one Console line. Unknown input resolves to a suggestion rather than an error, so a
 * typo is a nudge instead of a dead end — the discoverability the Console has to pay for
 * explicitly, having no buttons.
 */
export function parseCommand(input: string): Command {
  const trimmed = input.trim()
  if (trimmed === '') {
    return { kind: 'empty' }
  }

  const [name, ...args] = trimmed.split(/\s+/)
  const lowered = name.toLowerCase()

  if ((NO_ARGUMENT_COMMANDS as readonly string[]).includes(lowered)) {
    if (args.length > 0) {
      return { kind: 'bad-usage', name: lowered, message: `"${lowered}" takes no arguments` }
    }
    return { kind: lowered as (typeof NO_ARGUMENT_COMMANDS)[number] }
  }

  if (lowered === 'clock') {
    return parseClock(args)
  }

  if (lowered === 'reg') {
    return parseReg(args)
  }

  if (lowered === 'mem') {
    return parseMem(args)
  }

  if (lowered === 'break') {
    const line = args.length === 1 ? parseAddress(args[0]) : null
    if (line === null || line < 1) {
      return { kind: 'bad-usage', name: 'break', message: 'usage: break <line>' }
    }
    return { kind: 'break', line }
  }

  if (lowered === 'unbreak') {
    if (args.length === 1 && args[0].toLowerCase() === 'all') {
      return { kind: 'unbreak', line: 'all' }
    }
    const line = args.length === 1 ? parseAddress(args[0]) : null
    if (line === null || line < 1) {
      return { kind: 'bad-usage', name: 'unbreak', message: 'usage: unbreak <line> | unbreak all' }
    }
    return { kind: 'unbreak', line }
  }

  if (lowered === 'help') {
    if (args.length > 1) {
      return { kind: 'bad-usage', name: 'help', message: 'usage: help [command]' }
    }
    return { kind: 'help', topic: args[0]?.toLowerCase() ?? null }
  }

  // `load` with no argument lists the names rather than erroring: an operator who does not know
  // what is on offer is the exact person typing it.
  if (lowered === 'load') {
    if (args.length > 1) {
      return { kind: 'bad-usage', name: 'load', message: 'usage: load [name]' }
    }
    return { kind: 'load', name: args[0]?.toLowerCase() ?? null }
  }

  if (lowered === 'export') {
    const what = args[0]?.toLowerCase()
    if (args.length !== 1 || (what !== 'hex' && what !== 'trace')) {
      return { kind: 'bad-usage', name: 'export', message: 'usage: export hex | export trace' }
    }
    return { kind: 'export', what }
  }

  return { kind: 'unknown', input: name, suggestion: nearest(lowered, COMMAND_NAMES) }
}

function parseReg(args: string[]): Command {
  if (args.length !== 1) {
    return { kind: 'bad-usage', name: 'reg', message: 'usage: reg <name>, e.g. reg r1 or reg pc' }
  }
  return { kind: 'reg', name: args[0].toLowerCase() }
}

// `mem <start> [count] [words|bytes]` — the unit is a trailing word rather than a flag, so the
// command reads as a sentence and needs no flag parsing to guess at.
function parseMem(args: string[]): Command {
  const usage = {
    kind: 'bad-usage' as const,
    name: 'mem',
    message: 'usage: mem <start> [count] [words|bytes], e.g. mem 0 16 bytes',
  }

  if (args.length === 0 || args.length > 3) {
    return usage
  }

  let unit: MemoryUnit = 'words'
  const rest = [...args]
  const last = rest[rest.length - 1]?.toLowerCase()
  if (last === 'words' || last === 'bytes') {
    unit = last
    rest.pop()
  }

  if (rest.length === 0 || rest.length > 2) {
    return usage
  }

  const start = parseAddress(rest[0])
  if (start === null) {
    return usage
  }

  const count = rest.length === 2 ? parseAddress(rest[1]) : DEFAULT_DUMP_COUNT
  if (count === null || count < 1 || count > MAX_DUMP_COUNT) {
    return {
      kind: 'bad-usage',
      name: 'mem',
      message: `count must be between 1 and ${MAX_DUMP_COUNT}`,
    }
  }

  return { kind: 'mem', start, count, unit }
}

function parseAddress(text: string): number | null {
  const value = /^0x[0-9a-f]+$/i.test(text) ? Number.parseInt(text, 16) : Number(text)
  return Number.isInteger(value) && value >= 0 ? value : null
}

function parseClock(args: string[]): Command {
  if (args.length !== 1) {
    return { kind: 'bad-usage', name: 'clock', message: 'usage: clock <steps per second | max>' }
  }

  if (args[0].toLowerCase() === 'max') {
    return { kind: 'clock', rate: 'max' }
  }

  const rate = Number(args[0])
  if (!Number.isInteger(rate) || rate < MIN_RATE || rate > MAX_RATE) {
    return {
      kind: 'bad-usage',
      name: 'clock',
      message: `clock takes a whole number of steps per second (${MIN_RATE}..${MAX_RATE}) or "max"`,
    }
  }

  return { kind: 'clock', rate }
}

/**
 * The closest of `candidates` within a small edit distance, or `null` when nothing is close
 * enough to be worth guessing at. The threshold scales with length so `stp`→`step` suggests but
 * a word sharing a couple of letters does not. One function for commands and program names both,
 * rather than two subtly different notions of "close enough".
 */
export function nearest(input: string, candidates: readonly string[]): string | null {
  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const name of candidates) {
    const distance = editDistance(input, name)
    if (distance < bestDistance) {
      best = name
      bestDistance = distance
    }
  }

  const threshold = Math.max(2, Math.floor(Math.max(input.length, 1) / 2))
  return bestDistance <= threshold ? best : null
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    previous = current
  }

  return previous[b.length]
}

// The whole Console grammar. Pure text → typed union; the component dispatches and never parses.
// The Console is the only control grammar on this program (ADR 0018), so this is the entire
// control surface.

import { MAX_RATE, MIN_RATE } from '../hooks/use-clock'

export type Command =
  | { kind: 'asm' }
  | { kind: 'step' }
  | { kind: 'reset' }
  | { kind: 'run' }
  | { kind: 'stop' }
  | { kind: 'clock'; rate: number | 'max' }
  | { kind: 'empty' }
  | { kind: 'unknown'; input: string; suggestion: string | null }
  | { kind: 'bad-usage'; name: string; message: string }

/** Every command name, in the order `help` should list them. */
export const COMMAND_NAMES = ['asm', 'run', 'stop', 'step', 'clock', 'reset'] as const

const NO_ARGUMENT_COMMANDS = ['asm', 'step', 'reset', 'run', 'stop'] as const

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

  return { kind: 'unknown', input: name, suggestion: nearestCommand(lowered) }
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
 * The closest command name within a small edit distance, or `null` when nothing is close enough
 * to be worth guessing at. The threshold scales with length so `stp`→`step` suggests but a word
 * sharing a couple of letters does not.
 */
export function nearestCommand(input: string): string | null {
  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const name of COMMAND_NAMES) {
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

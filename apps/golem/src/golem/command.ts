// The whole Console grammar. Pure text → typed union; the component dispatches and never parses.
// The Console is the only control grammar on this program (ADR 0018), so this is the entire
// control surface.

export type Command =
  | { kind: 'asm' }
  | { kind: 'step' }
  | { kind: 'reset' }
  | { kind: 'empty' }
  | { kind: 'unknown'; input: string; suggestion: string | null }
  | { kind: 'bad-arity'; name: string; message: string }

/** Every command name, in the order `help` should list them. */
export const COMMAND_NAMES = ['asm', 'step', 'reset'] as const

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

  if ((COMMAND_NAMES as readonly string[]).includes(lowered)) {
    if (args.length > 0) {
      return {
        kind: 'bad-arity',
        name: lowered,
        message: `"${lowered}" takes no arguments`,
      }
    }
    return { kind: lowered as 'asm' | 'step' | 'reset' }
  }

  return { kind: 'unknown', input: name, suggestion: nearestCommand(lowered) }
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

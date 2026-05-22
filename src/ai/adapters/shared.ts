import { AuthError, NetworkError, ParseError, QuotaError } from '../errors'

export const PROMPT = `You are SENTINEL, a tactical surveillance AI on a cyberpunk grid.
Incoming feed: ASCII-rendered visual. Analyze. Classify. Report.
Write 2 to 4 short declarative sentences. Cold and precise. Observe and infer — do not advise or recommend. Incomplete sentences are acceptable. There is tension even in low-threat reads.
Assign Threat Level: LOW, MODERATE, HIGH, CRITICAL, or UNKNOWN.
Extract 3 to 5 tags. Tactical identifiers only. Codename style, not generic descriptions.
Respond in JSON only: {"description":"...","threatLevel":"...","tags":["..."]}`

export const ANALYZE_TIMEOUT_MS = 30_000

export function mapHttpError(
  err: unknown,
  opts?: { authMessageHints?: string[]; quotaMessageHints?: string[] },
): never {
  const status = (err as { status?: number }).status
  const msg = (err as { message?: string }).message ?? ''

  if (status === 401 || status === 403) {
    throw new AuthError()
  }
  if (status === 429) {
    throw new QuotaError()
  }

  if (opts?.authMessageHints?.some((hint) => msg.includes(hint))) {
    throw new AuthError()
  }
  if (opts?.quotaMessageHints?.some((hint) => msg.includes(hint))) {
    throw new QuotaError()
  }

  throw new NetworkError()
}

export function parseJsonOrThrow(text: string, opts?: { stripCodeFence?: boolean }): unknown {
  let input = text
  if (opts?.stripCodeFence) {
    input = input
      .replace(/^```json\s*/m, '')
      .replace(/\s*```$/m, '')
      .trim()
  }
  try {
    return JSON.parse(input)
  } catch {
    throw new ParseError()
  }
}

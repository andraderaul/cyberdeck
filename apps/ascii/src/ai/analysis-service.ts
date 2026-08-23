import { AuthError, NetworkError, ParseError, QuotaError } from './errors'
import { readSuggestion } from './suggestion'
import type {
  AIConfig,
  AIProvider,
  AIProviderName,
  Analysis,
  AnalysisState,
  ThreatLevel,
} from './types'

export type AnalysisOutcome = { ok: Analysis } | { error: unknown }

/**
 * Maps a settled outcome to a terminal AnalysisState (everything but `loading`) — keeps the decision
 * out of the async App callback, mirroring the render pipeline's pure/impure split (ADR 0005).
 */
export function toAnalysisState(outcome: AnalysisOutcome): AnalysisState {
  if ('ok' in outcome) {
    return { status: 'success', analysis: outcome.ok }
  }
  const { error } = outcome
  if (error instanceof AuthError) {
    return { status: 'auth-error' }
  }
  if (error instanceof QuotaError) {
    return { status: 'quota-error' }
  }
  if (error instanceof NetworkError) {
    return { status: 'network-error' }
  }
  return { status: 'parse-error' }
}

const THREAT_LEVELS: ThreatLevel[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'UNKNOWN']

function validate(data: unknown): Analysis {
  if (typeof data !== 'object' || data === null) {
    throw new ParseError('not an object')
  }
  const raw = data as Record<string, unknown>
  if (typeof raw.description !== 'string') {
    throw new ParseError('description')
  }
  if (!THREAT_LEVELS.includes(raw.threatLevel as ThreatLevel)) {
    throw new ParseError('threatLevel')
  }
  if (!Array.isArray(raw.tags) || !raw.tags.every((t) => typeof t === 'string')) {
    throw new ParseError('tags')
  }

  // The prose survives a suggestion the reader can't take. Both halves come from one call the user
  // paid for with their own key, and the only *new* loss a shared failure would introduce is a good
  // description thrown away over one out-of-range float — recovering it costs a second call. A
  // truncated reply still takes everything, but that happens at `JSON.parse`, upstream of here.
  const read = readSuggestion(raw.suggestion)
  if (!read.ok) {
    // The one place the reason surfaces. Nothing user-facing — the panel is simply absent — but a
    // silent drop is exactly the failure a bug report can't describe, and prompt-versus-reader
    // drift is what will cause it.
    // biome-ignore lint/suspicious/noConsole: the only trace a silently dropped suggestion leaves
    console.warn(`[ascii] AI Provider suggestion ignored — ${read.reason}`)
  }

  // Rebuilt rather than cast through: the suggestion is the one field that goes on to *drive* the
  // converter, so what leaves here is the reader's own object and never the provider's, extra keys
  // and all.
  return {
    description: raw.description,
    threatLevel: raw.threatLevel as ThreatLevel,
    tags: raw.tags as string[],
    suggestion: read.ok ? read.suggestion : undefined,
  }
}

const ADAPTERS: Record<AIProviderName, (key: string) => Promise<AIProvider>> = {
  anthropic: async (key) => new (await import('./adapters/anthropic')).AnthropicAdapter(key),
  openai: async (key) => new (await import('./adapters/openai')).OpenAIAdapter(key),
  gemini: async (key) => new (await import('./adapters/gemini')).GeminiAdapter(key),
}

export async function analyzeCanvas(dataUrl: string, config: AIConfig): Promise<Analysis> {
  const base64 = dataUrl.split(',')[1]
  const adapter = await ADAPTERS[config.provider](config.key)
  try {
    const raw = await adapter.analyze(base64)
    return validate(raw)
  } catch (err) {
    if (
      err instanceof AuthError ||
      err instanceof QuotaError ||
      err instanceof NetworkError ||
      err instanceof ParseError
    ) {
      throw err
    }
    throw new ParseError()
  }
}

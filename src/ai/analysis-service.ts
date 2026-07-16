import { AuthError, NetworkError, ParseError, QuotaError } from './errors'
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
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as Record<string, unknown>).description !== 'string' ||
    !THREAT_LEVELS.includes((data as Record<string, unknown>).threatLevel as ThreatLevel) ||
    !Array.isArray((data as Record<string, unknown>).tags) ||
    !(data as Record<string, unknown[]>).tags.every((t) => typeof t === 'string')
  ) {
    throw new ParseError()
  }
  return data as Analysis
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

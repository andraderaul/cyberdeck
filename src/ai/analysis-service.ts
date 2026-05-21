import { ParseError } from './errors'
import type { AIConfig, AIProviderName, Analysis, ThreatLevel } from './types'

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

const ADAPTERS: Record<
  AIProviderName,
  (key: string) => Promise<{ analyze: (b64: string) => Promise<unknown> }>
> = {
  anthropic: async (key) => new (await import('./adapters/anthropic')).AnthropicAdapter(key),
  openai: async (key) => new (await import('./adapters/openai')).OpenAIAdapter(key),
  gemini: async (key) => new (await import('./adapters/gemini')).GeminiAdapter(key),
}

export async function analyzeCanvas(dataUrl: string, config: AIConfig): Promise<Analysis> {
  const base64 = dataUrl.split(',')[1]
  const adapter = await ADAPTERS[config.provider](config.key)
  const raw = await adapter.analyze(base64)
  return validate(raw)
}

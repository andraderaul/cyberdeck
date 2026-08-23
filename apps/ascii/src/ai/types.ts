import type { ConversionSettings } from '../ascii/types'

export type AIProviderName = 'anthropic' | 'openai' | 'gemini'

export interface AIConfig {
  provider: AIProviderName
  key: string
}

export type ThreatLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'

export interface Analysis {
  description: string
  threatLevel: ThreatLevel
  tags: string[]
  /**
   * The ConversionSettings the Provider proposes for this image. Part of the Analysis rather than
   * the result of a second act: the user pays for the round trip with their own key, so describing
   * and suggesting ride one request (issue #308). Never applied on arrival — `App` waits to be
   * asked.
   */
  suggestion: ConversionSettings
}

/**
 * One act, and it now returns two things: the prose and the `suggestion` beside it. The return
 * stays `unknown` on purpose — an adapter carries a provider's reply across the wire and maps its
 * failures, and nothing more; the single place that reply becomes domain values is
 * `analysis-service`'s validation (see `suggestion.ts` on where the trust boundary sits and why it
 * is not here, three times over).
 */
export interface AIProvider {
  analyze(imageBase64: string): Promise<unknown>
}

export type AnalysisState =
  | { status: 'loading' }
  | { status: 'success'; analysis: Analysis }
  | { status: 'auth-error' }
  | { status: 'parse-error' }
  | { status: 'quota-error' }
  | { status: 'network-error' }

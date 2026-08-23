import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider } from '../types'
import {
  ANALYZE_MAX_TOKENS,
  ANALYZE_TIMEOUT_MS,
  mapHttpError,
  PROMPT,
  parseJsonOrThrow,
} from './shared'

export class GeminiAdapter implements AIProvider {
  private genAI: GoogleGenerativeAI

  constructor(key: string) {
    // Gemini SDK has no dangerouslyAllowBrowser flag; key stays in localStorage, never hits our servers — see ADR 0003
    this.genAI = new GoogleGenerativeAI(key)
  }

  async analyze(base64: string): Promise<unknown> {
    let text: string
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        // The same budget the other two pass, for the timeout rather than the cost: generation
        // time follows the token count, and ANALYZE_TIMEOUT_MS is fixed. Gemini's own default is
        // an order of magnitude higher, so uncapped it is the one adapter whose reply can outrun
        // the clock instead of being truncated by it.
        generationConfig: { maxOutputTokens: ANALYZE_MAX_TOKENS },
      })
      const result = await model.generateContent(
        [{ inlineData: { mimeType: 'image/png', data: base64 } }, PROMPT],
        { signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS) },
      )
      text = result.response.text()
    } catch (err) {
      mapHttpError(err, {
        authMessageHints: ['API_KEY_INVALID'],
        quotaMessageHints: ['RESOURCE_EXHAUSTED'],
      })
    }

    return parseJsonOrThrow(text, { stripCodeFence: true })
  }
}

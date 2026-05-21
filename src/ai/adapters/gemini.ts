import { GoogleGenerativeAI } from '@google/generative-ai'
import { ANALYZE_TIMEOUT_MS, mapHttpError, PROMPT, parseJsonOrThrow } from './shared'

export class GeminiAdapter {
  private genAI: GoogleGenerativeAI

  constructor(key: string) {
    // Gemini SDK has no dangerouslyAllowBrowser flag; key stays in localStorage, never hits our servers — see ADR 0003
    this.genAI = new GoogleGenerativeAI(key)
  }

  async analyze(base64: string): Promise<unknown> {
    let text: string
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
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

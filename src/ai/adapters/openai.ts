import OpenAI from 'openai'
import type { AIProvider } from '../types'
import { ANALYZE_TIMEOUT_MS, mapHttpError, PROMPT, parseJsonOrThrow } from './shared'

export class OpenAIAdapter implements AIProvider {
  private client: OpenAI

  constructor(key: string) {
    // dangerouslyAllowBrowser: user supplies their own key; it stays in localStorage, never hits our servers — see ADR 0003
    this.client = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true })
  }

  async analyze(base64: string): Promise<unknown> {
    let response: OpenAI.Chat.ChatCompletion
    try {
      response = await this.client.chat.completions.create(
        {
          model: 'gpt-4o',
          max_tokens: 256,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:image/png;base64,${base64}` },
                },
                { type: 'text', text: PROMPT },
              ],
            },
          ],
        },
        { signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS) },
      )
    } catch (err) {
      mapHttpError(err)
    }

    const text = response.choices[0]?.message?.content ?? ''
    return parseJsonOrThrow(text)
  }
}

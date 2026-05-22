import Anthropic from '@anthropic-ai/sdk'
import { ANALYZE_TIMEOUT_MS, mapHttpError, PROMPT, parseJsonOrThrow } from './shared'

export class AnthropicAdapter {
  private client: Anthropic

  constructor(key: string) {
    // dangerouslyAllowBrowser: user supplies their own key; it stays in localStorage, never hits our servers — see ADR 0003
    this.client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })
  }

  async analyze(base64: string): Promise<unknown> {
    let response: Anthropic.Message
    try {
      response = await this.client.messages.create(
        {
          model: 'claude-opus-4-7',
          max_tokens: 256,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: 'image/png', data: base64 },
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

    const block = response.content[0]
    const text = block.type === 'text' ? block.text : ''
    return parseJsonOrThrow(text)
  }
}

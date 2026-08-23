import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError, NetworkError, ParseError, QuotaError } from '../errors'
import { AnthropicAdapter } from './anthropic'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

function makeAdapter() {
  return new AnthropicAdapter('test-key')
}

// The suggestion rides the same reply as the prose now (issue #308), so what this adapter has to
// carry across the wire is the whole object — a payload without it would prove only the old half.
const SUGGESTION = {
  charset: 'braille',
  colorMode: 'neon',
  edgeGlyphs: true,
  dithering: 'bayer',
  resolution: 10,
  brightness: 1.15,
  contrast: 1.4,
}

function successResponse(json: object) {
  return { content: [{ type: 'text', text: JSON.stringify(json) }] }
}

describe('AnthropicAdapter', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('returns parsed JSON on successful response', async () => {
    const payload = { description: 'test', threatLevel: 'LOW', tags: ['a'], suggestion: SUGGESTION }
    mockCreate.mockResolvedValueOnce(successResponse(payload))

    const result = await makeAdapter().analyze('base64data')

    expect(result).toEqual(payload)
  })

  it('throws AuthError on status 401', async () => {
    mockCreate.mockRejectedValueOnce({ status: 401 })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(AuthError)
  })

  it('throws AuthError on status 403', async () => {
    mockCreate.mockRejectedValueOnce({ status: 403 })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(AuthError)
  })

  it('throws QuotaError on status 429', async () => {
    mockCreate.mockRejectedValueOnce({ status: 429 })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(QuotaError)
  })

  it('throws NetworkError on other error status codes', async () => {
    mockCreate.mockRejectedValueOnce({ status: 500 })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(NetworkError)
  })

  it('throws ParseError when content block is not text type', async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'image' }] })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(ParseError)
  })

  it('throws ParseError when response text is not valid JSON', async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json' }] })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(ParseError)
  })

  // The failure the bigger payload makes likelier: a reply cut at the token budget lands mid-object,
  // and mid-object is still just invalid JSON.
  it('throws ParseError when the reply is truncated mid-suggestion', async () => {
    const truncated =
      '{"description":"t","threatLevel":"LOW","tags":["a"],"suggestion":{"charset":"bra'
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: truncated }] })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(ParseError)
  })
})

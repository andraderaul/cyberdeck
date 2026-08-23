import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError, NetworkError, ParseError, QuotaError } from '../errors'
import { SUGGESTION_SKELETON } from '../suggestion'
import { GeminiAdapter } from './gemini'
import { ANALYZE_MAX_TOKENS } from './shared'

const mockGenerateContent = vi.fn()
const mockGetGenerativeModel = vi.fn(() => ({ generateContent: mockGenerateContent }))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}))

function makeAdapter() {
  return new GeminiAdapter('test-key')
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

function successResponse(text: string) {
  return { response: { text: () => text } }
}

describe('GeminiAdapter', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset()
    mockGetGenerativeModel.mockClear()
  })

  it('returns parsed JSON on successful response', async () => {
    const payload = { description: 'test', threatLevel: 'LOW', tags: ['a'], suggestion: SUGGESTION }
    mockGenerateContent.mockResolvedValueOnce(successResponse(JSON.stringify(payload)))

    const result = await makeAdapter().analyze('base64data')

    expect(result).toEqual(payload)
  })

  it('strips ```json markdown wrapper before parsing', async () => {
    const payload = {
      description: 'test',
      threatLevel: 'HIGH',
      tags: ['b'],
      suggestion: SUGGESTION,
    }
    const wrapped = `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``
    mockGenerateContent.mockResolvedValueOnce(successResponse(wrapped))

    const result = await makeAdapter().analyze('base64data')

    expect(result).toEqual(payload)
  })

  it('throws AuthError when error message includes API_KEY_INVALID', async () => {
    mockGenerateContent.mockRejectedValueOnce({ message: 'API_KEY_INVALID' })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(AuthError)
  })

  it('throws AuthError on status 401', async () => {
    mockGenerateContent.mockRejectedValueOnce({ status: 401 })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(AuthError)
  })

  it('throws AuthError on status 403', async () => {
    mockGenerateContent.mockRejectedValueOnce({ status: 403 })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(AuthError)
  })

  it('throws QuotaError on status 429', async () => {
    mockGenerateContent.mockRejectedValueOnce({ status: 429 })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(QuotaError)
  })

  it('throws QuotaError when error message includes RESOURCE_EXHAUSTED', async () => {
    mockGenerateContent.mockRejectedValueOnce({ message: 'RESOURCE_EXHAUSTED' })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(QuotaError)
  })

  it('throws NetworkError on other error status codes', async () => {
    mockGenerateContent.mockRejectedValueOnce({ status: 500 })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(NetworkError)
  })

  it('throws ParseError when response text is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce(successResponse('not json'))

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(ParseError)
  })

  // Documents the precedence decision: status code wins over message hints.
  // { status: 429, message: 'API_KEY_INVALID' } → QuotaError (not AuthError),
  // because status is checked before message hints in mapHttpError.
  it('status 429 takes precedence over API_KEY_INVALID message hint → QuotaError', async () => {
    mockGenerateContent.mockRejectedValueOnce({ status: 429, message: 'API_KEY_INVALID' })

    await expect(makeAdapter().analyze('base64data')).rejects.toBeInstanceOf(QuotaError)
  })

  // The request half of the contract: every test above would pass on an adapter that never asked
  // for a suggestion, and an ask that drifts from the reader is a reply dropped on arrival.
  it('asks for the suggestion, with the shared token budget to fit it', async () => {
    mockGenerateContent.mockResolvedValueOnce(successResponse(JSON.stringify({ ok: true })))

    await makeAdapter().analyze('base64data')

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({ generationConfig: { maxOutputTokens: ANALYZE_MAX_TOKENS } }),
    )
    expect(mockGenerateContent.mock.calls[0][0][1]).toContain(SUGGESTION_SKELETON)
  })
})

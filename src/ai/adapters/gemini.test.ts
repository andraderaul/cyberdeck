import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError, NetworkError, ParseError, QuotaError } from '../errors'
import { GeminiAdapter } from './gemini'

const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({ generateContent: mockGenerateContent }),
  })),
}))

function makeAdapter() {
  return new GeminiAdapter('test-key')
}

function successResponse(text: string) {
  return { response: { text: () => text } }
}

describe('GeminiAdapter', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset()
  })

  it('returns parsed JSON on successful response', async () => {
    const payload = { description: 'test', threatLevel: 'LOW', tags: ['a'] }
    mockGenerateContent.mockResolvedValueOnce(successResponse(JSON.stringify(payload)))

    const result = await makeAdapter().analyze('base64data')

    expect(result).toEqual(payload)
  })

  it('strips ```json markdown wrapper before parsing', async () => {
    const payload = { description: 'test', threatLevel: 'HIGH', tags: ['b'] }
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
})

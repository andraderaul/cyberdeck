import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeCanvas, toAnalysisState } from './analysis-service'
import { AuthError, NetworkError, ParseError, QuotaError } from './errors'
import type { Analysis } from './types'

const mockAnthropicAnalyze = vi.fn()
const mockOpenAIAnalyze = vi.fn()
const mockGeminiAnalyze = vi.fn()

vi.mock('./adapters/anthropic', () => ({
  AnthropicAdapter: vi.fn().mockImplementation(() => ({ analyze: mockAnthropicAnalyze })),
}))
vi.mock('./adapters/openai', () => ({
  OpenAIAdapter: vi.fn().mockImplementation(() => ({ analyze: mockOpenAIAnalyze })),
}))
vi.mock('./adapters/gemini', () => ({
  GeminiAdapter: vi.fn().mockImplementation(() => ({ analyze: mockGeminiAnalyze })),
}))

const DATA_URL = 'data:image/png;base64,abc123'
const VALID_SUGGESTION = {
  charset: 'braille',
  colorMode: 'neon',
  edgeGlyphs: true,
  dithering: 'bayer',
  resolution: 10,
  brightness: 1.15,
  contrast: 1.4,
}
const VALID_ANALYSIS = {
  description: 'scan complete',
  threatLevel: 'LOW',
  tags: ['alpha'],
  suggestion: VALID_SUGGESTION,
}

// Keyed by provider so each adapter is proven to reach the same validation, rather than the
// contract being taken on trust from whichever one the other tests happen to use.
const ANALYZE_MOCKS = {
  anthropic: mockAnthropicAnalyze,
  openai: mockOpenAIAnalyze,
  gemini: mockGeminiAnalyze,
} as const

function anthropicConfig() {
  return { provider: 'anthropic' as const, key: 'k' }
}

describe('analyzeCanvas', () => {
  beforeEach(() => {
    mockAnthropicAnalyze.mockReset()
    mockOpenAIAnalyze.mockReset()
    mockGeminiAnalyze.mockReset()
  })

  it('returns validated Analysis for anthropic provider', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce(VALID_ANALYSIS)

    const result = await analyzeCanvas(DATA_URL, anthropicConfig())

    expect(result).toEqual(VALID_ANALYSIS)
  })

  it('passes only the base64 portion of the dataUrl to the adapter', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce(VALID_ANALYSIS)

    await analyzeCanvas(DATA_URL, anthropicConfig())

    expect(mockAnthropicAnalyze).toHaveBeenCalledWith('abc123')
  })

  it('routes to OpenAIAdapter for openai provider', async () => {
    mockOpenAIAnalyze.mockResolvedValueOnce(VALID_ANALYSIS)

    const result = await analyzeCanvas(DATA_URL, { provider: 'openai', key: 'k' })

    expect(result).toEqual(VALID_ANALYSIS)
    expect(mockOpenAIAnalyze).toHaveBeenCalledWith('abc123')
  })

  it('routes to GeminiAdapter for gemini provider', async () => {
    mockGeminiAnalyze.mockResolvedValueOnce(VALID_ANALYSIS)

    const result = await analyzeCanvas(DATA_URL, { provider: 'gemini', key: 'k' })

    expect(result).toEqual(VALID_ANALYSIS)
    expect(mockGeminiAnalyze).toHaveBeenCalledWith('abc123')
  })

  it('throws ParseError when adapter returns null', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce(null)

    await expect(analyzeCanvas(DATA_URL, anthropicConfig())).rejects.toBeInstanceOf(ParseError)
  })

  it('throws ParseError when description is not a string', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce({ ...VALID_ANALYSIS, description: 42 })

    await expect(analyzeCanvas(DATA_URL, anthropicConfig())).rejects.toBeInstanceOf(ParseError)
  })

  it('throws ParseError when threatLevel is not a valid value', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce({ ...VALID_ANALYSIS, threatLevel: 'EXTREME' })

    await expect(analyzeCanvas(DATA_URL, anthropicConfig())).rejects.toBeInstanceOf(ParseError)
  })

  it('throws ParseError when tags is not an array', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce({ ...VALID_ANALYSIS, tags: 'alpha' })

    await expect(analyzeCanvas(DATA_URL, anthropicConfig())).rejects.toBeInstanceOf(ParseError)
  })

  it('throws ParseError when a tag is not a string', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce({ ...VALID_ANALYSIS, tags: [1, 2] })

    await expect(analyzeCanvas(DATA_URL, anthropicConfig())).rejects.toBeInstanceOf(ParseError)
  })

  it('throws ParseError when the suggestion is missing entirely', async () => {
    const { suggestion: _dropped, ...withoutSuggestion } = VALID_ANALYSIS
    mockAnthropicAnalyze.mockResolvedValueOnce(withoutSuggestion)

    await expect(analyzeCanvas(DATA_URL, anthropicConfig())).rejects.toBeInstanceOf(ParseError)
  })

  it('drops provider keys the Analysis does not name', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce({ ...VALID_ANALYSIS, confidence: 0.9 })

    const result = await analyzeCanvas(DATA_URL, anthropicConfig())

    expect(result).toEqual(VALID_ANALYSIS)
    expect(result).not.toHaveProperty('confidence')
  })

  it('propagates adapter errors without modification', async () => {
    const error = new AuthError()
    mockAnthropicAnalyze.mockRejectedValueOnce(error)

    await expect(analyzeCanvas(DATA_URL, anthropicConfig())).rejects.toBe(error)
  })
})

describe.each(['anthropic', 'openai', 'gemini'] as const)('%s suggestion', (provider) => {
  beforeEach(() => {
    ANALYZE_MOCKS[provider].mockReset()
  })

  it('carries a well-formed suggestion through to the Analysis', async () => {
    ANALYZE_MOCKS[provider].mockResolvedValueOnce(VALID_ANALYSIS)

    const result = await analyzeCanvas(DATA_URL, { provider, key: 'k' })

    expect(result.suggestion).toEqual(VALID_SUGGESTION)
  })

  it('throws ParseError when the suggestion names an unknown Charset', async () => {
    ANALYZE_MOCKS[provider].mockResolvedValueOnce({
      ...VALID_ANALYSIS,
      suggestion: { ...VALID_SUGGESTION, charset: 'dither' },
    })

    await expect(analyzeCanvas(DATA_URL, { provider, key: 'k' })).rejects.toBeInstanceOf(ParseError)
  })

  it('throws ParseError when the suggestion is partial', async () => {
    const { contrast: _dropped, ...partial } = VALID_SUGGESTION
    ANALYZE_MOCKS[provider].mockResolvedValueOnce({ ...VALID_ANALYSIS, suggestion: partial })

    await expect(analyzeCanvas(DATA_URL, { provider, key: 'k' })).rejects.toBeInstanceOf(ParseError)
  })
})

describe('toAnalysisState', () => {
  const analysis: Analysis = VALID_ANALYSIS as Analysis

  it('maps a successful outcome to the success state carrying the analysis', () => {
    expect(toAnalysisState({ ok: analysis })).toEqual({ status: 'success', analysis })
  })

  it.each([
    [new AuthError(), 'auth-error'],
    [new QuotaError(), 'quota-error'],
    [new NetworkError(), 'network-error'],
    [new ParseError(), 'parse-error'],
  ] as const)('maps %s to %s', (error, status) => {
    expect(toAnalysisState({ error })).toEqual({ status })
  })

  it('maps an unknown error to parse-error as the safety-net fallback', () => {
    expect(toAnalysisState({ error: new Error('boom') })).toEqual({ status: 'parse-error' })
    expect(toAnalysisState({ error: 'not even an Error' })).toEqual({ status: 'parse-error' })
  })
})

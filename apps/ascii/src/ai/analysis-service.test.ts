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

function anthropicConfig() {
  return { provider: 'anthropic' as const, key: 'k' }
}

describe('analyzeCanvas', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
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

  // The split the whole design turns on: the user paid for one call, and a description they can
  // read is not worth discarding over a float the reader won't take.
  it.each([
    ['it is missing entirely', undefined],
    ['it names an unknown Charset', { ...VALID_SUGGESTION, charset: 'dither' }],
    ['it is partial', { charset: 'braille' }],
    ['a number is out of range', { ...VALID_SUGGESTION, brightness: 99 }],
    ['it is not an object', 'use braille'],
  ])('keeps the prose and drops the suggestion when %s', async (_case, suggestion) => {
    mockAnthropicAnalyze.mockResolvedValueOnce({ ...VALID_ANALYSIS, suggestion })

    const result = await analyzeCanvas(DATA_URL, anthropicConfig())

    expect(result.description).toBe(VALID_ANALYSIS.description)
    expect(result.tags).toEqual(VALID_ANALYSIS.tags)
    expect(result.suggestion).toBeUndefined()
  })

  it('names the field it could not read, for a drift no user can report', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockAnthropicAnalyze.mockResolvedValueOnce({
      ...VALID_ANALYSIS,
      suggestion: { ...VALID_SUGGESTION, charset: 'dither' },
    })

    await analyzeCanvas(DATA_URL, anthropicConfig())

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('charset'))
    warn.mockRestore()
  })

  it('still throws ParseError when the prose itself is malformed', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce({ ...VALID_ANALYSIS, description: 42 })

    await expect(analyzeCanvas(DATA_URL, anthropicConfig())).rejects.toBeInstanceOf(ParseError)
  })

  it('names the malformed part on the error, though the modal never shows it', async () => {
    mockAnthropicAnalyze.mockResolvedValueOnce({ ...VALID_ANALYSIS, threatLevel: 'EXTREME' })

    await expect(analyzeCanvas(DATA_URL, anthropicConfig())).rejects.toThrow(/threatLevel/)
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

import { describe, expect, it } from 'vitest'
import { CHARSETS, COLOR_MODES, type ConversionSettings } from '../ascii/types'
import { ParseError } from './errors'
import { readSuggestion, SUGGESTION_PROMPT } from './suggestion'

const VALID: ConversionSettings = {
  charset: 'braille',
  colorMode: 'neon',
  edgeGlyphs: true,
  dithering: 'bayer',
  resolution: 10,
  brightness: 1.15,
  contrast: 1.4,
}

function reading(patch: Record<string, unknown>) {
  return () => readSuggestion({ ...VALID, ...patch })
}

describe('readSuggestion', () => {
  it('returns the settings a well-formed suggestion describes', () => {
    expect(readSuggestion({ ...VALID })).toEqual(VALID)
  })

  it('keeps nothing the provider added beside the settings', () => {
    expect(readSuggestion({ ...VALID, rationale: 'because', charset: 'box' })).toEqual({
      ...VALID,
      charset: 'box',
    })
  })

  it.each([
    null,
    undefined,
    'braille',
    42,
    [VALID],
  ])('throws ParseError when the suggestion is not an object (%s)', (raw) => {
    expect(() => readSuggestion(raw)).toThrow(ParseError)
  })

  it.each(Object.keys(VALID))('throws ParseError when %s is missing', (key) => {
    const { [key as keyof ConversionSettings]: _dropped, ...partial } = VALID
    expect(() => readSuggestion(partial)).toThrow(ParseError)
  })

  it('accepts every Charset the app offers', () => {
    for (const charset of CHARSETS) {
      expect(readSuggestion({ ...VALID, charset }).charset).toBe(charset)
    }
  })

  it('accepts every Color Mode the app offers', () => {
    for (const colorMode of COLOR_MODES) {
      expect(readSuggestion({ ...VALID, colorMode }).colorMode).toBe(colorMode)
    }
  })

  it('rejects an unknown Charset rather than coercing it to the nearest one', () => {
    expect(reading({ charset: 'dither' })).toThrow(ParseError)
  })

  it('rejects an unknown Color Mode rather than coercing it', () => {
    expect(reading({ colorMode: 'vaporwave' })).toThrow(ParseError)
  })

  // `'toString' in obj` is true for every object, so a membership test that used it would let a
  // prototype method through as a Charset.
  it('rejects a prototype method name as a Charset', () => {
    expect(reading({ charset: 'toString' })).toThrow(ParseError)
  })

  it('rejects a Color Mode that is not a string', () => {
    expect(reading({ colorMode: 3 })).toThrow(ParseError)
  })

  it('rejects edgeGlyphs given as a truthy string instead of a boolean', () => {
    expect(reading({ edgeGlyphs: 'on' })).toThrow(ParseError)
  })

  it.each([5, 25, 1000, -1])('rejects a resolution outside the slider range (%s)', (resolution) => {
    expect(reading({ resolution })).toThrow(ParseError)
  })

  it('rejects a fractional resolution — the control counts whole pixels', () => {
    expect(reading({ resolution: 10.5 })).toThrow(ParseError)
  })

  it.each([0.4, 2.1])('rejects a brightness outside its range (%s)', (brightness) => {
    expect(reading({ brightness })).toThrow(ParseError)
  })

  it.each([0.49, 3.01])('rejects a contrast outside its range (%s)', (contrast) => {
    expect(reading({ contrast })).toThrow(ParseError)
  })

  it('accepts an off-step brightness — it is a continuous multiplier, not a notch', () => {
    expect(readSuggestion({ ...VALID, brightness: 1.07 }).brightness).toBe(1.07)
  })

  it('rejects Infinity, which JSON.parse produces from 1e400', () => {
    expect(reading({ contrast: Number.POSITIVE_INFINITY })).toThrow(ParseError)
    expect(reading({ brightness: JSON.parse('1e400') })).toThrow(ParseError)
  })

  it('rejects NaN', () => {
    expect(reading({ contrast: Number.NaN })).toThrow(ParseError)
  })

  it('rejects a numeric field sent as a string', () => {
    expect(reading({ resolution: '10' })).toThrow(ParseError)
    expect(reading({ brightness: '1.1' })).toThrow(ParseError)
  })
})

describe('SUGGESTION_PROMPT', () => {
  // The prompt and the reader are one vocabulary — a Charset offered by one and refused by the
  // other spends the user's key on a parse-error.
  it('names every Charset the reader accepts', () => {
    for (const charset of CHARSETS) {
      expect(SUGGESTION_PROMPT).toContain(charset)
    }
  })

  it('names every Color Mode the reader accepts', () => {
    for (const colorMode of COLOR_MODES) {
      expect(SUGGESTION_PROMPT).toContain(colorMode)
    }
  })

  it('names each ConversionSetting the reader requires', () => {
    for (const key of Object.keys(VALID)) {
      expect(SUGGESTION_PROMPT).toContain(key)
    }
  })
})

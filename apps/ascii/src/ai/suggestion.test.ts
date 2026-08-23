import { describe, expect, it } from 'vitest'
import { CHARSETS, COLOR_MODES, type ConversionSettings, DITHERINGS } from '../ascii/types'
import { readSuggestion, SUGGESTION_PROMPT, SUGGESTION_SKELETON } from './suggestion'

const VALID: ConversionSettings = {
  charset: 'braille',
  colorMode: 'neon',
  edgeGlyphs: true,
  dithering: 'bayer',
  resolution: 10,
  brightness: 1.15,
  contrast: 1.4,
}

/** The settings a well-formed read produced, or a failure the assertion can name. */
function accepted(raw: unknown): ConversionSettings {
  const read = readSuggestion(raw)
  if (!read.ok) {
    throw new Error(`expected an accepted suggestion, got: ${read.reason}`)
  }
  return read.suggestion
}

function refusal(patch: Record<string, unknown>): string {
  const read = readSuggestion({ ...VALID, ...patch })
  if (read.ok) {
    throw new Error('expected the suggestion to be refused')
  }
  return read.reason
}

describe('readSuggestion', () => {
  it('returns the settings a well-formed suggestion describes', () => {
    expect(accepted({ ...VALID })).toEqual(VALID)
  })

  it('keeps nothing the provider added beside the settings', () => {
    expect(accepted({ ...VALID, rationale: 'because', charset: 'box' })).toEqual({
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
  ])('refuses a suggestion that is not an object (%s)', (raw) => {
    const read = readSuggestion(raw)
    expect(read.ok).toBe(false)
  })

  it.each(Object.keys(VALID))('refuses a suggestion missing %s, and names it', (key) => {
    const { [key as keyof ConversionSettings]: _dropped, ...partial } = VALID
    const read = readSuggestion(partial)

    expect(read.ok).toBe(false)
    expect(read.ok === false && read.reason).toBe(`${key} is missing`)
  })

  it('accepts every Charset the app offers', () => {
    for (const charset of CHARSETS) {
      expect(accepted({ ...VALID, charset }).charset).toBe(charset)
    }
  })

  it('accepts every Color Mode the app offers', () => {
    for (const colorMode of COLOR_MODES) {
      expect(accepted({ ...VALID, colorMode }).colorMode).toBe(colorMode)
    }
  })

  it('refuses an unknown Charset rather than coercing it to the nearest one', () => {
    expect(refusal({ charset: 'dither' })).toContain('charset must be one of')
  })

  it('refuses an unknown Color Mode rather than coercing it', () => {
    expect(refusal({ colorMode: 'vaporwave' })).toContain('colorMode must be one of')
  })

  // `'toString' in obj` is true for every object, so a membership test that used it would let a
  // prototype method through as a Charset.
  it('refuses a prototype method name as a Charset', () => {
    expect(refusal({ charset: 'toString' })).toContain('charset must be')
  })

  it('refuses a Color Mode that is not a string', () => {
    expect(refusal({ colorMode: 3 })).toContain('colorMode must be')
  })

  it('refuses edgeGlyphs given as a truthy string instead of a boolean', () => {
    expect(refusal({ edgeGlyphs: 'on' })).toBe('edgeGlyphs must be true or false (got "on")')
  })

  it.each([5, 25, 1000, -1])('refuses a resolution outside the slider range (%s)', (resolution) => {
    expect(refusal({ resolution })).toContain('resolution must be a whole number from 6 to 24')
  })

  it('refuses a fractional resolution — the control counts whole pixels', () => {
    expect(refusal({ resolution: 10.5 })).toContain('resolution must be a whole number')
  })

  it.each([0.4, 2.1])('refuses a brightness outside its range (%s)', (brightness) => {
    expect(refusal({ brightness })).toContain('brightness must be a number from 0.5 to 2')
  })

  it.each([0.49, 3.01])('refuses a contrast outside its range (%s)', (contrast) => {
    expect(refusal({ contrast })).toContain('contrast must be a number from 0.5 to 3')
  })

  it('accepts an off-step brightness — it is a continuous multiplier, not a notch', () => {
    expect(accepted({ ...VALID, brightness: 1.07 }).brightness).toBe(1.07)
  })

  // `JSON.stringify(Infinity)` is `'null'`, which would read as a missing field.
  it('refuses Infinity and says so, rather than reporting it as missing', () => {
    expect(refusal({ brightness: JSON.parse('1e400') })).toContain('got Infinity')
    expect(refusal({ contrast: Number.POSITIVE_INFINITY })).toContain('got Infinity')
  })

  it('refuses NaN', () => {
    expect(refusal({ contrast: Number.NaN })).toContain('got NaN')
  })

  it('refuses a numeric field sent as a string', () => {
    expect(refusal({ resolution: '10' })).toContain('resolution must be')
    expect(refusal({ brightness: '1.1' })).toContain('brightness must be')
  })

  // First failure wins, so the reason points at one field rather than listing every complaint.
  it('names only the first field that is wrong', () => {
    expect(refusal({ charset: 'dither', contrast: 99 })).toContain('charset')
  })
})

describe('SUGGESTION_PROMPT', () => {
  // The prompt and the reader are one vocabulary — a Charset offered by one and refused by the
  // other spends the user's key on a suggestion that is dropped on arrival.
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

describe('the maps over ConversionSettings', () => {
  // Three total maps over one type now: this reader, the modal's rows, and `settingsMatch`'s
  // exhaustiveness table (presets.test.ts). Each is keyed on the type so none can *lose* an axis —
  // what this pins is that they are keyed on the same type as the fixture above, i.e. that the
  // fixture is still a whole ConversionSettings rather than a subset that happens to type-check.
  it('reads back exactly the keys ConversionSettings has', () => {
    const settings = accepted({ ...VALID })

    expect(Object.keys(settings).sort()).toEqual(Object.keys(VALID).sort())
  })

  // The axis #346 added, and the one the rule has to say the most about: it moves tone as well as
  // texture, so a model told only "pick one of three" would spend it on subjects that lose by it.
  it('teaches the model when a Dithering is worth spending, not just which exist', () => {
    for (const dithering of DITHERINGS) {
      expect(SUGGESTION_PROMPT).toContain(dithering)
    }
    expect(SUGGESTION_PROMPT).toMatch(/band/i)
    expect(SUGGESTION_PROMPT).toMatch(/brighter/i)
  })
})

describe('SUGGESTION_SKELETON', () => {
  // The drift that costs the user money: a skeleton the model obeys that the reader then refuses.
  it('is a suggestion the reader accepts as it stands', () => {
    const read = readSuggestion(JSON.parse(SUGGESTION_SKELETON))

    expect(read.ok).toBe(true)
  })

  it('spells every field, so the model is never asked for a partial object', () => {
    expect(Object.keys(JSON.parse(SUGGESTION_SKELETON)).sort()).toEqual(Object.keys(VALID).sort())
  })
})

import { describe, expect, it } from 'vitest'
import {
  charsetGlyphs,
  charsetRamp,
  isCustomCharset,
  MIN_CHARSET_GLYPHS,
  readCustomCharset,
} from './charset'
import { CHARSET_MAPS, CHARSETS } from './types'

/** The reader is the only way in, so every custom fixture below comes through it. */
function authored(ramp: string) {
  const read = readCustomCharset(ramp)
  if (!read.ok) {
    throw new Error(`fixture refused: ${read.reason}`)
  }
  return read.charset
}

describe('isCustomCharset', () => {
  it('says no to every curated Charset, so a name can never read as an authored ramp', () => {
    for (const name of CHARSETS) {
      expect(isCustomCharset(name), name).toBe(false)
    }
  })

  it('says yes to a ramp the reader minted', () => {
    expect(isCustomCharset(authored(' .@'))).toBe(true)
  })
})

describe('charsetRamp', () => {
  it('gives a named Charset its CHARSET_MAPS entry', () => {
    expect(charsetRamp('classic')).toBe(CHARSET_MAPS.classic)
  })

  it('gives an authored Charset back exactly the text that was typed', () => {
    expect(charsetRamp(authored(' .:@'))).toBe(' .:@')
  })
})

describe('charsetGlyphs', () => {
  it('splits a curated ramp one glyph per character', () => {
    expect(charsetGlyphs('circles')).toEqual([' ', '·', '∘', '○', '◎', '●'])
  })

  it('keeps an astral character whole instead of handing back half a surrogate pair', () => {
    expect(charsetGlyphs(authored('🌑🌒🌕'))).toEqual(['🌑', '🌒', '🌕'])
  })

  it('counts astral characters as one glyph each, which `.length` does not', () => {
    const ramp = '🌑🌕'
    expect(charsetGlyphs(authored(ramp))).toHaveLength(2)
    expect(ramp.length).toBe(4)
  })
})

describe('readCustomCharset', () => {
  it('refuses an empty ramp', () => {
    expect(readCustomCharset('')).toEqual({ ok: false, reason: expect.any(String) })
  })

  it('refuses a single character — one bucket is not a gradient', () => {
    expect(readCustomCharset('@').ok).toBe(false)
  })

  it('refuses a single astral character, which is one glyph and two UTF-16 units', () => {
    expect(readCustomCharset('🌑').ok).toBe(false)
  })

  it('accepts two astral characters, which are two glyphs and four UTF-16 units', () => {
    expect(readCustomCharset('🌑🌕').ok).toBe(true)
  })

  it('says what a Charset needs, both the count and the order', () => {
    const read = readCustomCharset('@')
    expect(read.ok).toBe(false)
    if (!read.ok) {
      expect(read.reason).toContain(String(MIN_CHARSET_GLYPHS))
      expect(read.reason).toContain('darkest to lightest')
    }
  })

  it('accepts the shortest ramp that still has two ends', () => {
    expect(readCustomCharset(' @')).toEqual({ ok: true, charset: 'custom: @' })
  })

  it('leaves a ramp that spells a curated name authored, never curated', () => {
    const read = readCustomCharset('classic')
    expect(read.ok && isCustomCharset(read.charset)).toBe(true)
    expect(read.ok && read.charset).not.toBe('classic')
  })
})

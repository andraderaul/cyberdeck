import { describe, expect, it } from 'vitest'
import { cssColor, frameGlyph, packHex, packRgb } from './packed-frame'
import { getModePalette } from './renderer'
import { COLOR_MODES } from './types'

describe('the packed colour', () => {
  // Driven from COLOR_MODES rather than a hand-written colour list: `sepia` and `matrix-dual`
  // appear in no Preset, so the digests in `frame-job.test.ts` never execute their round-trip, and
  // a mode added tomorrow arrives covered instead of arriving silently unpacked wrong.
  it.each(COLOR_MODES)('round-trips every spelling %s can produce', (mode) => {
    const palette = getModePalette(mode)
    for (const hex of Array.isArray(palette) ? palette : [palette]) {
      expect(cssColor(packHex(hex))).toBe(hex)
    }
  })

  it('round-trips the channels `original` and `adaptive` build', () => {
    for (const [r, g, b] of [
      [0, 0, 0],
      [255, 255, 255],
      [0, 255, 65],
      [1, 128, 254],
    ]) {
      expect(cssColor(packRgb(r, g, b))).toBe(`rgb(${r},${g},${b})`)
    }
  })

  // The two spellings share a 32-bit cell, so the bit that tells them apart must not be reachable
  // by colour data — white is the value that would collide if it were inside the channels.
  it('keeps the two spellings apart at the extremes', () => {
    expect(cssColor(packHex('#ffffff'))).toBe('#ffffff')
    expect(cssColor(packRgb(255, 255, 255))).toBe('rgb(255,255,255)')
    expect(packHex('#ffffff')).not.toBe(packRgb(255, 255, 255))
  })
})

describe('the packed glyph', () => {
  // Uint32Array rather than Uint16Array is load-bearing: an authored Charset can reach past the
  // BMP, and a 16-bit cell would hand the grid half a surrogate pair.
  it('carries a code point past the BMP whole', () => {
    expect(frameGlyph('🌑'.codePointAt(0) as number)).toBe('🌑')
    expect(frameGlyph(0x20)).toBe(' ')
  })
})

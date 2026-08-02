// The scale guard covers spacing and borderRadius but not `text-`, and `audit.ts` explains why: the
// prefix is three namespaces at once, so a deny list over it is not decidable. That leaves a font
// step the one class of typo nothing in the toolchain catches — Tailwind generates nothing, tsc and
// Biome see a valid string, and the glyph renders at whatever it inherited.
//
// ICON_GLYPH_SIZE is the reason that gap is affordable: it is the only place in the deck that names a
// font step for a glyph, so pinning this one string to the preset closes the hole for every caller.

import { describe, expect, it } from 'vitest'
import preset from '../tailwind-preset.js'
import { ICON_GLYPH_SIZE } from './icon-glyph'

describe('ICON_GLYPH_SIZE', () => {
  it('names a font step the preset actually defines', () => {
    const step = ICON_GLYPH_SIZE.split(/\s+/)
      .find((cls) => cls.startsWith('text-'))
      ?.slice('text-'.length)

    expect(step).toBeDefined()
    expect(Object.keys(preset.theme.extend.fontSize)).toContain(step)
  })

  it('pins the line box to the font', () => {
    expect(ICON_GLYPH_SIZE.split(/\s+/)).toContain('leading-none')
  })
})

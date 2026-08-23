// A Charset resolved to the glyphs a cell can draw, and the boundary an authored one crosses to
// become one.
//
// CONTEXT.md never said *curated*: a Charset is a string of characters ordered darkest to lightest,
// and `convertImage` has always accepted any such string — only the UI withheld it. So this module
// holds no second concept, just the two operations both kinds now need: resolve a Charset to its
// glyphs, and decide whether a string the user typed is one.
//
// Pure, no DOM — it sits on `convertImage`'s side of ADR 0005's line.

import { CHARSET_MAPS, type Charset, CUSTOM_CHARSET_PREFIX, type CustomCharset } from './types'

/**
 * The fewest glyphs a ramp can carry. Below two there is no gradient left to index — one glyph is a
 * single bucket painting the picture flat, none is a grid of `undefined`.
 */
export const MIN_CHARSET_GLYPHS = 2

export function isCustomCharset(charset: Charset): charset is CustomCharset {
  return charset.startsWith(CUSTOM_CHARSET_PREFIX)
}

/** The ordered string behind a Charset: `CHARSET_MAPS`' entry for a named one, the author's own text otherwise. */
export function charsetRamp(charset: Charset): string {
  return isCustomCharset(charset)
    ? charset.slice(CUSTOM_CHARSET_PREFIX.length)
    : CHARSET_MAPS[charset]
}

/**
 * The ramp split into the glyphs a cell draws — by code point, never by `.length` and `[i]`.
 * An astral character is two UTF-16 units, so indexing the string hands the grid half a surrogate
 * pair: a broken glyph that then carries into PNG, TXT and HTML Export alike. The curated ramps are
 * already full of multi-byte characters (`braille`, `katakana`, `blocks`) and an authored one can
 * reach past the BMP, which is where the two spellings stop agreeing.
 *
 * Resolved once per conversion and passed down, never per cell — the Live Source runs this loop
 * ~15 times a second (ADR 0002).
 */
export function charsetGlyphs(charset: Charset): string[] {
  return [...charsetRamp(charset)]
}

/**
 * Either the Charset an authored ramp becomes, or why it is none — the shape `readSuggestion` uses,
 * and for its reason: a refusal here is a message the EDIT tab shows, not an exception the render
 * loop has to survive. Nothing that fails this reader ever reaches ConversionSettings, which is what
 * keeps a degenerate ramp from becoming a broken grid.
 */
export type CustomCharsetRead = { ok: true; charset: CustomCharset } | { ok: false; reason: string }

export function readCustomCharset(ramp: string): CustomCharsetRead {
  if ([...ramp].length < MIN_CHARSET_GLYPHS) {
    return {
      ok: false,
      reason: `a charset needs ${MIN_CHARSET_GLYPHS} characters or more, ordered darkest to lightest`,
    }
  }
  return { ok: true, charset: `${CUSTOM_CHARSET_PREFIX}${ramp}` }
}

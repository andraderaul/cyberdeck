// The guard on the social card's copy of the Charset.
//
// ASCII//Convert's card is a lit sphere sampled onto `classic`, and the ramp is printed across the
// card as the legend for it. `scripts/social/cards.mjs` cannot import this app's TypeScript, so it
// carries its own copy of that string — the same accepted cross-seam duplication the pre-paint
// Theme scripts carry, and held the same way: by a test rather than by a comment (ADR 0024).
//
// Without it, editing a Charset leaves the card advertising a ramp the program no longer maps to,
// which is a lie nothing in the toolchain would catch.

import { describe, expect, it } from 'vitest'
import { CLASSIC_CHARSET } from '../../../scripts/social/cards.mjs'
import { CHARSET_MAPS } from '../src/ascii/types'

describe('the card prints the Charset the program maps', () => {
  it('is `classic`, minus the blank the card has no glyph for', () => {
    // The darkest step of `classic` is a space: the program renders nothing there, and so does the
    // card — it skips the cell rather than emitting an empty glyph. Everything visible must match.
    expect(CLASSIC_CHARSET).toBe(CHARSET_MAPS.classic.trimStart())
  })

  it('drops only the blank', () => {
    expect(CHARSET_MAPS.classic.startsWith(' ')).toBe(true)
    expect(CHARSET_MAPS.classic).toHaveLength(CLASSIC_CHARSET.length + 1)
  })
})

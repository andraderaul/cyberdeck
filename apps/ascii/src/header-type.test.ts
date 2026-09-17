// `icon-glyph.test.ts` in the kit is this test's model, and the gap it closes is the same one: the
// scale guard cannot cover `text-`, because that prefix is `fontSize` ∪ `colors` ∪ `text-center` at
// once and no deny list over it is decidable. A font step is therefore the one scale typo nothing
// in the toolchain catches — Tailwind emits nothing, tsc and Biome see a valid string.
//
// `header-type.ts` carries no role classes, so every `text-` it spells is a size, and pinning them
// here closes the hole for the whole header.

import preset from '@cyberdeck/deck-kit/tailwind-preset'
import { ICON_GLYPH_SIZE } from '@cyberdeck/deck-kit/ui'
import { describe, expect, it } from 'vitest'
import {
  HEADER_CONTROL_GLYPH,
  HEADER_CONTROL_LABEL,
  HEADER_CONTROL_TYPE,
  HEADER_SUBTITLE,
  HEADER_WORDMARK,
} from './header-type'

const PRESET_STEPS = Object.keys(preset.theme.extend.fontSize)

// The three that carry the header's *type*: the face and the tracking travel with them.
const CONSTANTS: Array<[string, string]> = [
  ['HEADER_WORDMARK', HEADER_WORDMARK],
  ['HEADER_SUBTITLE', HEADER_SUBTITLE],
  ['HEADER_CONTROL_TYPE', HEADER_CONTROL_TYPE],
]

// `HEADER_CONTROL_GLYPH` is a size and nothing else — no face, no tracking — so it joins the step
// pinning and stays out of the two tests above.
const SIZED: Array<[string, string]> = [
  ...CONSTANTS,
  ['HEADER_CONTROL_GLYPH', HEADER_CONTROL_GLYPH],
]

/** Drops any responsive or state variant, so `sm:text-md` is read as the utility it applies. */
function utilities(classes: string): string[] {
  return classes.split(/\s+/).map((cls) => cls.slice(cls.lastIndexOf(':') + 1))
}

function fontSteps(classes: string): string[] {
  return utilities(classes)
    .filter((cls) => cls.startsWith('text-'))
    .map((cls) => cls.slice('text-'.length))
}

describe('the header type', () => {
  it.each(SIZED)('%s names only font steps the preset defines', (_name, classes) => {
    for (const step of fontSteps(classes)) {
      expect(PRESET_STEPS).toContain(step)
    }
  })

  // Guards the guard: a helper that found nothing would pass the loop above over anything.
  it('finds the steps it is pinning', () => {
    expect(fontSteps(HEADER_WORDMARK)).toEqual(['base', 'md'])
    expect(fontSteps(HEADER_SUBTITLE)).toEqual(['xs'])
  })

  it.each(CONSTANTS)('%s takes the display face', (_name, classes) => {
    expect(utilities(classes)).toContain('font-display')
  })

  // The display tracking is the `sm` half of the pair — below the breakpoint the header keeps the
  // tracking it already shipped, or the Theme control leaves the screen at 320px.
  it.each(CONSTANTS)('%s reaches the display tracking at `sm`', (_name, classes) => {
    expect(classes.split(/\s+/)).toContain('sm:tracking-widest')
    expect(classes.split(/\s+/)).toContain('tracking-wide')
  })

  // The header controls keep their lowercase labels (#370): the constant that reaches them must not
  // be the one that carries `uppercase`.
  it('leaves the controls their case', () => {
    expect(HEADER_CONTROL_TYPE).not.toContain('uppercase')
  })

  // The mute is glyph-only below `sm` and labelled from `sm` up, so the constant that sizes its mark
  // has to be `ICON_GLYPH_SIZE` at the base and the inherited step at the breakpoint — both halves,
  // asserted positively: a `not.toContain` over a class would put that class back in the CSS, since
  // the Tailwind content glob reads test files too.
  it('sizes a breakpoint-conditional glyph as icon-only below `sm` and inherited above', () => {
    const classes = HEADER_CONTROL_GLYPH.split(/\s+/)
    expect(classes).toEqual(expect.arrayContaining(ICON_GLYPH_SIZE.split(' ')))
    expect(classes).toContain('sm:text-xs')
  })

  // The same breakpoint and the same idiom as the subtitle beside it — `app.tsx` spells
  // `hidden sm:block` on the dash and the tagline, and a label that hid at a different width would
  // make the row two designs.
  it('hides a control label below `sm` on the subtitle\u2019s own breakpoint', () => {
    expect(HEADER_CONTROL_LABEL.split(/\s+/)).toEqual(['hidden', 'sm:block'])
  })
})

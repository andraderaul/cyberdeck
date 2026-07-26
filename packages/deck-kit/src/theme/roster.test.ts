// The roster exists in three places that cannot import each other: this package's TypeScript, the
// Theme blocks in `tokens.css`, and a blocking script hand-inlined into each themed program's HTML
// (ADR 0024 accepts that duplication — the deck has no shared HTML). This is what holds them
// together, and what makes the exclusion of SPRAWL//Atlas a decision rather than an omission.

import { describe, expect, it } from 'vitest'
import { declaredThemes } from './audit'
import { prePaintScripts, readTokensCss } from './sources'
import { DEFAULT_THEME, THEME_ATTRIBUTE, THEME_STORAGE_KEY, THEMES } from './themes'

describe('the stylesheet and the roster agree', () => {
  it('declares a block for every Theme but the default', () => {
    // The root block *is* the default, which is why it has no selector of its own.
    expect(declaredThemes(readTokensCss()).sort()).toEqual(
      THEMES.filter((theme) => theme !== DEFAULT_THEME)
        .slice()
        .sort(),
    )
  })
})

describe('the hand-inlined pre-paint scripts agree', () => {
  const scripts = prePaintScripts()

  it('finds one in every program that has a Theme control', () => {
    expect(scripts.map((script) => script.program).sort()).toEqual(['ascii', 'glitch', 'golem'])
  })

  // SPRAWL//Atlas is excluded by explicit decision (ADR 0021, ADR 0024): its pixels are neither
  // chrome nor the user's — they are the piece, and the piece *is* cyan light against the dark.
  // Recolouring it by setting is recolouring a work. It never sets the attribute and falls through
  // to the root block, and this is here so a future consistency pass does not "fix" that.
  it('finds none in SPRAWL//Atlas, which is excluded on purpose', () => {
    expect(scripts.map((script) => script.program)).not.toContain('sprawl')
  })

  describe.each(scripts)('$program', ({ source }) => {
    it('names the whole roster, in order', () => {
      const literal = /\[((?:\s*'[\w-]+'\s*,?)+)\]/.exec(source)?.[1] ?? ''
      const named = [...literal.matchAll(/'([\w-]+)'/g)].map(([, name]) => name)
      expect(named).toEqual([...THEMES])
    })

    it('falls back to the default', () => {
      expect(source).toContain(`'${DEFAULT_THEME}'`)
    })

    it('reads the key the kit writes', () => {
      expect(source).toContain(THEME_STORAGE_KEY)
    })

    it('sets the attribute the Theme blocks select on', () => {
      expect(source).toContain(THEME_ATTRIBUTE)
    })
  })
})

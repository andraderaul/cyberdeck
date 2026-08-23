// The roster exists in three places that cannot import each other: this package's TypeScript, the
// Theme blocks in `tokens.css`, and a blocking script hand-inlined into each themed workspace's HTML
// (ADR 0024 accepts that duplication — the deck has no shared HTML). This is what holds them
// together, and what makes the exclusion of SPRAWL//Atlas a decision rather than an omission.

import { describe, expect, it } from 'vitest'
import { declaredThemes, resolveTokens } from './audit'
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

  // "Workspace", not "program": `apps/` stopped meaning programs when the hub landed there, and the
  // hub is deliberately not one — it is the deck's chrome (ADR 0025).
  it('finds one in every workspace that has a Theme control', () => {
    expect(scripts.map((script) => script.workspace).sort()).toEqual([
      'ascii',
      'deck',
      'glitch',
      'golem',
    ])
  })

  // SPRAWL//Atlas is excluded by explicit decision (ADR 0021, ADR 0024): its pixels are neither
  // chrome nor the user's — they are the piece, and the piece *is* cyan light against the dark.
  // Recolouring it by setting is recolouring a work. It never sets the attribute and falls through
  // to the root block, and this is here so a future consistency pass does not "fix" that.
  it('finds none in SPRAWL//Atlas, which is excluded on purpose', () => {
    expect(scripts.map((script) => script.workspace)).not.toContain('sprawl')
  })

  describe.each(scripts)('$workspace', ({ source }) => {
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

// The browser's own chrome is the fourth place a colour is written by hand, and the only one with
// nothing reading it: `<meta name="theme-color">` sits beside the pre-paint script, cannot resolve
// a `var()`, and goes on painting whatever hex it was given long after the token moved. That is the
// same silent failure the vocabulary guard exists for, one layer out of the stylesheet.
//
// SPRAWL//Atlas is absent here on purpose, and for the same reason it is absent above: it takes no
// Theme, so its chrome answers to the piece's own field rather than to a token. Its half of this
// pin lives in `apps/sprawl/scripts/social-card.test.mjs`, against `paint.ts`.
describe('the browser chrome matches the Theme that paints first', () => {
  const THEME_COLOR = /<meta name="theme-color" content="([^"]+)" \/>/

  describe.each(prePaintScripts())('$workspace', ({ source }) => {
    it('is the default Theme’s page background', () => {
      const declared = THEME_COLOR.exec(source)?.[1]
      expect(declared, 'no theme-color in this workspace’s index.html').toBeDefined()
      expect(declared).toBe(resolveTokens(readTokensCss(), DEFAULT_THEME)['--bg'])
    })
  })
})

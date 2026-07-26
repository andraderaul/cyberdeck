// The Theme Contract (ADR 0024), proved against the real token stylesheet, for every Theme it
// declares. This is ADR 0009's regression guard grown up: it used to live in two programs of four,
// duplicate its own arithmetic, and mirror token values by hand from a file the tokens had already
// left. It now reads the values, so it cannot pass by testing numbers that no longer exist.
//
// It asserts what a Theme *guarantees*, never what a token is spelled — pinning a value is the
// hand-mirror failure being removed, and it would pin exactly what Themes need to be free to change.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, declaredThemes, resolveTokens } from './audit'

// Vitest runs each workspace from its own package root, so this is the kit's `src/tokens.css`.
// `import.meta.url` is not a file URL under happy-dom, which is why it is not used here.
const css = readFileSync(resolve(process.cwd(), 'src/tokens.css'), 'utf8')

// The root block *is* `ice`, so it has no selector to be discovered by. Every other Theme comes
// from the stylesheet rather than from a list here: a Theme added without touching this file is
// still held to the contract.
const THEMES = ['ice', ...declaredThemes(css)]

const SURFACES = ['--bg', '--bg-surface', '--bg-elevated'] as const

const AA_SMALL = 4.5
// WCAG 1.4.11 — the floor for something you have to be able to *see* rather than read: a border,
// a focus ring, a chip's outline.
const NON_TEXT = 3

describe.each(THEMES)('Theme `%s` meets the contract', (theme) => {
  const tokens = resolveTokens(css, theme)
  const ratio = (fg: string, bg: string) => contrastRatio(tokens[fg], tokens[bg])

  describe.each(SURFACES)('on %s', (surface) => {
    it.each(['--fg-subtle', '--fg-muted', '--color-danger'])('%s passes AA-small', (fg) => {
      expect(ratio(fg, surface)).toBeGreaterThanOrEqual(AA_SMALL)
    })

    // Two tiers, and the split is what closes the hole without failing the incumbent: `ice`'s
    // violet clears AA-small on the base surface and 3:1 everywhere, while a future Theme still
    // cannot ship an accent at 2:1. Demanding AA-small everywhere would fail `ice` itself and turn
    // "add Themes" into "reopen the deck's brand colour under deadline".
    it('--accent passes the non-text floor', () => {
      expect(ratio('--accent', surface)).toBeGreaterThanOrEqual(NON_TEXT)
    })

    // The roles the tracer named (ADR 0024). A phosphor and a Hit/Miss pair are read as text on a
    // panel, so they answer to the same floor the rest of the text does.
    it.each([
      '--color-phosphor',
      '--color-link',
      '--color-hit',
      '--color-miss',
    ])('%s passes AA-small', (fg) => {
      expect(ratio(fg, surface)).toBeGreaterThanOrEqual(AA_SMALL)
    })
  })

  it('--accent passes AA-small on the base surface, where it carries small text', () => {
    expect(ratio('--accent', '--bg')).toBeGreaterThanOrEqual(AA_SMALL)
  })

  // A Hit and a Miss are a classifier's two answers (ADR 0023), so a Theme that spelled both the
  // same colour would pass every pin above and still lose the lens. This is deliberately an
  // inequality and not a ratio: luminance contrast is the wrong instrument for two foregrounds —
  // `ice`'s cyan and electric measure 1.2:1 against each other and are unmistakable — and the
  // right one, a perceptual colour difference, is the colour engine this guard must not become.
  // What carries the distinction for a reader who cannot use hue is the word HIT or MISS itself.
  it('does not spell a Hit and a Miss the same colour', () => {
    expect(tokens['--color-hit']).not.toBe(tokens['--color-miss'])
  })

  // ADR 0013: an overlay on a canvas stands on its own opaque surface, because no alpha survives
  // an arbitrary backdrop. That only buys anything if the pair underneath actually passes. The
  // resting pair and the REC badge's hover surface are both here — it is a button now (ADR 0020),
  // so the opaque-background rule binds its hover state too.
  describe('canvas overlays, on the surface they bring with them', () => {
    it('LIVE / REC badge text passes', () => {
      expect(ratio('--color-danger', '--bg')).toBeGreaterThanOrEqual(AA_SMALL)
    })

    it('the clear control passes', () => {
      expect(ratio('--fg-muted', '--bg')).toBeGreaterThanOrEqual(AA_SMALL)
    })

    it('the REC badge passes on its hover surface', () => {
      expect(ratio('--color-danger', '--bg-elevated')).toBeGreaterThanOrEqual(AA_SMALL)
    })
  })
})

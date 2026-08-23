// The guard on the social card's copy of the roster.
//
// The hub's card is the door at preview size: the same four names, categories and taglines the page
// itself renders. `scripts/social/cards.mjs` cannot import this app's TypeScript, so it carries its
// own copy — the same accepted cross-seam duplication the pre-paint Theme scripts carry, and held
// the same way: by a test rather than by a comment (ADR 0024, ADR 0025).
//
// Without it, a tagline rewritten on the door leaves the card advertising the old one to everyone
// who sees the link before they see the page, which is a lie nothing in the toolchain would catch.

import { describe, expect, it } from 'vitest'
import { DECK_ROSTER } from '../../../scripts/social/cards.mjs'
import { PROGRAMS } from '../src/roster'

describe('the card lists what the door lists', () => {
  it('names the same programs, in the same order', () => {
    expect(DECK_ROSTER.map(({ name }) => name)).toEqual(PROGRAMS.map(({ name }) => name))
  })

  it('gives each of them the same category', () => {
    expect(DECK_ROSTER.map(({ kind }) => kind)).toEqual(PROGRAMS.map(({ kind }) => kind))
  })

  it('prints the tagline the door prints', () => {
    expect(DECK_ROSTER.map(({ tagline }) => tagline)).toEqual(
      PROGRAMS.map(({ tagline }) => tagline),
    )
  })
})

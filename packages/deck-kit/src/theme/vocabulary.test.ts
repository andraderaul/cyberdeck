// The vocabulary guard (ADR 0024). The semantic layer is only worth having if components actually
// use it, and the failure mode of not enforcing that is the least visible kind: one Theme broken in
// one corner of one program. The names below no longer exist in the Tailwind preset, so a component
// that reaches for one renders unstyled — which nothing else in the toolchain will tell you.
//
// It covers all four programs and the kit, rather than the two that happened to have a copy of
// ADR 0009's guard, so coverage stops depending on which program someone remembered.

import { describe, expect, it } from 'vitest'
import { declaredPrimitives, findLiteralHues, RETIRED_HUE_CLASSES } from './audit'
import { colourBearingSources, readTokensCss } from './sources'

const files = colourBearingSources()

describe('the literal hue vocabulary is retired', () => {
  it('has something to look at', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  // The ban list is only a guard while it matches the stylesheet, and it was first written from
  // what the Tailwind preset dropped — which silently missed the three primitives that never had a
  // class to lose. This holds it to the definition instead: every literal colour no Theme restates
  // is `ice`'s vocabulary, so every one of them is banned.
  it('bans every primitive the stylesheet declares', () => {
    const banned = RETIRED_HUE_CLASSES as readonly string[]
    const unbanned = declaredPrimitives(readTokensCss())
      .map((token) => token.slice('--'.length))
      .filter((name) => !banned.includes(name))
    expect(unbanned).toEqual([])
  })

  it.each(files)('$path names roles, not hues', ({ path, source }) => {
    const findings = findLiteralHues(source)
    // The message is the whole point: a contributor has to be able to fix this mechanically,
    // which means knowing the class and the line without opening anything.
    expect(findings.map((finding) => `${path}:${finding.line} — ${finding.className}`)).toEqual([])
  })
})

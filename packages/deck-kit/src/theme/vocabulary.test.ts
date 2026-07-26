// The vocabulary guard (ADR 0024). The semantic layer is only worth having if components actually
// use it, and the failure mode of not enforcing that is the least visible kind: one Theme broken in
// one corner of one program. The names below no longer exist in the Tailwind preset, so a component
// that reaches for one renders unstyled — which nothing else in the toolchain will tell you.
//
// It covers all four programs and the kit, rather than the two that happened to have a copy of
// ADR 0009's guard, so coverage stops depending on which program someone remembered.

import { describe, expect, it } from 'vitest'
import { findLiteralHues } from './audit'
import { colourBearingSources } from './sources'

const files = colourBearingSources()

describe('the literal hue vocabulary is retired', () => {
  it('has something to look at', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it.each(files)('$path names roles, not hues', ({ path, source }) => {
    const findings = findLiteralHues(source)
    // The message is the whole point: a contributor has to be able to fix this mechanically,
    // which means knowing the class and the line without opening anything.
    expect(findings.map((finding) => `${path}:${finding.line} — ${finding.className}`)).toEqual([])
  })
})

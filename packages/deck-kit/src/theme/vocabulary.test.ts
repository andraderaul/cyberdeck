// The vocabulary guard (ADR 0024). The semantic layer is only worth having if components actually
// use it, and the failure mode of not enforcing that is the least visible kind: one Theme broken in
// one corner of one program. The names below no longer exist in the Tailwind preset, so a component
// that reaches for one renders unstyled — which nothing else in the toolchain will tell you.
//
// It covers all four programs and the kit, rather than the two that happened to have a copy of
// ADR 0009's guard, so coverage stops depending on which program someone remembered.

import defaultTheme from 'tailwindcss/defaultTheme.js'
import { describe, expect, it } from 'vitest'
import preset from '../tailwind-preset.js'
import {
  declaredPrimitives,
  findLiteralHues,
  findUndefinedScales,
  RETIRED_HUE_CLASSES,
  UNDEFINED_SCALE_NAMES,
} from './audit'
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

// The scale's half of the same failure. A hue name that left the preset renders unstyled; a scale
// step that was never in it renders nothing at all, and neither Tailwind nor tsc nor biome says a
// word. The bug that earned this guard was an undefined gap step, which left a destructive control
// flush against its neighbour. Like the hue guard, this file never spells an offending class — the
// fixtures that must live in `audit.test.ts`, which is exempt from the scan.
describe('the scale vocabulary is the preset’s', () => {
  // Derived from both halves of what Tailwind actually resolves — the preset's `extend` and the
  // built-in scale it extends — so the ban list cannot drift into naming a step that is real.
  it('bans only steps no key defines', () => {
    const defined = new Set([
      ...Object.keys(preset.theme.extend.spacing),
      ...Object.keys(preset.theme.extend.borderRadius),
      ...Object.keys(defaultTheme.spacing ?? {}),
      ...Object.keys(defaultTheme.borderRadius ?? {}),
    ])
    expect(UNDEFINED_SCALE_NAMES.filter((step) => defined.has(step))).toEqual([])
  })

  it.each(files)('$path names steps the scale defines', ({ path, source }) => {
    const findings = findUndefinedScales(source)
    expect(findings.map((finding) => `${path}:${finding.line} — ${finding.className}`)).toEqual([])
  })
})

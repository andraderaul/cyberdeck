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
  findAlphaModifiers,
  findLiteralHues,
  findUndefinedScales,
  RETIRED_HUE_CLASSES,
  UNDEFINED_SCALE_NAMES,
} from './audit'
import { colourBearingSources, readTokensCss } from './sources'

const files = colourBearingSources()

// Throws rather than falling back to `{}`: a scale whose shape moved has to stop the test that
// derives its list from it, not turn it into a comparison against nothing — which passes while
// proving nothing, the exact failure these guards exist to catch one layer down.
function keysOf(scale: unknown, name: string): string[] {
  const steps = typeof scale === 'object' && scale !== null ? Object.keys(scale) : []
  if (steps.length === 0) {
    throw new Error(`${name} read as nothing — the shape this test derives the list from moved`)
  }
  return steps
}

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
      ...keysOf(preset.theme.extend.spacing, "the preset's spacing"),
      ...keysOf(preset.theme.extend.borderRadius, "the preset's borderRadius"),
      ...keysOf(defaultTheme.spacing, "Tailwind's spacing"),
      ...keysOf(defaultTheme.borderRadius, "Tailwind's borderRadius"),
    ])
    expect(UNDEFINED_SCALE_NAMES.filter((step) => defined.has(step))).toEqual([])
  })

  it.each(files)('$path names steps the scale defines', ({ path, source }) => {
    const findings = findUndefinedScales(source)
    expect(findings.map((finding) => `${path}:${finding.line} — ${finding.className}`)).toEqual([])
  })
})

// The third spelling of the same silence, and the one that had been shipping longest (#355). Every
// colour the preset defines is `var(--token)`, which Tailwind cannot parse as a colour — so it
// drops any candidate carrying an alpha modifier and the utility emits nothing at all. The deck
// tints with named tokens instead; `findAlphaModifiers` says why that is the fix rather than
// teaching the preset `<alpha-value>`. Like the two above, this file never spells an offending
// class — the fixtures live in `audit.test.ts`, which is exempt from the scan. The guard found this
// comment when it was first written, which is as good a demonstration as it could ask for.
describe('a deck colour is never thinned with a slash', () => {
  // Both colour namespaces: a thinned border is the same defect as a thinned background, and the
  // border ladder lives in its own key.
  const colours = [
    ...keysOf(preset.theme.extend.colors, "the preset's colors"),
    ...keysOf(preset.theme.extend.borderColor, "the preset's borderColor"),
  ]

  it.each(files)('$path tints with a token, not an alpha modifier', ({ path, source }) => {
    const findings = findAlphaModifiers(source, colours)
    expect(findings.map((finding) => `${path}:${finding.line} — ${finding.className}`)).toEqual([])
  })
})

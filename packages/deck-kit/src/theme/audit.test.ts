import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  declaredPrimitives,
  declaredThemes,
  findLiteralHues,
  findUndefinedScales,
  RETIRED_HUE_CLASSES,
  resolveTokens,
  srgbDistance,
} from './audit'

// Inline fixtures throughout: the module is text in, findings out, so nothing here touches a real
// file. The guards that read `tokens.css` and the programs' sources are thin wrappers over this.
const CSS = `
/* a comment mentioning --accent: #ffffff; which must not be parsed */
:root {
  --violet: #b829ff;
  --cyan: #00e5ff;
  --accent: var(--violet);
  --fg: var(--accent);
  --bg: #0a0a0f;
  --border-base: 1px solid var(--bg);
  --tint: color-mix(in srgb, var(--accent) 10%, var(--bg));
}

[data-theme='construct'] {
  --accent: #33ff99;
  --bg: #050a07;
}

[data-theme="chiba"] {
  --accent: #ffb545;
}
`

describe('resolveTokens', () => {
  it('reads the root block', () => {
    expect(resolveTokens(CSS, 'ice')['--violet']).toBe('#b829ff')
  })

  it('follows a var() chain to the literal underneath', () => {
    expect(resolveTokens(CSS, 'ice')['--fg']).toBe('#b829ff')
  })

  it('resolves a var() embedded in a longer value', () => {
    expect(resolveTokens(CSS, 'ice')['--border-base']).toBe('1px solid #0a0a0f')
  })

  it('leaves a derived value as it is written, resolved but not evaluated', () => {
    expect(resolveTokens(CSS, 'ice')['--tint']).toBe('color-mix(in srgb, #b829ff 10%, #0a0a0f)')
  })

  it('overlays a Theme block on the root', () => {
    const tokens = resolveTokens(CSS, 'construct')
    expect(tokens['--accent']).toBe('#33ff99')
    expect(tokens['--bg']).toBe('#050a07')
  })

  it('re-resolves the root chains that point at what the Theme redefined', () => {
    // --fg is `var(--accent)` in the root and the Theme never mentions it, so it must come out
    // green rather than carrying `ice`'s violet through.
    expect(resolveTokens(CSS, 'construct')['--fg']).toBe('#33ff99')
  })

  it('accepts either quote style on the attribute selector', () => {
    expect(resolveTokens(CSS, 'chiba')['--accent']).toBe('#ffb545')
  })

  it('falls through to the root for a Theme with no block of its own', () => {
    expect(resolveTokens(CSS, 'nothing-declared')['--accent']).toBe('#b829ff')
  })

  it('ignores declarations inside comments', () => {
    expect(resolveTokens(CSS, 'ice')['--accent']).toBe('#b829ff')
  })
})

describe('declaredThemes', () => {
  it('names every Theme the stylesheet declares a block for', () => {
    expect(declaredThemes(CSS)).toEqual(['construct', 'chiba'])
  })

  it('is empty for a stylesheet with only a root block', () => {
    expect(declaredThemes(':root { --accent: #fff; }')).toEqual([])
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('is 1 for a colour on itself', () => {
    expect(contrastRatio('#b829ff', '#b829ff')).toBeCloseTo(1, 5)
  })

  it('does not care which of the pair is lighter', () => {
    expect(contrastRatio('#8080b2', '#0a0a0f')).toBeCloseTo(contrastRatio('#0a0a0f', '#8080b2'), 5)
  })

  it('expands three-digit hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(contrastRatio('#ffffff', '#000000'), 5)
  })

  // A pinned pair that stopped being a plain hex must fail loudly rather than score 1:1 and pass.
  it('refuses a value it cannot read as a colour', () => {
    expect(() => contrastRatio('color-mix(in srgb, red 10%, blue)', '#000')).toThrow(
      /not a hex colour/i,
    )
  })
})

describe('findLiteralHues', () => {
  const retired = ['violet', 'cyan', 'ghost'] as const

  it('finds a retired hue behind a colour utility', () => {
    expect(findLiteralHues('<p className="text-violet" />', retired)).toEqual([
      { className: 'text-violet', line: 1 },
    ])
  })

  it('reports the line the offending class sits on', () => {
    const source = ['const a = 1', '', 'cn("border-cyan")'].join('\n')
    expect(findLiteralHues(source, retired)).toEqual([{ className: 'border-cyan', line: 3 }])
  })

  it('sees through responsive and state variants', () => {
    const found = findLiteralHues('sm:hover:text-violet focus-visible:ring-cyan', retired)
    expect(found.map((f) => f.className)).toEqual([
      'sm:hover:text-violet',
      'focus-visible:ring-cyan',
    ])
  })

  it('sees through an opacity modifier', () => {
    expect(findLiteralHues('bg-violet/30', retired).map((f) => f.className)).toEqual([
      'bg-violet/30',
    ])
  })

  // The trap this guard has to survive: `ghost` is a retired hue, and `bg-accent-ghost` is the
  // semantic class that replaces the tint it used to spell out.
  it('leaves a semantic class whose name merely ends in a retired word alone', () => {
    expect(findLiteralHues('bg-accent-ghost hover:bg-accent-dim text-fg-muted', retired)).toEqual(
      [],
    )
  })

  it('leaves prose alone', () => {
    expect(findLiteralHues('// the violet accent and the cyan info hue', retired)).toEqual([])
  })

  it('reports every offender, not just the first', () => {
    const found = findLiteralHues('text-violet border-violet text-cyan', retired)
    expect(found).toHaveLength(3)
  })

  // The spelling that hides: it is how runtime-dynamic colour and stylesheets are written, it never
  // appears in a `className`, and it goes on working — in `ice` — after the class of the same name
  // has stopped existing.
  it('finds a retired hue named as a token reference', () => {
    expect(findLiteralHues("color: 'var(--violet)',", retired)).toEqual([
      { className: 'var(--violet)', line: 1 },
    ])
  })

  it('finds one in a stylesheet declaration', () => {
    expect(findLiteralHues('  background: var(--cyan);', retired).map((f) => f.className)).toEqual([
      'var(--cyan)',
    ])
  })

  it('leaves a semantic token reference alone', () => {
    expect(findLiteralHues('background: var(--accent); color: var(--fg-muted);', retired)).toEqual(
      [],
    )
  })
})

describe('findUndefinedScales', () => {
  const undefined_ = ['3xs', '4xl'] as const

  it('finds an undefined scale name behind a spacing utility', () => {
    expect(findUndefinedScales('<div className="gap-3xs" />', undefined_)).toEqual([
      { className: 'gap-3xs', line: 1 },
    ])
  })

  it('reports the line the offending class sits on', () => {
    const source = ['const a = 1', '', 'cn("py-3xs")'].join('\n')
    expect(findUndefinedScales(source, undefined_)).toEqual([{ className: 'py-3xs', line: 3 }])
  })

  it('sees through responsive and state variants', () => {
    const found = findUndefinedScales('sm:gap-3xs hover:mt-4xl', undefined_)
    expect(found.map((f) => f.className)).toEqual(['sm:gap-3xs', 'hover:mt-4xl'])
  })

  // The whole point of the guard: a defined key must never fire, or contributors learn to ignore it.
  it('leaves every key the preset defines alone', () => {
    expect(
      findUndefinedScales('gap-2xs px-sm py-xs mt-md rounded-pill gap-3xl p-sp-lg', undefined_),
    ).toEqual([])
  })

  // Tailwind's own numeric scale survives the preset's `extend`, so it is not the guard's business.
  it("leaves Tailwind's built-in scale alone", () => {
    expect(findUndefinedScales('gap-4 p-0.5 mt-px -mx-2 inset-1/2', undefined_)).toEqual([])
  })

  it('leaves an arbitrary value alone', () => {
    expect(findUndefinedScales('min-h-[44px] after:-inset-[16px] gap-[3px]', undefined_)).toEqual(
      [],
    )
  })

  // The mirror of `bg-accent-ghost` in the hue guard: a longer name that merely ends in an
  // undefined one is a different class, not an offence.
  it('leaves a longer name that merely ends in an undefined one alone', () => {
    expect(findUndefinedScales('p-sp-4xl gap-my-3xs', undefined_)).toEqual([])
  })

  it('leaves prose alone', () => {
    expect(findUndefinedScales('// the 3xs step never existed, nor did 4xl', undefined_)).toEqual(
      [],
    )
  })

  it('reports every offender, not just the first', () => {
    expect(findUndefinedScales('gap-3xs mt-3xs rounded-4xl', undefined_)).toHaveLength(3)
  })

  // A sizing utility layers its own keyword scale on top of `spacing` (`max-w-4xl` is real), and
  // Tailwind states those as functions rather than objects, so they cannot be derived — and an
  // undeciable utility is left out rather than guessed at.
  it('leaves sizing utilities out, since their scales cannot be derived', () => {
    expect(findUndefinedScales('max-w-4xl w-4xl h-3xs', undefined_)).toEqual([])
  })
})

describe('srgbDistance', () => {
  it('is zero for a colour against itself', () => {
    expect(srgbDistance('#5ce1c0', '#5ce1c0')).toBe(0)
  })

  it('stays small for a near-identical pair — the failure the Hit/Miss pin exists to catch', () => {
    expect(srgbDistance('#5ce1c0', '#5ce1c8')).toBeLessThan(20)
  })

  it('is large for two colours a reader would never confuse', () => {
    expect(srgbDistance('#00e5ff', '#ffe600')).toBeGreaterThan(300)
  })

  it('refuses a value it cannot read, rather than scoring it zero', () => {
    expect(() => srgbDistance('#00e5ff', 'var(--color-miss)')).toThrow()
  })
})

describe('declaredPrimitives', () => {
  it('finds the literals no Theme restates', () => {
    expect(declaredPrimitives(CSS)).toEqual(['--cyan', '--violet'])
  })

  it('leaves out a literal a Theme does restate — that one is semantic', () => {
    expect(declaredPrimitives(CSS)).not.toContain('--bg')
  })

  it('leaves out chains and mixes, which have a primitive underneath rather than being one', () => {
    expect(declaredPrimitives(CSS)).not.toContain('--fg')
    expect(declaredPrimitives(CSS)).not.toContain('--tint')
    expect(declaredPrimitives(CSS)).not.toContain('--border-base')
  })
})

describe('RETIRED_HUE_CLASSES', () => {
  it('carries the primitive names the stylesheet declares', () => {
    expect(RETIRED_HUE_CLASSES).toContain('violet')
    expect(RETIRED_HUE_CLASSES).toContain('abyss')
    expect(RETIRED_HUE_CLASSES).not.toContain('accent')
  })

  // The three that never had a Tailwind class, and so were missed by a list built from the
  // preset's removals — while `var(--white)` pins a rule to `ice` exactly as `var(--violet)` does.
  it('carries the primitives that never had a class to lose', () => {
    expect(RETIRED_HUE_CLASSES).toContain('white')
    expect(RETIRED_HUE_CLASSES).toContain('deep-electric')
    expect(RETIRED_HUE_CLASSES).toContain('soft-electric')
  })
})

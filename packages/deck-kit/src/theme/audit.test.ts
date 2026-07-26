import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  declaredThemes,
  findLiteralHues,
  RETIRED_HUE_CLASSES,
  resolveTokens,
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
})

describe('RETIRED_HUE_CLASSES', () => {
  it('carries the primitive names the Tailwind preset no longer exposes', () => {
    expect(RETIRED_HUE_CLASSES).toContain('violet')
    expect(RETIRED_HUE_CLASSES).toContain('abyss')
    expect(RETIRED_HUE_CLASSES).not.toContain('accent')
  })
})

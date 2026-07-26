// The pure half of the deck's two Theme guards (ADR 0024). Text in, findings out — nothing here
// touches the filesystem, so every rule is testable against a string. The guards themselves are
// thin wrappers that read the real `tokens.css` and the real program sources and hand them here.
//
// One module rather than two: token resolution and banned-class detection are the same shape,
// have the same consumer, and belong in the same place.

/** A token name (`--accent`) to the literal it resolves to, with every `var()` chain followed. */
export type TokenMap = Record<string, string>

const COMMENTS = /\/\*[\s\S]*?\*\//g
const DECLARATION = /(--[\w-]+)\s*:\s*([^;]+);/g
const THEME_SELECTOR = /\[data-theme=['"]([\w-]+)['"]\]/g
/** `var(--name)` or `var(--name, fallback)` — the fallback is dropped once the name resolves. */
const VAR_REFERENCE = /var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g

// A chain deeper than this is a cycle, not a design.
const MAX_VAR_DEPTH = 16

function withoutComments(css: string): string {
  return css.replace(COMMENTS, '')
}

/**
 * The declarations of the block a selector opens. The token stylesheet has no nested rules, so the
 * first closing brace ends the block — a real CSS parser would be a dependency this earns nothing.
 */
function blockOf(css: string, selectorPattern: RegExp): string | null {
  const opening = selectorPattern.exec(css)
  if (opening === null) {
    return null
  }
  const start = css.indexOf('{', opening.index)
  const end = css.indexOf('}', start)
  if (start === -1 || end === -1) {
    return null
  }
  return css.slice(start + 1, end)
}

function declarationsOf(block: string): TokenMap {
  const out: TokenMap = {}
  for (const [, name, value] of block.matchAll(DECLARATION)) {
    out[name] = value.trim()
  }
  return out
}

/**
 * The names of every Theme the stylesheet declares a block for. `ice` is not among them: the root
 * block *is* `ice` (ADR 0024), which is exactly why it has no selector of its own.
 */
export function declaredThemes(css: string): string[] {
  const names = new Set<string>()
  for (const [, name] of withoutComments(css).matchAll(THEME_SELECTOR)) {
    names.add(name)
  }
  return [...names]
}

/**
 * The token values a named Theme resolves to: the root block, overlaid by the Theme's own block,
 * with `var()` chains followed to the literal underneath.
 *
 * Overlay-then-resolve is the whole point. A root token defined as `var(--accent)` has to come out
 * carrying the *Theme's* accent, not the one it was written against; resolving each block on its
 * own would bake `ice` into every chain a Theme did not restate.
 *
 * A value that is not a chain — `color-mix()`, an rgba, a length — comes back resolved but not
 * evaluated. That is deliberate: the contract never pins a derived token, so the guard never has
 * to become a colour engine.
 */
export function resolveTokens(css: string, theme: string): TokenMap {
  const clean = withoutComments(css)
  const root = blockOf(clean, /:root\s*(?={)/)
  const themeBlock = blockOf(clean, new RegExp(`\\[data-theme=['"]${theme}['"]\\]\\s*(?={)`))

  const raw: TokenMap = {
    ...declarationsOf(root ?? ''),
    ...declarationsOf(themeBlock ?? ''),
  }

  const resolved: TokenMap = {}
  for (const name of Object.keys(raw)) {
    resolved[name] = resolveValue(raw, raw[name], 0)
  }
  return resolved
}

function resolveValue(raw: TokenMap, value: string, depth: number): string {
  if (depth > MAX_VAR_DEPTH || !value.includes('var(')) {
    return value
  }
  return resolveValue(
    raw,
    value.replace(VAR_REFERENCE, (whole, name: string) => raw[name] ?? whole),
    depth + 1,
  )
}

/** A source file naming a hue instead of the role it plays, and where. */
export type LiteralHueFinding = {
  className: string
  /** 1-indexed, so a failure reads like an editor's gutter. */
  line: number
}

/**
 * The primitive colour names the Tailwind preset no longer exposes (ADR 0024). Naming one is what
 * pins a component to a single Theme and breaks the rest in that one corner, so it fails the
 * vocabulary guard instead of shipping.
 */
export const RETIRED_HUE_CLASSES = [
  'violet',
  'deep-violet',
  'soft-violet',
  'cyan',
  'deep-cyan',
  'soft-cyan',
  'hot-pink',
  'deep-pink',
  'soft-pink',
  'electric',
  'void',
  'abyss',
  'shadow',
  'slate',
  'muted',
  'dim',
  'ghost',
] as const

// Every Tailwind utility that takes a colour. Matching the prefix explicitly rather than "anything
// before the hue" is what keeps `bg-accent-ghost` — the semantic class that *replaces* a literal
// tint — from reading as an offence.
const COLOR_UTILITIES = [
  'accent',
  'bg',
  'border',
  'border-x',
  'border-y',
  'border-t',
  'border-r',
  'border-b',
  'border-l',
  'caret',
  'decoration',
  'divide',
  'fill',
  'from',
  'outline',
  'placeholder',
  'ring',
  'ring-offset',
  'shadow',
  'stroke',
  'text',
  'to',
  'via',
] as const

// Wide enough to catch a class wherever it is spelled — a className literal, a `cn()` argument, a
// lookup table's value — and narrow enough that ordinary prose never reaches the set below.
const CANDIDATE = /[A-Za-z][A-Za-z0-9:/[\]._-]*/g

/**
 * Every retired hue class in a source file. The finding names the class and the line, because the
 * fix is mechanical once you know both.
 */
export function findLiteralHues(
  source: string,
  retired: readonly string[] = RETIRED_HUE_CLASSES,
): LiteralHueFinding[] {
  const banned = new Set<string>()
  for (const utility of COLOR_UTILITIES) {
    for (const hue of retired) {
      banned.add(`${utility}-${hue}`)
    }
  }

  const findings: LiteralHueFinding[] = []
  source.split('\n').forEach((text, index) => {
    for (const [candidate] of text.matchAll(CANDIDATE)) {
      // `sm:hover:text-violet/30` — variants in front, an opacity modifier behind.
      const bare = candidate.split(':').pop()?.split('/')[0] ?? ''
      if (banned.has(bare)) {
        findings.push({ className: candidate, line: index + 1 })
      }
    }
  })
  return findings
}

/**
 * WCAG 2.x relative-luminance contrast between two hex colours. Refuses anything it cannot read
 * rather than guessing: a pinned pair that quietly stopped being a hex must fail the guard, not
 * score 1:1 and be waved through.
 */
export function contrastRatio(fg: string, bg: string): number {
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg))
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg))
  return (lighter + 0.05) / (darker + 0.05)
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function channels(hex: string): [number, number, number] {
  const value = hex.trim()
  const short = /^#([\da-f])([\da-f])([\da-f])$/i.exec(value)
  const long = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value)
  if (short) {
    return [short[1], short[2], short[3]].map((c) => parseInt(c + c, 16)) as [
      number,
      number,
      number,
    ]
  }
  if (long) {
    return [long[1], long[2], long[3]].map((c) => parseInt(c, 16)) as [number, number, number]
  }
  throw new Error(`${JSON.stringify(hex)} is not a hex colour`)
}

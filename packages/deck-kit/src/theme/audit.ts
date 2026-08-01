// The pure half of the deck's three Theme guards — the Contract, the vocabulary and the roster
// (ADR 0024). Text in, findings out — nothing here touches the filesystem, so every rule is
// testable against a string. The guards themselves are thin wrappers that read the real
// `tokens.css` and the real program sources and hand them here.
//
// One module rather than three: token resolution, banned-class detection and the contrast
// arithmetic are all string-in / number-or-findings-out, share the same three consumers, and
// splitting them would buy an import graph and nothing else.

/** A token name (`--accent`) to the literal it resolves to, with every `var()` chain followed. */
export type TokenMap = Record<string, string>

const COMMENTS = /\/\*[\s\S]*?\*\//g
const DECLARATION = /(--[\w-]+)\s*:\s*([^;]+);/g
const THEME_SELECTOR = /\[data-theme=['"]([\w-]+)['"]\]/g
/** `var(--name)` or `var(--name, fallback)` — the fallback is dropped once the name resolves. */
const VAR_REFERENCE = /var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g

/** A chain deeper than this is a cycle, not a design. */
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

/** The only shape a primitive is written in — a bare hex, never a `var()` chain or a mix. */
const HEX_LITERAL = /^#[\da-f]{3,8}$/i

/**
 * The primitives a stylesheet declares: a `:root` colour written as a literal that no Theme block
 * restates. That is exactly what makes a name `ice`'s vocabulary rather than the deck's, and it is
 * why the semantic tokens that also happen to be literals — `--fg-subtle`, `--fg-on-accent` — do
 * not come back: every Theme redefines them.
 *
 * Derived from the stylesheet rather than listed, so the vocabulary guard's ban list can be held to
 * it. A primitive added tomorrow is banned tomorrow, instead of whenever someone remembers.
 */
export function declaredPrimitives(css: string): string[] {
  const clean = withoutComments(css)
  const root = declarationsOf(blockOf(clean, /:root\s*(?={)/) ?? '')

  const restated = new Set<string>()
  for (const theme of declaredThemes(css)) {
    const block = blockOf(clean, new RegExp(`\\[data-theme=['"]${theme}['"]\\]\\s*(?={)`))
    for (const name of Object.keys(declarationsOf(block ?? ''))) {
      restated.add(name)
    }
  }

  return Object.keys(root)
    .filter((name) => HEX_LITERAL.test(root[name]) && !restated.has(name))
    .sort()
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

/** A class one of the vocabulary guards objects to, and where it sits. */
export type ClassFinding = {
  className: string
  /** 1-indexed, so a failure reads like an editor's gutter. */
  line: number
}

/**
 * Every primitive `tokens.css` declares (ADR 0024). Naming one is what pins a component to a single
 * Theme and breaks the rest in that one corner, so it fails the vocabulary guard instead of
 * shipping.
 *
 * The list is *every primitive*, not *what the Tailwind preset dropped*, and the difference is the
 * hole this closes. `--white`, `--deep-electric` and `--soft-electric` never had a class to lose,
 * so a list built from the preset's removals walks past them — while `var(--white)` in a program's
 * stylesheet pins that rule to `ice` exactly as surely as `var(--violet)` would. A primitive is
 * banned because it is `ice`'s vocabulary, not because Tailwind once spelled it.
 *
 * `white` therefore also bans Tailwind's own built-in `text-white`. That is the intent: the deck's
 * brightest foreground is `--fg-strong`, which a Theme restates and `#fff` does not.
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
  'deep-electric',
  'soft-electric',
  'void',
  'abyss',
  'shadow',
  'slate',
  'muted',
  'dim',
  'ghost',
  'white',
] as const

/**
 * Every Tailwind utility that takes a colour. Matching the prefix explicitly rather than "anything
 * before the hue" is what keeps `bg-accent-ghost` — the semantic class that *replaces* a literal
 * tint — from reading as an offence.
 */
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

/**
 * Wide enough to catch a class wherever it is spelled — a className literal, a `cn()` argument, a
 * lookup table's value — and narrow enough that ordinary prose never reaches the set below.
 */
const CANDIDATE = /[A-Za-z][A-Za-z0-9:/[\]._-]*/g

/** Every `utility-suffix` pair the two vocabularies forbid, materialised for exact matching. */
function bannedPairs(utilities: readonly string[], suffixes: readonly string[]): Set<string> {
  const banned = new Set<string>()
  for (const utility of utilities) {
    for (const suffix of suffixes) {
      banned.add(`${utility}-${suffix}`)
    }
  }
  return banned
}

/**
 * Every class in a source file that matches a banned `utility-suffix` pair exactly, with its line.
 *
 * Shared by both vocabulary guards so the rule for reading a class off a source line — which
 * variants to strip, which modifiers to ignore — exists once. Two copies of it would have to stay in
 * step by hand, and a guard that quietly stops recognising `sm:hover:` is a guard that passes.
 */
function findBannedClasses(source: string, banned: Set<string>): ClassFinding[] {
  const findings: ClassFinding[] = []
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
 * Every literal hue a source file names, by class or by token reference, with the line it sits on —
 * because the fix is mechanical once you know both.
 *
 * Two spellings, because a component can reach past the semantic layer two ways and both leave the
 * same defect. `text-violet` is the obvious one. `var(--violet)` is the one that hides: it is how
 * runtime-dynamic colour gets written, it lives in `.css` and in inline styles rather than in a
 * `className`, and it keeps working — in `ice` — after the class of the same name has stopped
 * existing.
 */
export function findLiteralHues(
  source: string,
  retired: readonly string[] = RETIRED_HUE_CLASSES,
): ClassFinding[] {
  const findings = findBannedClasses(source, bannedPairs(COLOR_UTILITIES, retired))
  const bannedTokens = new Set(retired.map((hue) => `--${hue}`))

  source.split('\n').forEach((text, index) => {
    for (const [, token] of text.matchAll(VAR_REFERENCE)) {
      if (bannedTokens.has(token)) {
        findings.push({ className: `var(${token})`, line: index + 1 })
      }
    }
  })
  // The two spellings are collected in separate passes, so sort back into gutter order — a file that
  // names a hue both ways should read top to bottom.
  return findings.sort((a, b) => a.line - b.line)
}

/**
 * Steps a contributor reaches for by extrapolating past either end of the deck's scale. Naming one
 * renders *nothing* — Tailwind never generates the class — so the failure is silent in exactly the
 * way a literal hue's is, and `gap-3xs` shipped a destructive control flush against its neighbour on
 * the strength of it.
 *
 * The `Nxs` / `Nxl` shape only, because that is the only place the scale's multiplier prefix ever
 * attaches. `2sm` and `2lg` are spellings nobody writes, and a deny list is read less the more of it
 * is theatre.
 */
const EXTRAPOLATED_STEPS = ['3xs', '4xs', '5xs', '4xl', '5xl'] as const

/**
 * Steps the base spacing scale answers but the section macro scale does not — `sp-*` runs `xs` to
 * `2xl` where the base runs `2xs` to `3xl`. Sharing a vocabulary is exactly what makes these
 * reachable: `gap-3xl` is real, so `p-sp-3xl` reads as real too, and it is not.
 */
const SECTION_ONLY_GAPS = ['2xs', '3xl'] as const

/**
 * Every step name the two spacing vocabularies forbid — the bare ones, plus their `sp-` spellings.
 *
 * A deny list rather than a check against the whole scale, and the asymmetry is the point. Validating
 * every scale utility would mean deciding `text-` (`fontSize` ∪ `colors` ∪ `text-center`), `border-`
 * (`borderColor` ∪ `colors` ∪ `borderWidth`) and the sizing utilities, whose scales Tailwind states
 * as functions rather than objects — undecidable without becoming a Tailwind resolver, and noisy
 * long before it was useful. These names are decidable, and the guard's own completeness test holds
 * the list to the preset: define `3xs` for real and this list has to give it up.
 *
 * `sp-*` is spelled out step by step rather than caught by a prefix rule because it is a *second
 * scale under the same utilities*, not a longer name: `p-sp-2xl` is real and `p-sp-3xl` renders
 * nothing, and only the step tells them apart.
 */
export const UNDEFINED_SCALE_NAMES: readonly string[] = [
  ...EXTRAPOLATED_STEPS,
  ...[...EXTRAPOLATED_STEPS, ...SECTION_ONLY_GAPS].map((step) => `sp-${step}`),
]

/**
 * The utilities that draw from `spacing` and `borderRadius` alone. Tailwind's own steps for both are
 * numeric (`px` aside), so an alphabetic suffix here can only have come from the preset — which is
 * what makes an undefined one decidable.
 *
 * Three families are deliberately absent, all for the same reason — the guard can only ban a step it
 * can prove is undefined, and for these it cannot:
 *
 * - the sizing utilities (`w`, `h`, `max-w`, `min-h`, `size`) each layer their own keyword scale over
 *   `spacing` — `max-w-4xl` is real — and Tailwind states those scales as functions rather than
 *   objects, so there is nothing to read them out of;
 * - `text-` is three namespaces at once (`fontSize` ∪ `colors` ∪ `text-center`/`text-wrap`/…), and
 *   `border-` likewise (`borderColor` ∪ `colors` ∪ `borderWidth`);
 * - `tracking-`, `leading-` and `duration-` draw from scales the completeness test below does not
 *   derive from, so a ban on one of their steps would be an unchecked claim.
 *
 * Each is a gap, not an oversight: an unguarded `leading-4xl` is a smaller cost than a guard that
 * cries wolf, which is how a guard stops being read.
 */
const SCALE_UTILITIES = [
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  'inset',
  'inset-x',
  'inset-y',
  'top',
  'right',
  'bottom',
  'left',
  'translate-x',
  'translate-y',
  'indent',
  'rounded',
  'rounded-t',
  'rounded-r',
  'rounded-b',
  'rounded-l',
] as const

/**
 * Every scale step a source file names that no key answers, with the line it sits on.
 *
 * Same shape as `findLiteralHues` on purpose: an exact match against a materialised set of
 * `utility-step` pairs, so an arbitrary value is never a candidate and a name that merely *ends* in
 * an undefined step — `gap-my-3xs` — is a different class rather than an offence.
 */
export function findUndefinedScales(
  source: string,
  names: readonly string[] = UNDEFINED_SCALE_NAMES,
): ClassFinding[] {
  return findBannedClasses(source, bannedPairs(SCALE_UTILITIES, names))
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

/**
 * Straight-line distance between two hex colours in sRGB, 0 to ~441.
 *
 * Deliberately the crudest instrument that answers the question, because the question is only
 * "are these two the same colour with a different name". Luminance contrast cannot answer it —
 * two foregrounds can be unmistakable and still measure 1.2:1 — and the instrument that answers it
 * properly, a perceptual ΔE in a uniform colour space, is the colour engine these guards must not
 * become. This is arithmetic on six hex digits, and it separates *near-identical* from *distinct*,
 * which is the whole job.
 */
export function srgbDistance(a: string, b: string): number {
  const [ar, ag, ab] = channels(a)
  const [br, bg, bb] = channels(b)
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
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

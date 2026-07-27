// The Theme roster and the rule for resolving one (ADR 0024). Pure, and deliberately free of the
// DOM: the same rule is hand-inlined as a blocking script in each themed program's HTML, where it
// runs before first paint and cannot import anything. That copy is untestable; this is not, and
// the roster guard holds the two together.

/**
 * Every Theme the deck ships, in the order the picker lists them. `ice` is first because it is the
 * default and the fallback.
 *
 * **The roster is no longer width-capped.** The control used to cycle, which traded discoverability
 * for width and only held while any Theme was two activations away — so the roster stopped at four
 * and a test enforced it (ADR 0024). The picker is a popover now: it lists the whole roster rather
 * than cycling it, so growth is a design-and-contrast question, not a control-shape one, and the
 * ceiling is retired. What still holds — `ice` first and default, every Theme named once — lives in
 * the tests beside this file. Each name also has to appear in the Theme blocks in `tokens.css` and
 * in the three hand-inlined pre-paint scripts; the roster guard keeps the copies in step.
 */
export const THEMES = ['ice', 'construct', 'chiba', 'kuang', 'ougou', 'solitude', 'onyx'] as const

export type Theme = (typeof THEMES)[number]

/** The look the deck shipped with, so nothing changes for anyone who never asks for a Theme. */
export const DEFAULT_THEME: Theme = 'ice'

/**
 * Per origin, and that is a fact rather than a choice: the programs deploy to four origins on a
 * public-suffix domain, so no storage and no cookie can carry a choice between them.
 */
export const THEME_STORAGE_KEY = 'cyberdeck:theme'

/** Set on the document element, which is what the Theme blocks in `tokens.css` select on. */
export const THEME_ATTRIBUTE = 'data-theme'

/**
 * The Theme a stored value means. Absent, unreadable or unrecognised all mean `ice` — a value from
 * a Theme that has since been retired must not leave someone with an unstyled deck.
 */
export function resolveTheme(stored: string | null | undefined): Theme {
  return THEMES.includes(stored as Theme) ? (stored as Theme) : DEFAULT_THEME
}

// The Theme roster and the rule for resolving one (ADR 0024). Pure, and deliberately free of the
// DOM: the same rule is hand-inlined as a blocking script in each themed program's HTML, where it
// runs before first paint and cannot import anything. That copy is untestable; this is not, and
// the roster guard holds the two together.

/**
 * Every Theme the deck ships, in the order the control cycles them. `ice` is first because it is
 * the default and the fallback.
 *
 * **The roster stops at four.** The control cycles rather than presenting the options, which trades
 * discoverability for width — the header's right edge is already contested at mobile widths. With
 * three Themes any Theme is at most two activations away; past about four, the control has to
 * become a popover and this array is the wrong shape for the feature (ADR 0024). The test beside
 * this file is what makes that a decision rather than a note nobody reads.
 */
export const THEMES = ['ice', 'construct', 'chiba'] as const

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

/** The next Theme in the roster, wrapping. */
export function nextTheme(current: Theme): Theme {
  const index = THEMES.indexOf(current)
  return THEMES[(index + 1) % THEMES.length]
}

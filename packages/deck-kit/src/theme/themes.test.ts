import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, resolveTheme, THEMES } from './themes'

describe('the roster', () => {
  it('opens on the look the deck shipped with, so nothing changes for anyone who never asks', () => {
    expect(THEMES[0]).toBe(DEFAULT_THEME)
    expect(DEFAULT_THEME).toBe('ice')
  })

  // The four-Theme ceiling is gone with the cycling control it existed to force (ADR 0024): the
  // popover lists the roster rather than stepping through it, so there is no width-based cap to
  // assert. What survives is the invariant the picker still relies on — a Theme names itself once,
  // so the popover never lists a duplicate.
  it('names each Theme once', () => {
    expect(new Set(THEMES).size).toBe(THEMES.length)
  })
})

describe('resolveTheme', () => {
  it.each(THEMES)('recognises %s', (theme) => {
    expect(resolveTheme(theme)).toBe(theme)
  })

  it('falls back when nothing is stored', () => {
    expect(resolveTheme(null)).toBe(DEFAULT_THEME)
    expect(resolveTheme(undefined)).toBe(DEFAULT_THEME)
  })

  // A Theme that has since been retired must not leave someone with an unstyled deck.
  it('falls back on a value it does not recognise', () => {
    expect(resolveTheme('neon')).toBe(DEFAULT_THEME)
    expect(resolveTheme('')).toBe(DEFAULT_THEME)
  })
})

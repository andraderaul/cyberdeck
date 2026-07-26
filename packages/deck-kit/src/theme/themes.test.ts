import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, nextTheme, resolveTheme, THEMES } from './themes'

describe('the roster', () => {
  it('opens on the look the deck shipped with, so nothing changes for anyone who never asks', () => {
    expect(THEMES[0]).toBe(DEFAULT_THEME)
    expect(DEFAULT_THEME).toBe('ice')
  })

  // ADR 0024 put a number on it: a control that cycles trades discoverability for width, and the
  // trade stops paying at about four Themes. This failing is the signal to reach for a popover,
  // not to raise the number.
  it('stops at four — past that the control has to stop cycling', () => {
    expect(THEMES.length).toBeLessThanOrEqual(4)
  })

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

describe('nextTheme', () => {
  it('walks the roster in order', () => {
    expect(nextTheme('ice')).toBe('construct')
    expect(nextTheme('construct')).toBe('chiba')
  })

  it('wraps, so every Theme is reachable from every other', () => {
    expect(nextTheme(THEMES[THEMES.length - 1])).toBe(THEMES[0])
  })

  it('returns to where it started after a full lap', () => {
    let theme = DEFAULT_THEME
    for (let lap = 0; lap < THEMES.length; lap++) {
      theme = nextTheme(theme)
    }
    expect(theme).toBe(DEFAULT_THEME)
  })
})

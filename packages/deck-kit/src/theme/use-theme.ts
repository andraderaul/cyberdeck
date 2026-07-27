import { useCallback, useEffect, useState } from 'react'
import { resolveTheme, THEME_ATTRIBUTE, THEME_STORAGE_KEY, THEMES, type Theme } from './themes'

/** Safari private mode / a sandboxed iframe — silently ignore. */
function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

/** A Theme that cannot be remembered is still worth having for this session. */
function persist(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Nothing to do — see above.
  }
}

/**
 * The Theme in force, the whole roster to offer, and the action that selects one by name (ADR 0024).
 *
 * The roster comes back so the popover has one source for the list it renders — the same array the
 * resolution rule and the guards are written against, never a second copy to drift. `setTheme`
 * replaced `cycle` when the control stopped stepping through the roster and started presenting it.
 *
 * It reads the stored choice rather than the attribute the pre-paint script set, because the two
 * agree by construction and storage is the thing that outlives the tab. Nothing is written until
 * somebody actually picks, so a program that is only ever opened leaves no trace.
 */
export function useTheme(): {
  theme: Theme
  themes: readonly Theme[]
  setTheme: (theme: Theme) => void
} {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme(readStored()))

  useEffect(() => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    persist(next)
  }, [])

  return { theme, themes: THEMES, setTheme }
}

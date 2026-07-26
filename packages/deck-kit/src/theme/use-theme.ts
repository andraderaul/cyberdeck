import { useCallback, useEffect, useState } from 'react'
import { nextTheme, resolveTheme, THEME_ATTRIBUTE, THEME_STORAGE_KEY, type Theme } from './themes'

// Safari private mode / a sandboxed iframe — silently ignore.
function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

function persist(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // A Theme that cannot be remembered is still worth having for this session.
  }
}

/**
 * The Theme in force and the one control that changes it (ADR 0024).
 *
 * It reads the stored choice rather than the attribute the pre-paint script set, because the two
 * agree by construction and storage is the thing that outlives the tab. Nothing is written until
 * somebody actually picks, so a program that is only ever opened leaves no trace.
 */
export function useTheme(): { theme: Theme; cycle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readStored()))

  useEffect(() => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
  }, [theme])

  const cycle = useCallback(() => {
    const next = nextTheme(theme)
    setTheme(next)
    persist(next)
  }, [theme])

  return { theme, cycle }
}

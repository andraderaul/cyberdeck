// Where the Source comes from on first render, and where it goes so a reload does not lose it.
// Everything here is local: the fragment never reaches a server even when the URL is requested,
// and nothing is written anywhere but this browser.

import { useEffect, useState } from 'react'
import { decode } from '../golem/share'

const STORAGE_KEY = 'golem:source'

export interface LoadedSource {
  source: string
  /** Set when a share link was present but unreadable, so the Console can say so. */
  problem: string | null
  /** False until the fragment has been read, since decoding is asynchronous. */
  ready: boolean
}

/**
 * Resolves the starting Source. Precedence is **share link, then saved work, then the example**:
 * a link someone sent you is an explicit request to see *their* program, so it wins over whatever
 * happened to be in the editor — and because the link is never consumed, reloading it shows the
 * shared program again rather than silently reverting to yours.
 */
export function useSourceLoading(fallback: string): LoadedSource {
  const [state, setState] = useState<LoadedSource>({
    source: fallback,
    problem: null,
    ready: false,
  })

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      const fragment = window.location.hash.replace(/^#/, '')

      if (fragment !== '') {
        const result = await decode(fragment)
        if (cancelled) {
          return
        }
        setState(
          result.ok
            ? { source: result.source, problem: null, ready: true }
            : { source: readSaved() ?? fallback, problem: result.message, ready: true },
        )
        return
      }

      setState({ source: readSaved() ?? fallback, problem: null, ready: true })
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [fallback])

  return state
}

/** Saves the Source so an accidental reload does not cost the session's work. */
export function saveSource(source: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, source)
  } catch {
    // Safari private mode / sandboxed iframe — silently ignore.
  }
}

function readSaved(): string | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved === null || saved.trim() === '' ? null : saved
  } catch {
    return null
  }
}

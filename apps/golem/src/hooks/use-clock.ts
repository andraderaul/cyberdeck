// The Clock driver. Deliberately thin and shallow: it decides how many `step` calls fit in a
// frame and nothing else. Everything worth testing was pushed into `step`, so this is verified by
// running the app rather than by unit tests — testing rAF scheduling would test the browser.
//
// Because it always yields between frames, an infinite loop in user code cannot freeze the tab
// and `stop` always lands. That property is the reason the driver exists at all.

import { useCallback, useEffect, useRef, useState } from 'react'

/** Steps per second, or `max` for as many as the frame budget allows. */
export type ClockRate = number | 'max'

/** Slow enough to follow by eye — the product is watching the machine think, not finishing fast. */
export const DEFAULT_RATE = 8

// At `max`, how long a frame may spend stepping before yielding. Well inside a 16ms frame, so
// the browser still paints and still sees input.
const FRAME_BUDGET_MS = 8

// A run that falls far behind (a backgrounded tab) should resume, not stampede to catch up.
const MAX_CATCHUP_STEPS = 512

export interface Clock {
  running: boolean
  rate: ClockRate
  start: () => void
  stop: () => void
  setRate: (rate: ClockRate) => void
}

/**
 * Runs the steps this frame owes at a fixed rate. Fractional steps carry across frames in `owed`,
 * so a slow clock keeps an even cadence instead of rounding down to nothing every frame.
 */
function stepForElapsed(
  elapsed: number,
  stepsPerSecond: number,
  owed: { current: number },
  advance: () => boolean,
): boolean {
  owed.current = Math.min(owed.current + (elapsed * stepsPerSecond) / 1000, MAX_CATCHUP_STEPS)

  while (owed.current >= 1) {
    owed.current -= 1
    if (!advance()) {
      return false
    }
  }
  return true
}

/** Steps until the frame budget runs out — `clock max`, bounded so the browser still paints. */
function stepForBudget(advance: () => boolean): boolean {
  const deadline = performance.now() + FRAME_BUDGET_MS
  do {
    if (!advance()) {
      return false
    }
  } while (performance.now() < deadline)
  return true
}

/**
 * Drives `advance` on a rAF loop at the configured rate. `advance` performs one step and returns
 * `false` when there is nothing left to run, which stops the clock on its own.
 */
export function useClock(advance: () => boolean): Clock {
  const [running, setRunning] = useState(false)
  const [rate, setRateState] = useState<ClockRate>(DEFAULT_RATE)

  // Read by the frame loop, which outlives any single render's closure.
  const advanceRef = useRef(advance)
  const rateRef = useRef<ClockRate>(rate)
  const runningRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const owedRef = useRef(0)
  const lastRef = useRef(0)

  advanceRef.current = advance
  rateRef.current = rate

  const halt = useCallback(() => {
    runningRef.current = false
    setRunning(false)
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (runningRef.current) {
      return
    }
    runningRef.current = true
    setRunning(true)
    owedRef.current = 0
    lastRef.current = performance.now()

    const frame = (now: number) => {
      if (!runningRef.current) {
        return
      }

      const elapsed = now - lastRef.current
      lastRef.current = now

      const keepGoing =
        rateRef.current === 'max'
          ? stepForBudget(advanceRef.current)
          : stepForElapsed(elapsed, rateRef.current, owedRef, advanceRef.current)

      if (!keepGoing) {
        halt()
        return
      }
      frameRef.current = requestAnimationFrame(frame)
    }

    frameRef.current = requestAnimationFrame(frame)
  }, [halt])

  const setRate = useCallback((next: ClockRate) => {
    // Applied through the ref as well, so a change lands mid-run rather than at the next start.
    rateRef.current = next
    setRateState(next)
  }, [])

  useEffect(() => halt, [halt])

  return { running, rate, start, stop: halt, setRate }
}

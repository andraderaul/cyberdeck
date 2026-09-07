import { useRecording } from '@cyberdeck/deck-kit/recording'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import {
  isDatamoshSupported,
  type MoshTake,
  moshPlan,
  playMosh,
  startMoshCapture,
} from '../export/mosh'

/**
 * `capturing` is the take the user is performing; `rendering` is the moshed result playing back
 * onto the scratch canvas while it is recorded. The second phase runs as long as the first, and it
 * is not skippable: WebCodecs hands back chunks, not a file (ADR 0026).
 */
export type MoshState = 'idle' | 'capturing' | 'rendering'

interface Options {
  // The same neutral pair Recording uses: 'start' — nothing was produced, pressing mosh again is
  // the whole of the advice; 'export' — a finished mosh failed to hand off (ADR 0006).
  onError?: (reason: 'start' | 'export') => void
  filename: (ext: string) => string
}

/**
 * The datamosh output path (ADR 0026), Live Source only. It never reaches into `applyChain` — it
 * takes the canvas the Chain painted, encodes it, mangles the chunk sequence and decodes the
 * result — so the Chain stays the pure fold ADR 0017 made it and Recording's contract does not
 * move.
 *
 * The file comes out of Recording's own primitive: the moshed frames are painted onto a scratch
 * canvas that `useRecording` captures, which is the re-record route ADR 0026 weighed against owning
 * a WebM muxer. That is why the mosh control needs `MediaRecorder` as well as WebCodecs, and why
 * the output lands at Recording's ~15fps.
 */
export function useDatamosh(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  { onError, filename }: Options,
) {
  const scratchRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const takeRef = useRef<MoshTake | null>(null)
  const [state, setState] = useState<MoshState>('idle')
  // Its own timer rather than the inner `useRecording`'s: that one starts at the render phase, and
  // what the badge has to show is how long the *take* has been running.
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const {
    isSupported: canRecord,
    startRecording,
    stopRecording,
  } = useRecording(scratchRef, {
    onError,
    filename,
  })

  const [hasCodecs] = useState(() => isDatamoshSupported())

  const startMosh = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || takeRef.current) {
      return
    }
    try {
      takeRef.current = startMoshCapture(canvas, scratchRef.current)
    } catch {
      onError?.('start')
      return
    }
    setState('capturing')
    setElapsedSeconds(0)
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
  }, [canvasRef, onError])

  const stopMosh = useCallback(async () => {
    const take = takeRef.current
    if (!take) {
      return
    }
    takeRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setState('rendering')
    try {
      const chunks = await take.finish()
      const plan = moshPlan(chunks.map((chunk) => chunk.type))
      if (plan.length === 0) {
        throw new Error('no key chunk to mosh from')
      }
      startRecording()
      await playMosh(chunks, plan, scratchRef.current)
    } catch {
      // 'start' covers both shapes this can take — a mosh that produced nothing, and one that died
      // part-way. Whatever was painted before it did is still a take, so the `finally` hands it
      // over rather than throwing it away, and the wording (`datamoshFailed`) says "didn't finish"
      // so the toast and the download beside it don't contradict each other.
      onError?.('start')
    } finally {
      stopRecording()
      setState('idle')
      setElapsedSeconds(0)
    }
  }, [onError, startRecording, stopRecording])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      takeRef.current?.abort()
    }
  }, [])

  return {
    // Two APIs, one absence: the re-record route makes MediaRecorder a real requirement here, not a
    // conflation of Record's floor with this one.
    isSupported: hasCodecs && canRecord,
    state,
    elapsedSeconds,
    startMosh,
    stopMosh,
  }
}

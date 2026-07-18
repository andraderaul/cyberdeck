// The canvas Recording core, shared across the deck (ADR 0014). Vocabulary-neutral: failures surface
// as a neutral reason code the app words via its own Errors catalog, and the filename is injected —
// so the MediaRecorder plumbing is shared while every string stays app-side. Records the canvas the
// caller already painted (ADR 0007, ADR 0006).

import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { shareOrDownloadBlob } from '../utils/share'

/** Preference order, best-quality first — the browser picks the first it can honour (ADR 0007). */
const PREFERRED_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
]

/** Matches the Live Source's ~15fps rAF loop — no point capturing frames the source never painted. */
const RECORDING_FPS = 15

export function detectMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null
  }
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return null
}

export function formatElapsedTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function mimeToExtension(mimeType: string): string {
  if (mimeType.startsWith('video/mp4')) {
    return 'mp4'
  }
  return 'webm'
}

/** ADR 0007: where this is false the Record control is not rendered at all — no GIF fallback. */
export function isRecordingSupported(): boolean {
  return (
    detectMimeType() !== null &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'captureStream' in HTMLCanvasElement.prototype
  )
}

export interface UseRecordingOptions {
  // A neutral reason code, worded app-side: 'start' — the take never began, and pressing record
  // again is the whole of the advice; 'export' — a good take failed to hand off, and no retry
  // brings it back.
  onError?: (reason: 'start' | 'export') => void
  // The core resolves ext from the chosen mime type and asks the app for the name (the app passes
  // Date.now() and its own outputFilename), so the container-driven extension is shared while the
  // naming vocabulary stays app-side.
  filename: (ext: string) => string
}

/**
 * Records the given canvas — the pixels already painted, so this is never datamosh. Only reads the
 * visible canvas and never touches the loop that paints it. Failures report a neutral reason via
 * `onError`; the app maps it to its own wording (ADR 0006).
 */
export function useRecording(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  { onError, filename }: UseRecordingOptions,
) {
  const [isSupported] = useState(() => isRecordingSupported())
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop()
  }, [])

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    // Every way this can fail is the same story to the user — the take never began, and pressing
    // record again is the whole of the advice. A browser with no supported format shouldn't be
    // reachable at all (ADR 0007 hides the control), so it lands here rather than in its own branch.
    const mimeType = detectMimeType()
    if (!mimeType) {
      onError?.('start')
      return
    }

    let recorder: MediaRecorder
    try {
      const stream = (
        canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }
      ).captureStream(RECORDING_FPS)
      recorder = new MediaRecorder(stream, { mimeType })
    } catch {
      onError?.('start')
      return
    }

    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    recorder.onstop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      const blob = new Blob(chunksRef.current, { type: mimeType })
      void shareOrDownloadBlob(blob, filename(mimeToExtension(mimeType))).catch(() => {
        onError?.('export')
      })

      recorderRef.current = null
      chunksRef.current = []
      setIsRecording(false)
      setElapsedSeconds(0)
    }

    // Started only once the handlers are attached: a chunk arriving before `ondataavailable` is set
    // would be dropped from the take.
    try {
      recorder.start()
    } catch {
      onError?.('start')
      return
    }

    recorderRef.current = recorder
    setIsRecording(true)
    setElapsedSeconds(0)

    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
  }, [canvasRef, onError, filename])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
    }
  }, [])

  return { isSupported, isRecording, elapsedSeconds, startRecording, stopRecording }
}

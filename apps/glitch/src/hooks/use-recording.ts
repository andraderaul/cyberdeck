// Hand-copied from ASCII//Convert (ADR 0011 — there is deliberately no shared `packages/`), with one
// divergence: failures are reported through `onError` rather than swallowed, since ADR 0006 wants
// every operational failure surfaced and Recording is one of this app's four output paths. The
// naming goes through this app's own `outputFilename`, but lands on the same stamped shape.

import { shareOrDownloadBlob } from '@cyberdeck/deck-kit/utils'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Errors } from '../errors/app-error'
import { mimeToExtension, outputFilename } from '../export/output'

/** Preference order, best-quality first — the browser picks the first it can honour (ADR 0007). */
const PREFERRED_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
]

/** Matches the Live Source's ~15fps rAF loop — no point capturing frames the Pipeline never paints. */
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

/** ADR 0007: where this is false the Record control is not rendered at all — no GIF fallback. */
export function isRecordingSupported(): boolean {
  return (
    detectMimeType() !== null &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'captureStream' in HTMLCanvasElement.prototype
  )
}

/**
 * Records the output canvas — the pixels the Pipeline already painted, so this is not datamosh
 * (CONTEXT.md). Like Capture, it only reads the visible canvas and never touches the rAF loop
 * that paints it. `onError` receives an already-worded message, ready for a toast (ADR 0006).
 */
export function useRecording(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onError?: (message: string) => void,
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
      onError?.(Errors.recordingFailed().message)
      return
    }

    let recorder: MediaRecorder
    try {
      const stream = (
        canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }
      ).captureStream(RECORDING_FPS)
      recorder = new MediaRecorder(stream, { mimeType })
    } catch {
      onError?.(Errors.recordingFailed().message)
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
      const filename = outputFilename('recording', {
        timestamp: Date.now(),
        ext: mimeToExtension(mimeType),
      })
      void shareOrDownloadBlob(blob, filename).catch(() => {
        onError?.(Errors.recordingExportFailed().message)
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
      onError?.(Errors.recordingFailed().message)
      return
    }

    recorderRef.current = recorder
    setIsRecording(true)
    setElapsedSeconds(0)

    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
  }, [canvasRef, onError])

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

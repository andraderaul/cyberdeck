// Hand-copied from ASCII//Convert (ADR 0011 — there is deliberately no shared `packages/`), with
// one divergence: the Recording is named through this app's `outputFilename`, and glitch filenames
// carry no timestamp.

import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { mimeToExtension, outputFilename } from '../export/output'
import { shareOrDownloadBlob } from '../utils/share'

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
 * that paints it.
 */
export function useRecording(canvasRef: RefObject<HTMLCanvasElement | null>) {
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

    const mimeType = detectMimeType()
    if (!mimeType) {
      return
    }

    let stream: MediaStream
    try {
      stream = (
        canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }
      ).captureStream(RECORDING_FPS)
    } catch {
      return
    }

    const recorder = new MediaRecorder(stream, { mimeType })
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
      void shareOrDownloadBlob(
        blob,
        outputFilename('recording', { ext: mimeToExtension(mimeType) }),
      )

      recorderRef.current = null
      chunksRef.current = []
      setIsRecording(false)
      setElapsedSeconds(0)
    }

    recorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
    setElapsedSeconds(0)

    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
  }, [canvasRef])

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

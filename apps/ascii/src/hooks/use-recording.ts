import { shareOrDownloadBlob } from '@cyberdeck/deck-kit/utils'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { mimeToExtension, outputFilename } from '../export/output'

const PREFERRED_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
]

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

export function isRecordingSupported(): boolean {
  return (
    detectMimeType() !== null &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'captureStream' in HTMLCanvasElement.prototype
  )
}

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
      ).captureStream(15)
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
      const ext = mimeToExtension(mimeType)
      void shareOrDownloadBlob(blob, outputFilename('recording', { timestamp: Date.now(), ext }))

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

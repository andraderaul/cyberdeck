import type { RefObject } from 'react'
import { Errors } from '../errors/app-error'
import { formatElapsedTime } from '../hooks/use-recording'
import { isTouchDevice } from '../utils/device'
import { shareOrDownloadBlob } from '../utils/share'
import { useToastError } from './toast-provider'
import Button from './ui/button'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  asciiRows: string[]
  isLive?: boolean
  hasAiConfig: boolean
  onAnalyze: () => void
  canRecord?: boolean
  isRecording?: boolean
  elapsedSeconds?: number
  onStartRecording?: () => void
  onStopRecording?: () => void
}

async function shareOrDownloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        // toBlob failed — fall back to synchronous toDataURL download
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = filename
        a.click()
        resolve()
        return
      }
      try {
        await shareOrDownloadBlob(blob, filename)
        resolve()
      } catch (err) {
        reject(err)
      }
    }, 'image/png')
  })
}

export default function DownloadBar({
  canvasRef,
  asciiRows,
  isLive,
  hasAiConfig,
  onAnalyze,
  canRecord,
  isRecording,
  elapsedSeconds = 0,
  onStartRecording,
  onStopRecording,
}: Props) {
  const toastError = useToastError()

  async function exportPng() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    try {
      await shareOrDownloadCanvas(canvas, 'ascii-art.png')
    } catch {
      toastError(Errors.exportFailed('png').message)
    }
  }

  function exportTxt() {
    if (!asciiRows.length) {
      return
    }
    try {
      const blob = new Blob([asciiRows.join('\n')], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'ascii-art.txt'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      toastError(Errors.exportFailed('txt').message)
    }
  }

  async function capture() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    try {
      await shareOrDownloadCanvas(canvas, `ascii-capture-${Date.now()}.png`)
    } catch {
      toastError(Errors.captureFailed().message)
    }
  }

  const analyzeBtn = hasAiConfig ? (
    <Button variant="analyze" onClick={onAnalyze} className="flex-1 sm:flex-none">
      {isTouchDevice ? '◈ analyze' : '◈ scan & analyze'}
    </Button>
  ) : null

  if (isLive) {
    if (isRecording) {
      return (
        <div className="flex gap-xs sm:gap-sm sm:justify-end items-center">
          <div
            role="status"
            aria-live="polite"
            className="font-mono text-xs text-hot-pink border border-hot-pink px-sm py-2xs rounded-xs"
          >
            ● {formatElapsedTime(elapsedSeconds)}
          </div>
          <Button variant="danger" onClick={capture} className="flex-1 sm:flex-none">
            ◎ capture
          </Button>
          <Button variant="danger" onClick={onStopRecording} className="flex-1 sm:flex-none">
            ⏹ stop
          </Button>
        </div>
      )
    }

    return (
      <div className="flex gap-xs sm:gap-sm sm:justify-end">
        {analyzeBtn}
        <Button variant="danger" onClick={capture} className="flex-1 sm:flex-none">
          ◎ capture
        </Button>
        {canRecord && (
          <Button variant="record" onClick={onStartRecording} className="flex-1 sm:flex-none">
            ⏺ record
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-xs sm:gap-sm sm:justify-end">
      {analyzeBtn}
      <Button variant="primary" onClick={exportPng} className="flex-1 sm:flex-none">
        export png
      </Button>
      <Button variant="secondary" onClick={exportTxt} className="flex-1 sm:flex-none">
        export txt
      </Button>
    </div>
  )
}

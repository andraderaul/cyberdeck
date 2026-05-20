import type { RefObject } from 'react'
import { useState } from 'react'
import { Errors } from '../errors/app-error'
import { formatElapsedTime } from '../hooks/use-recording'
import { cn } from '../utils/cn'
import { isTouchDevice } from '../utils/device'
import { shareOrDownloadBlob } from '../utils/share'
import { useToastError } from './toast-provider'
import Button from './ui/button'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  asciiRows: string[]
  isLive?: boolean
  hasImage?: boolean
  canvasDimensions?: { w: number; h: number } | null
  hasAiConfig: boolean
  onAnalyze: () => void
  canRecord?: boolean
  isRecording?: boolean
  elapsedSeconds?: number
  onStartRecording?: () => void
  onStopRecording?: () => void
}

const MAX_EXPORT_DIM = 8192

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
  hasImage,
  canvasDimensions,
  hasAiConfig,
  onAnalyze,
  canRecord,
  isRecording,
  elapsedSeconds = 0,
  onStartRecording,
  onStopRecording,
}: Props) {
  const toastError = useToastError()
  const [scale, setScale] = useState<1 | 2 | 4>(1)

  async function exportPng() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    try {
      let target: HTMLCanvasElement = canvas
      if (scale > 1) {
        const offscreen = document.createElement('canvas')
        offscreen.width = canvas.width * scale
        offscreen.height = canvas.height * scale
        const ctx = offscreen.getContext('2d')
        if (ctx) {
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height)
          target = offscreen
        }
        // if ctx is unavailable, fall back to unscaled canvas rather than exporting a blank PNG
      }
      await shareOrDownloadCanvas(target, 'ascii-art.png')
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
    <div className="flex flex-col gap-xs">
      {hasImage && !isLive && (
        <div className="flex items-center gap-xs">
          <span className="text-fg-subtle text-xs font-mono">png scale</span>
          {([1, 2, 4] as const).map((s) => {
            const exceedsCap =
              canvasDimensions !== null &&
              canvasDimensions !== undefined &&
              (canvasDimensions.w * s > MAX_EXPORT_DIM || canvasDimensions.h * s > MAX_EXPORT_DIM)
            return (
              <button
                key={s}
                type="button"
                aria-pressed={scale === s}
                disabled={exceedsCap}
                onClick={() => setScale(s)}
                className={cn(
                  'font-mono text-xs px-sm rounded-xs border transition-colors min-h-[44px]',
                  exceedsCap
                    ? 'border-base text-fg-subtle opacity-40 cursor-not-allowed'
                    : scale === s
                      ? 'border-violet text-violet'
                      : 'border-base text-fg-muted hover:border-dim',
                )}
              >
                {s}×
              </button>
            )
          })}
          <span className="text-fg-subtle text-xs ml-xs">
            {canvasDimensions ? `${canvasDimensions.w * scale}×${canvasDimensions.h * scale}` : '—'}
          </span>
        </div>
      )}
      <div className="flex gap-xs sm:gap-sm sm:justify-end">
        {analyzeBtn}
        <Button variant="primary" onClick={exportPng} className="flex-1 sm:flex-none">
          export png
        </Button>
        <Button variant="secondary" onClick={exportTxt} className="flex-1 sm:flex-none">
          export txt
        </Button>
      </div>
    </div>
  )
}

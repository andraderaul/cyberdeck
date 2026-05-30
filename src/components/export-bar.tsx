import type { RefObject } from 'react'
import { useState } from 'react'
import { Errors } from '../errors/app-error'
import { isTouchDevice } from '../utils/device'
import { shareOrDownloadCanvas } from '../utils/share'
import { useToastError } from './toast-provider'
import Button from './ui/button'
import Chip from './ui/chip'

const MAX_EXPORT_DIM = 8192

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  asciiRows: string[]
  hasImage?: boolean
  canvasDimensions?: { w: number; h: number } | null
  hasAiConfig: boolean
  onAnalyze: () => void
}

export default function ExportBar({
  canvasRef,
  asciiRows,
  hasImage,
  canvasDimensions,
  hasAiConfig,
  onAnalyze,
}: Props) {
  const toastError = useToastError()
  const [scale, setScale] = useState<1 | 2 | 4>(1)

  async function exportPng() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
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
    }
    try {
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

  return (
    <div className="flex flex-col gap-xs">
      {hasImage && (
        <div className="flex items-center gap-xs">
          <span className="text-fg-subtle text-xs font-mono">png scale</span>
          {([1, 2, 4] as const).map((s) => {
            const exceedsCap =
              canvasDimensions != null &&
              (canvasDimensions.w * s > MAX_EXPORT_DIM || canvasDimensions.h * s > MAX_EXPORT_DIM)
            return (
              <Chip
                key={s}
                selected={scale === s}
                disabled={exceedsCap}
                onClick={() => setScale(s)}
              >
                {s}×
              </Chip>
            )
          })}
          <span className="text-fg-subtle text-xs ml-xs">
            {canvasDimensions ? `${canvasDimensions.w * scale}×${canvasDimensions.h * scale}` : '—'}
          </span>
        </div>
      )}
      <div className="flex gap-xs sm:gap-sm sm:justify-end">
        {hasAiConfig && (
          <Button variant="analyze" onClick={onAnalyze} className="flex-1 sm:flex-none">
            {isTouchDevice ? '◈ analyze' : '◈ scan & analyze'}
          </Button>
        )}
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

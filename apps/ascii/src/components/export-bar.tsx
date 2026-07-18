import { Button } from '@cyberdeck/deck-kit/ui'
import { isTouchDevice, shareOrDownloadCanvas } from '@cyberdeck/deck-kit/utils'
import type { RefObject } from 'react'
import { useState } from 'react'
import { Errors } from '../errors/app-error'
import { outputFilename, type PngScale, planPngExport } from '../export/output'
import { useToastError } from './toast-provider'
import Chip from './ui/chip'

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
  const [scale, setScale] = useState<PngScale>(1)
  const targetDimensions = planPngExport(canvasDimensions, scale).targetDimensions

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
      await shareOrDownloadCanvas(target, outputFilename('png-export'))
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
      a.download = outputFilename('txt-export')
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
          {([1, 2, 4] as const).map((s) => (
            <Chip
              key={s}
              selected={scale === s}
              disabled={planPngExport(canvasDimensions, s).exceedsCap}
              onClick={() => setScale(s)}
            >
              {s}×
            </Chip>
          ))}
          <span className="text-fg-subtle text-xs ml-xs">
            {targetDimensions ? `${targetDimensions.w}×${targetDimensions.h}` : '—'}
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

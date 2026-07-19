import { Button, Chip, useToastError } from '@cyberdeck/deck-kit/ui'
import { isTouchDevice, shareOrDownloadCanvas } from '@cyberdeck/deck-kit/utils'
import { type RefObject, useState } from 'react'
import { Errors } from '../errors/app-error'
import { outputFilename, type PngScale, planPngExport } from '../export/output'
import AiConfigBanner from './ai-config-banner'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  asciiRows: string[]
  isLive: boolean
  canvasDimensions?: { w: number; h: number } | null
  hasAiConfig: boolean
  onAnalyze: () => void
  onConfigureAi: () => void
  canRecord?: boolean
  isRecording?: boolean
  onStartRecording?: () => void
}

/**
 * The Control Strip's OUT tab: one surface for every way the result leaves, gated by Source.
 *
 * A Source Image offers PNG and TXT Export; a Live Source offers Capture and Recording. That gating
 * is what the two sibling bars used to encode by existing separately — the availability is
 * unchanged, only its home is. AI Analysis rides here because it is where it already lived: a
 * terminal action on the current canvas, beside the outputs rather than in the editing tabs.
 *
 * Stopping a Recording is deliberately absent. A take runs while the user keeps working in PRESETS
 * and EDIT, so its stop is the canvas REC badge, reachable from every tab (ADR 0020).
 */
export default function OutputPanel({
  canvasRef,
  asciiRows,
  isLive,
  canvasDimensions,
  hasAiConfig,
  onAnalyze,
  onConfigureAi,
  canRecord,
  isRecording,
  onStartRecording,
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

  async function capture() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    try {
      await shareOrDownloadCanvas(canvas, outputFilename('capture', { timestamp: Date.now() }))
    } catch {
      toastError(Errors.captureFailed().message)
    }
  }

  return (
    <div className="flex flex-col gap-xs">
      {/* Rehomed from above the bars into the tab it advertises: the banner sells AI Analysis, and
          this is now the only place that control appears. */}
      {!hasAiConfig && <AiConfigBanner onConfigure={onConfigureAi} />}

      {/* Scale is a PNG Export setting, so it only shows where PNG Export does. */}
      {!isLive && (
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
        {/* Hidden mid-take, as it was in LiveSourceBar: a modal over a running Recording would put
            the user somewhere they can't see the take they're still shooting. */}
        {hasAiConfig && !isRecording && (
          <Button variant="analyze" onClick={onAnalyze} className="flex-1 sm:flex-none">
            {isTouchDevice ? '◈ analyze' : '◈ scan & analyze'}
          </Button>
        )}
        {isLive ? (
          <>
            <Button variant="danger" onClick={capture} className="flex-1 sm:flex-none">
              ◎ capture
            </Button>
            {/* ADR 0007 hides Record outright where MediaRecorder can't serve. While a take runs
                the start control goes: the stop is on the canvas badge. */}
            {canRecord && !isRecording && (
              <Button variant="record" onClick={onStartRecording} className="flex-1 sm:flex-none">
                ⏺ record
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="primary" onClick={exportPng} className="flex-1 sm:flex-none">
              export png
            </Button>
            <Button variant="secondary" onClick={exportTxt} className="flex-1 sm:flex-none">
              export txt
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

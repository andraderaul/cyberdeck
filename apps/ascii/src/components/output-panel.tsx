import { Button, Chip, useToastError } from '@cyberdeck/deck-kit/ui'
import { isTouchDevice, shareOrDownloadCanvas } from '@cyberdeck/deck-kit/utils'
import { type ComponentProps, type RefObject, useState } from 'react'
import { CANVAS_BACKGROUND, type RenderInstruction } from '../ascii/renderer'
import { MONOSPACE_CHAR_WIDTH_RATIO } from '../ascii/types'
import { Errors } from '../errors/app-error'
import { buildHtmlDocument } from '../export/html-document'
import { outputFilename, type PngScale, planPngExport } from '../export/output'
import AiConfigBanner from './ai-config-banner'

/** Same download path for both text Exports — only the bytes, the type and the name differ. */
function downloadText(text: string, mimeType: string, filename: string): void {
  const blob = new Blob([text], { type: mimeType })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * What each Export keeps of the result and what it throws away, in the user's words.
 *
 * The distinction was already written down — CONTEXT.md's **HTML Export** entry is where "o PNG
 * Export guarda a cor e destrói o texto, o TXT Export guarda o texto e larga a cor" lives — and it
 * had never left the glossary, so three equal-looking buttons each dropped a different half of the
 * grade with nothing on screen to say which (#369).
 */
const EXPORT_TRADEOFFS = {
  png: 'color · no selectable text',
  txt: 'selectable text · no color',
  html: 'both · opens offline',
} as const

interface ExportControlProps {
  format: keyof typeof EXPORT_TRADEOFFS
  label: string
  variant: ComponentProps<typeof Button>['variant']
  onClick: () => void
}

/**
 * One Export: its control and its tradeoff as a single column, so the cost is read in the same
 * glance as the button rather than a click away behind an overlay.
 *
 * `aria-describedby` is what carries the copy to a screen reader, which would otherwise still hear
 * three equal buttons — the exact reading the visible layout exists to fix.
 */
function ExportControl({ format, label, variant, onClick }: ExportControlProps) {
  const tradeoffId = `export-tradeoff-${format}`
  return (
    <div className="flex flex-col gap-2xs flex-1 sm:flex-none">
      <Button variant={variant} onClick={onClick} aria-describedby={tradeoffId}>
        {label}
      </Button>
      {/* `sm:px-2xs` only: one line each at that breakpoint, and three captions flush against the
          row gap read as one sentence. On mobile they already wrap, and the padding would only buy
          the separation back in extra lines. */}
      <span id={tradeoffId} className="text-fg-muted text-xs font-mono text-center sm:px-2xs">
        {EXPORT_TRADEOFFS[format]}
      </span>
    </div>
  )
}

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  asciiRows: string[]
  renderInstructions: RenderInstruction[]
  resolution: number
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
 * A Source Image offers PNG, TXT and HTML Export; a Live Source offers Capture and Recording. That
 * gating is what the two sibling bars used to encode by existing separately — the availability is
 * unchanged, only its home is. AI Analysis rides here because it is where it already lived: a
 * terminal action on the current canvas, beside the outputs rather than in the editing tabs.
 *
 * Stopping a Recording is deliberately absent. A take runs while the user keeps working in PRESETS
 * and EDIT, so its stop is the canvas REC badge, reachable from every tab (ADR 0020).
 */
export default function OutputPanel({
  canvasRef,
  asciiRows,
  renderInstructions,
  resolution,
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
      downloadText(asciiRows.join('\n'), 'text/plain', outputFilename('txt-export'))
    } catch {
      toastError(Errors.exportFailed('txt').message)
    }
  }

  function exportHtml() {
    if (!renderInstructions.length) {
      return
    }
    try {
      // The preview's own cell metrics: Resolution is the type size it paints at, and the pitch it
      // positions on is that times MONOSPACE_CHAR_WIDTH_RATIO. Handing the document the same two is
      // what puts its grid on the preview's proportions.
      const html = buildHtmlDocument(renderInstructions, {
        charWidth: resolution * MONOSPACE_CHAR_WIDTH_RATIO,
        charHeight: resolution,
        background: CANVAS_BACKGROUND,
      })
      downloadText(html, 'text/html', outputFilename('html-export'))
    } catch {
      toastError(Errors.exportFailed('html').message)
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

      {/* `items-start` so the tradeoff copy hangs below its own control: stretching would drag
          Analyze, Capture and Record down to the height of a column that is not theirs. */}
      <div className="flex flex-wrap items-start gap-xs sm:gap-sm sm:justify-end">
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
            <ExportControl format="png" label="export png" variant="primary" onClick={exportPng} />
            <ExportControl
              format="txt"
              label="export txt"
              variant="secondary"
              onClick={exportTxt}
            />
            <ExportControl
              format="html"
              label="export html"
              variant="secondary"
              onClick={exportHtml}
            />
          </>
        )}
      </div>
    </div>
  )
}

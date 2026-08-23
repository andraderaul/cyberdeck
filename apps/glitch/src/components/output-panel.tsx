import { Button, useToastError, useToastInfo } from '@cyberdeck/deck-kit/ui'
import { shareOrDownloadBlob, shareOrDownloadCanvas } from '@cyberdeck/deck-kit/utils'
import type { RefObject } from 'react'
import { Errors } from '../errors/app-error'
import { outputFilename } from '../export/output'
import type { Chain } from '../glitch/chain'
import { encodeChain } from '../glitch/chain-codec'
import { copyCanvasToClipboard, isClipboardImageSupported } from '../utils/copy'
import IconLabelButton from './icon-label-button'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  chain: Chain
  isLive?: boolean
  canRecord?: boolean
  isRecording?: boolean
  onStartRecording?: () => void
}

/**
 * The Control Strip's OUT tab: takes the result out. Capture, PNG Export, Copy and Recording are
 * the same act on a different Source or destination — the canvas *is* the output every way, so each
 * only reads the pixels already painted and never touches the rAF loop that painted them.
 *
 * The Chain export is the one output here that isn't the picture: it takes the *look* out, so a
 * Chain built by hand can be kept and shared where only the six Presets could carry structure
 * before (ADR 0017). Import is deliberately elsewhere — a brought look is applied like a Preset,
 * and lives in the Strip's PRESETS tab beside them (ADR 0020).
 *
 * Stopping a Recording is deliberately **not** here. A take runs while the user keeps working in
 * PRESETS and EDIT, so its stop lives on the canvas REC badge, reachable from every tab (ADR 0020).
 * This panel only ever starts one.
 */
export default function OutputPanel({
  canvasRef,
  chain,
  isLive,
  canRecord,
  isRecording,
  onStartRecording,
}: Props) {
  const toastError = useToastError()
  const toastInfo = useToastInfo()

  async function exportPng() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    try {
      await shareOrDownloadCanvas(canvas, outputFilename(isLive ? 'capture' : 'png-export'))
    } catch {
      toastError(Errors.exportFailed().message)
    }
  }

  async function copyPng() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    if (!isClipboardImageSupported()) {
      toastError(Errors.copyUnsupported().message)
      return
    }
    try {
      await copyCanvasToClipboard(canvas)
      // A Copy leaves the screen unchanged — without this the act has no feedback at all
      toastInfo('copied to clipboard')
    } catch {
      toastError(Errors.copyFailed().message)
    }
  }

  async function exportChain() {
    try {
      const file = new Blob([encodeChain(chain)], { type: 'application/json' })
      await shareOrDownloadBlob(file, outputFilename('chain'))
    } catch {
      toastError(Errors.chainExportFailed().message)
    }
  }

  return (
    <div className="flex gap-xs sm:gap-sm sm:justify-end">
      {/* Set apart from the three beside it — those take the picture out, this takes the look —
          and glyph-only below `sm`, where four labelled controls stop fitting one row. */}
      <IconLabelButton
        variant="secondary"
        onClick={exportChain}
        glyph="⬇"
        label="export chain"
        className="shrink-0"
      />
      <Button variant="secondary" onClick={copyPng} className="flex-1 sm:flex-none">
        copy
      </Button>
      <Button variant="primary" onClick={exportPng} className="flex-1 sm:flex-none">
        {isLive ? 'capture' : 'export png'}
      </Button>
      {/* Recording is a Live Source act, and ADR 0007 hides it outright where MediaRecorder
          can't serve — so both conditions gate the control's existence, not its disabled state.
          While a take runs the start control goes: the stop is on the canvas badge. */}
      {isLive && canRecord && !isRecording && (
        <Button variant="record" onClick={onStartRecording} className="flex-1 sm:flex-none">
          ⏺ record
        </Button>
      )}
    </div>
  )
}

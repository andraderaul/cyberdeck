import { formatElapsedTime } from '@cyberdeck/deck-kit/recording'
import { Button, useToastError, useToastInfo } from '@cyberdeck/deck-kit/ui'
import { cn, shareOrDownloadCanvas } from '@cyberdeck/deck-kit/utils'
import type { RefObject } from 'react'
import { Errors } from '../errors/app-error'
import { outputFilename } from '../export/output'
import { copyCanvasToClipboard, isClipboardImageSupported } from '../utils/copy'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  isLive?: boolean
  canRecord?: boolean
  isRecording?: boolean
  elapsedSeconds?: number
  onStartRecording?: () => void
  onStopRecording?: () => void
}

/**
 * Takes the result out. Capture, PNG Export, Copy and Recording are the same act on a different
 * Source or destination — the canvas *is* the output every way, so each only reads the pixels
 * already painted and never touches the rAF loop that painted them.
 */
export default function ExportBar({
  canvasRef,
  isLive,
  canRecord,
  isRecording,
  elapsedSeconds = 0,
  onStartRecording,
  onStopRecording,
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

  return (
    <div className={cn('flex gap-xs sm:gap-sm sm:justify-end', isRecording && 'items-center')}>
      {isRecording && (
        <div
          role="status"
          aria-live="polite"
          className="font-mono text-xs text-hot-pink border border-hot-pink px-sm py-2xs rounded-xs"
        >
          ● {formatElapsedTime(elapsedSeconds)}
        </div>
      )}
      <Button variant="secondary" onClick={copyPng} className="flex-1 sm:flex-none">
        copy
      </Button>
      <Button variant="primary" onClick={exportPng} className="flex-1 sm:flex-none">
        {isLive ? 'capture' : 'export png'}
      </Button>
      {/* Recording is a Live Source act, and ADR 0007 hides it outright where MediaRecorder
          can't serve — so both conditions gate the control's existence, not its disabled state. */}
      {isLive &&
        (isRecording ? (
          <Button variant="danger" onClick={onStopRecording} className="flex-1 sm:flex-none">
            ⏹ stop
          </Button>
        ) : (
          canRecord && (
            <Button variant="record" onClick={onStartRecording} className="flex-1 sm:flex-none">
              ⏺ record
            </Button>
          )
        ))}
    </div>
  )
}

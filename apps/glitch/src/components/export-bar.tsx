import type { RefObject } from 'react'
import { Errors } from '../errors/app-error'
import { outputFilename } from '../export/output'
import { copyCanvasToClipboard, isClipboardImageSupported } from '../utils/copy'
import { shareOrDownloadCanvas } from '../utils/share'
import { useToastError, useToastInfo } from './toast-provider'
import Button from './ui/button'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  isLive?: boolean
}

/**
 * Takes the result out. Capture, PNG Export and Copy are the same act on a different Source or
 * destination — the canvas *is* the output every way, so each only reads the pixels already
 * painted and never touches the rAF loop that painted them.
 */
export default function ExportBar({ canvasRef, isLive }: Props) {
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
    <div className="flex gap-xs sm:gap-sm sm:justify-end">
      <Button variant="secondary" onClick={copyPng} className="flex-1 sm:flex-none">
        copy
      </Button>
      <Button variant="primary" onClick={exportPng} className="flex-1 sm:flex-none">
        {isLive ? 'capture' : 'export png'}
      </Button>
    </div>
  )
}

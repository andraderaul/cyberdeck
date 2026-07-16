import type { RefObject } from 'react'
import { Errors } from '../errors/app-error'
import { outputFilename } from '../export/output'
import { shareOrDownloadCanvas } from '../utils/share'
import { useToastError } from './toast-provider'
import Button from './ui/button'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
}

export default function ExportBar({ canvasRef }: Props) {
  const toastError = useToastError()

  async function exportPng() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    try {
      await shareOrDownloadCanvas(canvas, outputFilename('png-export'))
    } catch {
      toastError(Errors.exportFailed().message)
    }
  }

  return (
    <div className="flex gap-xs sm:gap-sm sm:justify-end">
      <Button variant="primary" onClick={exportPng} className="flex-1 sm:flex-none">
        export png
      </Button>
    </div>
  )
}

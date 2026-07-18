import { formatElapsedTime } from '@cyberdeck/deck-kit/recording'
import { Button, useToastError } from '@cyberdeck/deck-kit/ui'
import { cn, isTouchDevice, shareOrDownloadCanvas } from '@cyberdeck/deck-kit/utils'
import type { RefObject } from 'react'
import { Errors } from '../errors/app-error'
import { outputFilename } from '../export/output'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  hasAiConfig: boolean
  onAnalyze: () => void
  canRecord?: boolean
  isRecording?: boolean
  elapsedSeconds?: number
  onStartRecording?: () => void
  onStopRecording?: () => void
}

export default function LiveSourceBar({
  canvasRef,
  hasAiConfig,
  onAnalyze,
  canRecord,
  isRecording,
  elapsedSeconds = 0,
  onStartRecording,
  onStopRecording,
}: Props) {
  const toastError = useToastError()

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
      {!isRecording && hasAiConfig && (
        <Button variant="analyze" onClick={onAnalyze} className="flex-1 sm:flex-none">
          {isTouchDevice ? '◈ analyze' : '◈ scan & analyze'}
        </Button>
      )}
      <Button variant="danger" onClick={capture} className="flex-1 sm:flex-none">
        ◎ capture
      </Button>
      {isRecording ? (
        <Button variant="danger" onClick={onStopRecording} className="flex-1 sm:flex-none">
          ⏹ stop
        </Button>
      ) : (
        canRecord && (
          <Button variant="record" onClick={onStartRecording} className="flex-1 sm:flex-none">
            ⏺ record
          </Button>
        )
      )}
    </div>
  )
}

import { type RefObject, useEffect, useRef } from 'react'
import { convertImage } from '../ascii/converter'
import { resizeImage } from '../ascii/image-utils'
import { computeFrame, MONOSPACE_CHAR_WIDTH_RATIO, paintFrame } from '../ascii/renderer'
import type { ConversionSettings } from '../ascii/types'

const LIVE_SOURCE_TARGET_FPS = 15
const LIVE_SOURCE_FRAME_INTERVAL_MS = 1000 / LIVE_SOURCE_TARGET_FPS

interface Props {
  sourceImage: HTMLImageElement | null
  sourceVideo: HTMLVideoElement | null
  settings: ConversionSettings
  onConverted: (rows: string[]) => void
  canvasRef: RefObject<HTMLCanvasElement>
  isMirrored?: boolean
  isRecording?: boolean
}

function renderFrame(
  source: CanvasImageSource,
  canvasEl: HTMLCanvasElement,
  hiddenEl: HTMLCanvasElement,
  settings: ConversionSettings,
  fontFamily: string,
  onConverted?: (rows: string[]) => void,
): void {
  const ctx = canvasEl.getContext('2d')
  const hiddenCtx = hiddenEl.getContext('2d')
  if (!ctx || !hiddenCtx) {
    return
  }

  const { resolution, brightness, contrast, charset } = settings
  const charW = resolution * MONOSPACE_CHAR_WIDTH_RATIO
  const charH = resolution
  const cols = Math.floor(canvasEl.width / charW)
  const rows = Math.floor(canvasEl.height / charH)

  if (cols < 1 || rows < 1) {
    return
  }

  hiddenEl.width = cols
  hiddenEl.height = rows

  const cells = convertImage(hiddenCtx, source, cols, rows, { brightness, contrast, charset })
  const { instructions, asciiRows } = computeFrame(cells, settings)
  paintFrame(ctx, instructions, resolution, fontFamily)
  onConverted?.(asciiRows)
}

export default function AsciiCanvas({
  sourceImage,
  sourceVideo,
  settings,
  onConverted,
  canvasRef,
  isMirrored,
  isRecording,
}: Props) {
  const hiddenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const renderStaticRef = useRef<(() => void) | null>(null)
  const fontFamilyRef = useRef(
    getComputedStyle(document.body).getPropertyValue('--font-mono').trim() || 'monospace',
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceImage) {
      renderStaticRef.current = null
      return
    }
    const fn = () =>
      renderFrame(
        resizeImage(sourceImage),
        canvas,
        hiddenRef.current,
        settings,
        fontFamilyRef.current,
        onConverted,
      )
    renderStaticRef.current = fn
    fn()
  }, [sourceImage, settings, onConverted, canvasRef])

  // rAF loop throttled to ~15fps — see ADR 0002 for Web Worker upgrade path
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceVideo) {
      return
    }

    const video = sourceVideo
    let rafId: number
    let lastTime = 0

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop)
      if (now - lastTime < LIVE_SOURCE_FRAME_INTERVAL_MS) {
        return
      }
      lastTime = now
      if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        renderFrame(video, canvas, hiddenRef.current, settings, fontFamilyRef.current)
      }
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [sourceVideo, settings, canvasRef])

  // Sync canvas pixel buffer to display size — eliminates CSS scaling distortion
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width === 0 || height === 0) {
        return
      }
      canvas.width = Math.floor(width)
      canvas.height = Math.floor(height)
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        renderStaticRef.current?.()
      }, 50)
    })

    observer.observe(canvas)
    return () => {
      observer.disconnect()
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [canvasRef])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block bg-bg [image-rendering:pixelated]"
        style={isMirrored ? { transform: 'scaleX(-1)' } : undefined}
      />
      {isRecording && (
        <div
          data-testid="rec-indicator"
          className="absolute top-xs right-xs flex items-center gap-2xs font-mono text-xs text-hot-pink motion-safe:animate-pulse pointer-events-none select-none"
          aria-hidden="true"
        >
          ● REC
        </div>
      )}
    </div>
  )
}

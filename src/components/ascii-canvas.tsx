import { type RefObject, useEffect, useRef } from 'react'
import { resizeImage } from '../ascii/image-utils'
import { renderFrame } from '../ascii/render-frame'
import type { ConversionSettings } from '../ascii/types'

const LIVE_SOURCE_FRAME_INTERVAL_MS = 1000 / 15

interface Props {
  sourceImage: HTMLImageElement | null
  sourceVideo: HTMLVideoElement | null
  settings: ConversionSettings
  onConverted: (rows: string[]) => void
  canvasRef: RefObject<HTMLCanvasElement>
  isMirrored?: boolean
  isRecording?: boolean
  isLive?: boolean
  onClearSource?: () => void
  onDimensionsChange?: (w: number, h: number) => void
}

export default function AsciiCanvas({
  sourceImage,
  sourceVideo,
  settings,
  onConverted,
  canvasRef,
  isMirrored,
  isRecording,
  isLive,
  onClearSource,
  onDimensionsChange,
}: Props) {
  const hiddenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const renderStaticRef = useRef<(() => void) | null>(null)
  const onDimensionsChangeRef = useRef(onDimensionsChange)
  useEffect(() => {
    onDimensionsChangeRef.current = onDimensionsChange
  })
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
      onDimensionsChangeRef.current?.(Math.floor(width), Math.floor(height))
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
      <div className="absolute top-xs right-xs flex items-center gap-xs">
        {isLive && (
          <span className="flex items-center gap-2xs font-mono text-xs text-hot-pink border border-hot-pink px-sm py-2xs rounded-xs select-none">
            <span className="motion-safe:animate-pulse" aria-hidden="true">
              ◉
            </span>{' '}
            LIVE
          </span>
        )}
        {isRecording && (
          <span
            data-testid="rec-indicator"
            className="flex items-center gap-2xs font-mono text-xs text-hot-pink border border-hot-pink px-sm py-2xs rounded-xs select-none"
            aria-hidden="true"
          >
            <span className="motion-safe:animate-pulse">●</span> REC
          </span>
        )}
        {onClearSource && (
          <button
            type="button"
            onClick={onClearSource}
            title="clear source"
            aria-label="clear source"
            className="font-mono text-xs text-fg-muted border border-base px-sm py-2xs rounded-xs cursor-pointer transition-colors duration-fast hover:text-fg hover:border-strong"
          >
            ✕ clear
          </button>
        )}
      </div>
    </div>
  )
}

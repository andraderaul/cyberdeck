import { type RefObject, useEffect, useRef } from 'react'
import { DATASET, skeletonScale } from '../atlas/dataset'
import { paintFrame } from '../atlas/paint'
import { project } from '../atlas/project'
import type { Scale, Viewport } from '../atlas/types'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement>
}

/**
 * The imperative shell around the canvas: it owns *when* to repaint (on resize), sizes the backing
 * store to the device pixel ratio, and hands the pure `project → paintFrame` pair a viewport. It
 * holds no scale logic of its own — `#225` paints at the fixed `skeletonScale`; `#226` lifts the
 * scale to live state and drives the repaint from the gesture.
 */
export default function AtlasCanvas({ canvasRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const scale: Scale = skeletonScale(DATASET.points)

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      const cssWidth = container.clientWidth
      const cssHeight = container.clientHeight
      if (cssWidth === 0 || cssHeight === 0) {
        return
      }
      // Backing store in device pixels, drawn in CSS pixels — the map stays crisp on HiDPI.
      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
      const viewport: Viewport = { width: canvas.width, height: canvas.height }
      paintFrame(ctx, project(DATASET.points, scale, viewport), viewport)
    }

    render()
    const observer = new ResizeObserver(render)
    observer.observe(container)
    return () => observer.disconnect()
  }, [canvasRef])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        aria-label="world connected-capacity map"
        className="w-full h-full block bg-bg"
      />
    </div>
  )
}

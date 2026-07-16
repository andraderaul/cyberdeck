import { type RefObject, useEffect, useRef } from 'react'
import { renderGlitchFrame } from '../glitch/render-frame'
import type { GlitchSettings } from '../glitch/types'

interface Props {
  sourceImage: HTMLImageElement
  settings: GlitchSettings
  canvasRef: RefObject<HTMLCanvasElement>
  onClearSource: () => void
}

/** Lifecycle coordinator: decides *when* to render — once per Source Image or GlitchSettings change. */
export default function GlitchCanvas({ sourceImage, settings, canvasRef, onClearSource }: Props) {
  const hiddenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    renderGlitchFrame(sourceImage, canvas, hiddenRef.current, settings)
  }, [sourceImage, settings, canvasRef])

  return (
    <div className="relative w-full h-full">
      {/* The canvas carries the output's own pixel dimensions; CSS only fits it to the frame. */}
      <canvas
        ref={canvasRef}
        aria-label="glitched preview"
        className="w-full h-full block object-contain bg-bg [image-rendering:pixelated]"
      />
      <div className="absolute top-xs right-xs flex items-center gap-xs">
        <button
          type="button"
          onClick={onClearSource}
          title="clear source"
          aria-label="clear source"
          className="font-mono text-xs text-fg-muted border border-base px-sm py-2xs rounded-xs cursor-pointer transition-colors duration-fast hover:text-fg hover:border-strong"
        >
          ✕ clear
        </button>
      </div>
    </div>
  )
}

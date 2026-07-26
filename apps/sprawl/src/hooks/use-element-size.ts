import { type RefObject, useEffect, useState } from 'react'

export interface Size {
  width: number
  height: number
}

/**
 * Tracks an element's CSS-pixel size, so the projection can run in CSS space once and be shared by
 * the canvas paint (scaled to devicePixelRatio at draw time) and the DOM overlays (labels, hover).
 * One ResizeObserver, one source of truth for the frame's dimensions.
 */
export function useElementSize(ref: RefObject<HTMLElement>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return size
}

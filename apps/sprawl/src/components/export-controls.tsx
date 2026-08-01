import { TOUCH_TARGET_HEIGHT, useToastError, useToastInfo } from '@cyberdeck/deck-kit/ui'
import { cn, shareOrDownloadCanvas } from '@cyberdeck/deck-kit/utils'
import { type RefObject, useCallback } from 'react'
import { DATASET } from '../atlas/dataset'
import { encodeView } from '../atlas/share'

interface Props {
  position: number
  basemap: boolean
  canvasRef: RefObject<HTMLCanvasElement>
}

/**
 * Export (#230). The **link is the export** and it is foregrounded: it opens the other person at the
 * same point in the vertigo (ADR 0021), the deck's currency when the artifact is state, not a file.
 * The PNG is a deliberately quieter secondary — a still for a wallpaper — kept small so it never
 * becomes the reason nobody uses the link.
 */
export default function ExportControls({ position, basemap, canvasRef }: Props) {
  const toastInfo = useToastInfo()
  const toastError = useToastError()

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}?${encodeView({ position, basemap })}`
    try {
      await navigator.clipboard.writeText(url)
      toastInfo('share link copied — it opens at this scale')
    } catch {
      toastError('could not copy the link')
    }
  }, [position, basemap, toastInfo, toastError])

  const savePng = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    try {
      await shareOrDownloadCanvas(canvas, `sprawl-atlas-${DATASET.asOf}.png`)
    } catch {
      toastError('could not export the image')
    }
  }, [canvasRef, toastError])

  return (
    // The targets grow, the chrome does not: these sit on the piece (ADR 0021), and the PNG is meant
    // to stay a quiet secondary rather than become a second button competing with the link.
    <div className="absolute top-xs right-xs flex items-center gap-xs font-mono text-xs select-none">
      <button
        type="button"
        onClick={copyLink}
        className={cn(
          'px-sm py-2xs rounded-xs bg-bg border border-accent text-accent font-bold tracking-wide cursor-pointer transition-colors duration-fast hover:bg-accent-soft',
          TOUCH_TARGET_HEIGHT,
        )}
      >
        ⊕ share link
      </button>
      <button
        type="button"
        onClick={savePng}
        title="save the current frame as a PNG"
        className={cn(
          'min-w-[44px] px-sm py-2xs rounded-xs bg-bg border border-base text-fg-muted cursor-pointer transition-colors duration-fast hover:text-fg hover:border-strong',
          TOUCH_TARGET_HEIGHT,
        )}
      >
        PNG
      </button>
    </div>
  )
}

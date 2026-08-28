import { TOUCH_TARGET_OVERLAY } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'
import { type RefObject, useLayoutEffect, useRef, useState } from 'react'
import { computeFitRegion, fractionAt, WIPE_INITIAL, wipeKeyMove } from './wipe'

interface Props {
  /** The canvas the shell blits the sampled Source onto, given to `renderGlitchFrame`. */
  compareRef: RefObject<HTMLCanvasElement>
  /** The Source's intrinsic size — the aspect `object-contain` lays the picture out on. */
  sourceWidth: number
  sourceHeight: number
}

/**
 * Rest state of the handle. `bg-bg` is ADR 0013 and not decoration: this sits on the user's
 * artwork, which the Chain can paint any colour anywhere in, so a transparent handle would take its
 * contrast from whatever was just painted under it.
 */
const HANDLE_CHROME =
  'flex items-center justify-center font-mono text-xs rounded-xs select-none bg-bg text-accent border border-accent'

/**
 * The **Wipe**: the Source revealed on one side of a draggable divider, the Chain's result on the
 * other, over one full-bleed canvas rather than two half-width panes.
 *
 * **The divider is chrome, and it is chrome by construction rather than by suppression.** Every
 * output path this app has — PNG Export, Copy, Capture, Recording — reads the visible canvas, and
 * nothing here writes to it. The Source half lands on `compareRef`'s own canvas, stacked over the
 * visible one in the DOM; the line and the handle are elements. So there is no state in which the
 * comparison could reach a take: a `captureStream` of the canvas beneath sees the Chain's result
 * whatever this component is doing. Drawing the divider into the visible canvas and hiding it for
 * each of the four paths was the other design, and the remembering is the whole defect.
 *
 * Geometry is ADR 0010's fit region, never the canvas element: the canvas is `object-contain`, so
 * the picture is centred inside it and the letterbox bands are void the wipe has no business
 * crossing. The Source canvas is `object-contain` too and so lands on the picture without being
 * told where it is — what the measured region buys is the *divider*: the fraction a pointer reads,
 * the clip's edge, and a line that spans the picture rather than the element.
 */
export default function WipeDivider({ compareRef, sourceWidth, sourceHeight }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [fraction, setFraction] = useState(WIPE_INITIAL)
  // A ref rather than state: a drag repaints on every pointer move already, and a second render
  // per press to record that one is in progress buys nothing. `hasPointerCapture` would have said
  // the same thing, but happy-dom does not implement capture at all.
  const draggingRef = useRef(false)

  // Layout, not effect: the divider is positioned from this measurement, so a pass with the box at
  // zero would put it in the corner for one painted frame.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) {
      return
    }
    const measure = () => setBox({ width: root.clientWidth, height: root.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const region = computeFitRegion(box.width, box.height, sourceWidth, sourceHeight)
  const dividerX = region.x + region.width * fraction
  const percent = Math.round(fraction * 100)

  const moveTo = (clientX: number) => {
    const root = rootRef.current
    if (!root) {
      return
    }
    setFraction(fractionAt(clientX, root.getBoundingClientRect().left + region.x, region.width))
  }

  return (
    // Inert as a layer: only the handle takes the pointer, so the rest of the canvas — and the
    // overlay row above it — carries on as if the Wipe were off.
    <div ref={rootRef} className="absolute inset-0 pointer-events-none">
      {/* The Source, clipped at the divider. `object-contain` puts it on the picture exactly as the
          visible canvas beneath it, so the two halves line up without arithmetic, and the clip is
          measured from the same box both are laid out in. Unnamed, where the visible canvas carries
          `glitched preview`: an unlabelled canvas is nothing in the accessibility tree, and this one
          shows the picture the divider already announces as a value. */}
      <canvas
        ref={compareRef}
        className="absolute inset-0 w-full h-full block object-contain [image-rendering:pixelated]"
        style={{ clipPath: `inset(0 ${Math.max(0, box.width - dividerX)}px 0 0)` }}
      />
      {/* ADR 0013 reaches the line too: an accent hairline alone would vanish into artwork that
          happens to match it, so it travels inside its own opaque sheath. Spans the fit region,
          which is what keeps the wipe out of the letterbox bands. */}
      <div
        aria-hidden="true"
        className="absolute w-[3px] -translate-x-1/2 bg-bg flex justify-center"
        style={{ left: dividerX, top: region.y, height: region.height }}
      >
        <div className="w-px h-full bg-accent" />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="wipe divider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% source, ${100 - percent}% chain`}
        onKeyDown={(event) => {
          const next = wipeKeyMove(event.key, fraction)
          if (next !== null) {
            event.preventDefault()
            setFraction(next)
          }
        }}
        onPointerDown={(event) => {
          draggingRef.current = true
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) {
            moveTo(event.clientX)
          }
        }}
        onPointerUp={(event) => {
          draggingRef.current = false
          event.currentTarget.releasePointerCapture?.(event.pointerId)
        }}
        onPointerCancel={() => {
          draggingRef.current = false
        }}
        // `TOUCH_TARGET_OVERLAY` first, then this element's own `absolute` — the constant opens with
        // `relative`, and `cn` lets the later position win. The 44x44 is bought as an overlay
        // because the backdrop is the user's artwork: a handle grown to the target would charge the
        // picture for its own control (`ui/touch-target.ts`).
        className={cn(
          TOUCH_TARGET_OVERLAY,
          HANDLE_CHROME,
          'absolute w-[24px] h-[24px] -translate-x-1/2 -translate-y-1/2',
          'pointer-events-auto cursor-ew-resize touch-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        )}
        style={{ left: dividerX, top: region.y + region.height / 2 }}
      >
        ⇔
      </div>
    </div>
  )
}

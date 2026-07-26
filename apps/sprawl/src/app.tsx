import { ErrorBoundary } from '@cyberdeck/deck-kit/ui'
import { useMemo, useRef } from 'react'
import { DATASET } from './atlas/dataset'
import { topCityLabels } from './atlas/labels'
import { project } from './atlas/project'
import AtlasCanvas from './components/atlas-canvas'
import { useElementSize } from './hooks/use-element-size'
import { useHover } from './hooks/use-hover'
import { useScale } from './hooks/use-scale'

/** How many cities carry a name label — enough to orient, few enough not to clutter. */
const CITY_LABEL_COUNT = 12
/** Minimum CSS px between two labels, so the dense European core doesn't pile names into a smear. */
const CITY_LABEL_MIN_DISTANCE = 52

/**
 * SPRAWL//Atlas — a piece, not a tool (ADR 0021). It takes no user material: it ships with a
 * snapshot and shows the world's connected capacity as light. The map opens in OVERFLOW and you
 * repair it by rewriting the scale coarser — the loop that *is* the program.
 */
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { scale, position, reader, overflow } = useScale(containerRef, DATASET.points)

  // One projection in CSS space, shared by the canvas paint and the DOM overlays (labels, hover).
  const size = useElementSize(containerRef)
  const instructions = useMemo(() => project(DATASET.points, scale, size), [scale, size])
  const labels = useMemo(
    () => topCityLabels(instructions, CITY_LABEL_COUNT, CITY_LABEL_MIN_DISTANCE),
    [instructions],
  )
  const hover = useHover(containerRef, instructions)

  return (
    <div className="flex flex-col h-screen">
      <header className="py-sm px-sm sm:px-lg border-b border-base flex items-center gap-sm shrink-0">
        <span className="text-violet text-base font-bold tracking-wide">SPRAWL//ATLAS</span>
        <span className="text-slate text-xs hidden sm:block">—</span>
        <span className="text-fg-muted text-xs hidden sm:block">
          rewrite the map. increase the scale.
        </span>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <ErrorBoundary
          fallback={
            <div className="h-full flex items-center justify-center text-fg-muted text-sm">
              render failed
            </div>
          }
        >
          <AtlasCanvas
            containerRef={containerRef}
            canvasRef={canvasRef}
            size={size}
            instructions={instructions}
            position={position}
            reader={reader}
            overflow={overflow}
            labels={labels}
            hover={hover}
          />
        </ErrorBoundary>

        {/* The provenance credit (ADR 0022): named as connected capacity, never "traffic". */}
        <p className="absolute bottom-xs right-xs text-fg-subtle text-xs font-mono select-none pointer-events-none">
          as of {DATASET.asOf} · PeeringDB connected capacity
        </p>
      </main>
    </div>
  )
}

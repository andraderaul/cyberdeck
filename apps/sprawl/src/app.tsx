import { ErrorBoundary } from '@cyberdeck/deck-kit/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DATASET } from './atlas/dataset'
import { topCityLabels } from './atlas/labels'
import { project } from './atlas/project'
import { decodeView, encodeView } from './atlas/share'
import AtlasCanvas from './components/atlas-canvas'
import BasemapToggle from './components/basemap-toggle'
import ExportControls from './components/export-controls'
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

  // Boot from a shared link (#230): the URL encodes the scale (and basemap) the sender left, so the
  // recipient opens at the same point in the vertigo and keeps sliding. Read once, on mount.
  const bootView = useRef(decodeView(window.location.search)).current
  const { scale, position, reader, overflow } = useScale(
    containerRef,
    DATASET.points,
    bootView.position,
  )

  // One projection in CSS space, shared by the canvas paint and the DOM overlays (labels, hover).
  const size = useElementSize(containerRef)
  const instructions = useMemo(() => project(DATASET.points, scale, size), [scale, size])
  const labels = useMemo(
    () => topCityLabels(instructions, CITY_LABEL_COUNT, CITY_LABEL_MIN_DISTANCE),
    [instructions],
  )
  const hover = useHover(containerRef, instructions)

  // The earned basemap (#229): off by default, so the first screen is pure light on dark. `B`
  // toggles it — the key Case reached for — and the corner chip makes that discoverable (and gives
  // touch the same reach). Toggling never touches scale or viewport.
  const [basemap, setBasemap] = useState(bootView.basemap ?? false)
  const toggleBasemap = useCallback(() => setBasemap((on) => !on), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'b' || e.key === 'B') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleBasemap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleBasemap])

  // Keep the address bar in sync with the view, so the URL is always the shareable link — the
  // artifact *is* state (ADR 0021). replaceState, not push: sliding is not navigation history.
  useEffect(() => {
    const query = encodeView({ position, basemap })
    window.history.replaceState?.(null, '', `${window.location.pathname}?${query}`)
  }, [position, basemap])

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
            basemap={basemap}
          />
        </ErrorBoundary>

        <ExportControls position={position} basemap={basemap} canvasRef={canvasRef} />
        <BasemapToggle on={basemap} onToggle={toggleBasemap} />

        {/* The provenance credit (ADR 0022): named as connected capacity, never "traffic". */}
        <p className="absolute bottom-xs right-xs text-fg-subtle text-xs font-mono select-none pointer-events-none">
          as of {DATASET.asOf} · PeeringDB connected capacity
        </p>
      </main>
    </div>
  )
}

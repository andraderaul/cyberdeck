import { ErrorBoundary } from '@cyberdeck/deck-kit/ui'
import { useRef } from 'react'
import { DATASET } from './atlas/dataset'
import AtlasCanvas from './components/atlas-canvas'

/**
 * SPRAWL//Atlas — a piece, not a tool (ADR 0021). It takes no user material: it ships with a
 * snapshot and shows the world's connected capacity as light. `#225` is the walking skeleton — the
 * whole layer stack, thin: dataset → pure `project` → `paintFrame`, at a fixed scale.
 */
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  return (
    <div className="flex flex-col h-screen">
      <header className="py-sm px-sm sm:px-lg border-b border-base flex items-center gap-sm shrink-0">
        <span className="text-violet text-base font-bold tracking-wide">SPRAWL//ATLAS</span>
        <span className="text-slate text-xs hidden sm:block">—</span>
        <span className="text-fg-muted text-xs hidden sm:block">the world as light</span>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <ErrorBoundary
          fallback={
            <div className="h-full flex items-center justify-center text-fg-muted text-sm">
              render failed
            </div>
          }
        >
          <AtlasCanvas canvasRef={canvasRef} />
        </ErrorBoundary>

        {/* The provenance credit (ADR 0022): named as connected capacity, never "traffic". The
            skeleton's stand-in reads `sample`; `#227` swaps in a real `YYYY-MM`. */}
        <p className="absolute bottom-xs right-xs text-fg-subtle text-xs font-mono select-none pointer-events-none">
          as of {DATASET.asOf} · PeeringDB connected capacity
        </p>
      </main>
    </div>
  )
}

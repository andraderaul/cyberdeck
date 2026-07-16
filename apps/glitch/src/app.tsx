import { useCallback, useRef, useState } from 'react'
import ControlPanel from './components/control-panel'
import EmptyStateHero from './components/empty-state-hero'
import ErrorBoundary from './components/error-boundary'
import ExportBar from './components/export-bar'
import GlitchCanvas from './components/glitch-canvas'
import type { GlitchSettings } from './glitch/types'

const DEFAULT_SETTINGS: GlitchSettings = {
  channelShift: { channel: 'r', amount: 8 },
}

export default function App() {
  const [settings, setSettings] = useState<GlitchSettings>(DEFAULT_SETTINGS)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const patchSettings = useCallback((patch: Partial<GlitchSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleClearSource = useCallback(() => setSourceImage(null), [])

  return (
    <div className="flex flex-col h-screen">
      <header className="py-sm px-sm sm:px-lg border-b border-base flex items-center gap-sm shrink-0">
        <span className="text-violet text-base font-bold tracking-wide">GLITCH//STUDIO</span>
        <span className="text-slate text-xs hidden sm:block">—</span>
        <span className="text-fg-muted text-xs hidden sm:block">image → glitch</span>
      </header>

      {/* main leads in the DOM so it takes the 1fr row on mobile; the aside reflows to the left column at sm. */}
      <div className="flex-1 grid grid-cols-1 [grid-template-rows:1fr_auto] sm:grid-cols-[280px_1fr] sm:[grid-template-rows:1fr] overflow-hidden">
        <main className="flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            <ErrorBoundary
              fallback={
                <div className="h-full flex items-center justify-center text-fg-muted text-sm">
                  render failed — try a different image or adjust settings
                </div>
              }
            >
              {sourceImage ? (
                <GlitchCanvas
                  sourceImage={sourceImage}
                  settings={settings}
                  canvasRef={canvasRef}
                  onClearSource={handleClearSource}
                />
              ) : (
                <EmptyStateHero onImage={setSourceImage} />
              )}
            </ErrorBoundary>
          </div>
          {sourceImage && (
            <div className="flex flex-col gap-xs py-sm px-md border-t border-base shrink-0">
              <ExportBar canvasRef={canvasRef} />
            </div>
          )}
        </main>

        <aside className="border-t sm:border-t-0 sm:border-r border-base p-md overflow-y-auto flex flex-col gap-lg sm:order-first">
          <ControlPanel settings={settings} onChange={patchSettings} />
        </aside>
      </div>
    </div>
  )
}

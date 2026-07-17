import { useCallback, useEffect, useRef, useState } from 'react'
import ControlPanel from './components/control-panel'
import EmptyStateHero from './components/empty-state-hero'
import ErrorBoundary from './components/error-boundary'
import ExportBar from './components/export-bar'
import GlitchCanvas from './components/glitch-canvas'
import { useToastError } from './components/toast-provider'
import Disclosure from './components/ui/disclosure'
import { createSeed } from './glitch/rng'
import {
  DEFAULT_BLOCK_DISPLACEMENT,
  DEFAULT_NOISE,
  DEFAULT_PIXEL_SORT,
  DEFAULT_SCANLINES,
  type GlitchSettings,
  type Seed,
} from './glitch/types'
import { useRecording } from './hooks/use-recording'
import { useWebcamState } from './hooks/use-webcam-state'

// Every Effect starts active: a casual creator has to see the point on the first screen, not a
// near-untouched image. Presets will take this job over once they land (#75).
const DEFAULT_SETTINGS: GlitchSettings = {
  blockDisplacement: DEFAULT_BLOCK_DISPLACEMENT,
  pixelSort: DEFAULT_PIXEL_SORT,
  channelShift: { channel: 'r', amount: 8 },
  scanlines: DEFAULT_SCANLINES,
  noise: DEFAULT_NOISE,
}

export default function App() {
  const [settings, setSettings] = useState<GlitchSettings>(DEFAULT_SETTINGS)
  // Beside the GlitchSettings, never inside them: the look and the arrangement are separate pieces
  // of state, which is what lets Re-roll move one and leave the other alone. Drawn once per session
  // rather than fixed, so two people opening the same default look land on arrangements of their
  // own — the same reason applying a Preset will roll a fresh Seed (#75).
  const [seed, setSeed] = useState<Seed>(createSeed)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  // The Live Source lives beside the Source Image rather than in one `source` slot: the two are
  // rendered on different clocks — an image once per change, a webcam on the rAF loop — and each
  // needs its own null to switch off.
  const [liveSource, setLiveSource] = useState<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const showError = useToastError()

  const { state: webcam, switchMode } = useWebcamState(setLiveSource)
  const {
    isSupported: canRecord,
    isRecording,
    elapsedSeconds,
    startRecording,
    stopRecording,
  } = useRecording(canvasRef)

  useEffect(() => {
    if (webcam.error) {
      showError(webcam.error)
    }
  }, [webcam.error, showError])

  const patchSettings = useCallback((patch: Partial<GlitchSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleReroll = useCallback(() => setSeed(createSeed()), [])

  const handleUseWebcam = useCallback(() => {
    void switchMode('live')
  }, [switchMode])

  // Covers both Sources: a Live Source needs the camera released, a Source Image needs dropping.
  // Either way this lands back on the empty state, which is the only place a Source is chosen —
  // so the two can never be set at once. A Recording is stopped first: the camera is about to go,
  // and a stop is what hands the user the file they already earned.
  const handleClearSource = useCallback(() => {
    if (isRecording) {
      stopRecording()
    }
    setSourceImage(null)
    void switchMode('image')
  }, [isRecording, stopRecording, switchMode])

  const isLive = liveSource !== null
  const hasSource = sourceImage !== null || isLive

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
              {hasSource ? (
                <GlitchCanvas
                  sourceImage={sourceImage}
                  liveSource={liveSource}
                  settings={settings}
                  seed={seed}
                  canvasRef={canvasRef}
                  onClearSource={handleClearSource}
                  isRecording={isRecording}
                />
              ) : (
                <EmptyStateHero onImage={setSourceImage} onUseWebcam={handleUseWebcam} />
              )}
            </ErrorBoundary>
          </div>
          {hasSource && (
            <div className="flex flex-col gap-xs py-sm px-md border-t border-base shrink-0">
              <ExportBar
                canvasRef={canvasRef}
                isLive={isLive}
                canRecord={canRecord}
                isRecording={isRecording}
                elapsedSeconds={elapsedSeconds}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
              />
            </div>
          )}
        </main>

        {/* Progressive disclosure: the sliders are the tweak layer, not the front door. The
            primary surface is the Presets, which take this slot above the panel once they land
            (#86) — until then the aside opens holding the affordance alone. */}
        <aside className="border-t sm:border-t-0 sm:border-r border-base p-md overflow-y-auto flex flex-col gap-lg sm:order-first">
          <Disclosure label="advanced">
            <ControlPanel settings={settings} onChange={patchSettings} onReroll={handleReroll} />
          </Disclosure>
        </aside>
      </div>
    </div>
  )
}

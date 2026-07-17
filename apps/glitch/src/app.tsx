import { useCallback, useEffect, useRef, useState } from 'react'
import ControlPanel from './components/control-panel'
import EmptyStateHero from './components/empty-state-hero'
import ErrorBoundary from './components/error-boundary'
import ExportBar from './components/export-bar'
import GlitchCanvas from './components/glitch-canvas'
import PresetPicker from './components/preset-picker'
import { useToastError } from './components/toast-provider'
import Disclosure from './components/ui/disclosure'
import { DEFAULT_PRESET, type Preset, randomizeGlitchSettings } from './glitch/presets'
import { createSeed } from './glitch/rng'
import type { GlitchSettings, Seed } from './glitch/types'
import { useRecording } from './hooks/use-recording'
import { useWebcamState } from './hooks/use-webcam-state'

export default function App() {
  // The app opens on a Preset rather than a raw look: a casual creator has to see the point on the
  // first screen, not a near-untouched image.
  const [settings, setSettings] = useState<GlitchSettings>(DEFAULT_PRESET.settings)
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESET.id)
  // Beside the GlitchSettings, never inside them: the look and the arrangement are separate pieces
  // of state, which is what lets Re-roll move one and leave the other alone. Drawn fresh here for
  // the same reason applying a Preset rolls one: a look is shared, an arrangement of it is yours.
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
  } = useRecording(canvasRef, showError)

  useEffect(() => {
    if (webcam.error) {
      showError(webcam.error)
    }
  }, [webcam.error, showError])

  // Leaves activePresetId alone: an edited look still belongs to the Preset it started from, which
  // the picker marks as modified rather than deselecting — the user keeps their bearings.
  const patchSettings = useCallback((patch: Partial<GlitchSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  // The Seed is not part of the look, so a Re-roll leaves both the GlitchSettings and the active
  // Preset exactly where they were — a new arrangement is not a customisation.
  const handleReroll = useCallback(() => setSeed(createSeed()), [])

  // A Preset carries no Seed, so applying one draws its own arrangement: everyone shares the look,
  // nobody gets handed the byte-identical image.
  const handlePresetSelect = useCallback((preset: Preset) => {
    setSettings(preset.settings)
    setActivePresetId(preset.id)
    setSeed(createSeed())
  }, [])

  // Clears the active Preset rather than marking its base modified: a jittered look is a new one the
  // user discovered, not an edit they made to the Preset it happened to start from.
  const handleRandomize = useCallback(() => {
    setSettings(randomizeGlitchSettings(Math.random))
    setActivePresetId(null)
    setSeed(createSeed())
  }, [])

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

        {/* Progressive disclosure: the Presets are the front door — one click to a good-looking
            result — and the sliders are the tweak layer, folded away behind the affordance. */}
        <aside className="border-t sm:border-t-0 sm:border-r border-base p-md overflow-y-auto flex flex-col gap-lg sm:order-first">
          <PresetPicker
            settings={settings}
            activePresetId={activePresetId}
            onSelect={handlePresetSelect}
            onRandomize={handleRandomize}
          />
          <Disclosure label="advanced">
            <ControlPanel settings={settings} onChange={patchSettings} onReroll={handleReroll} />
          </Disclosure>
        </aside>
      </div>
    </div>
  )
}

import { useRecording } from '@cyberdeck/deck-kit/recording'
import { EmptyStateHero, ErrorBoundary, useToastError } from '@cyberdeck/deck-kit/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import ControlPanel from './components/control-panel'
import ControlStrip from './components/control-strip'
import ExportBar from './components/export-bar'
import GlitchCanvas from './components/glitch-canvas'
import MobileControls from './components/mobile-controls'
import Disclosure from './components/ui/disclosure'
import { Errors } from './errors/app-error'
import { outputFilename } from './export/output'
import { useEditorState } from './hooks/use-editor-state'
import { useWebcamState } from './hooks/use-webcam-state'

export default function App() {
  // The look, the arrangement and the provenance live behind the Editor's one interface
  // (editor-state.ts) — App is a caller of its transitions, not the owner of their rules.
  const { chain, seed, activePresetId, isModified, selectPreset, randomize, reroll, chainActions } =
    useEditorState()
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  // The Live Source lives beside the Source Image rather than in one `source` slot: the two are
  // rendered on different clocks — an image once per change, a webcam on the rAF loop — and each
  // needs its own null to switch off.
  const [liveSource, setLiveSource] = useState<HTMLVideoElement | null>(null)
  // Beside the Chain, never inside it (ADR 0016): mirror is source-tuning, not part of the
  // look, so it rides through Presets, Re-roll and Randomize untouched — like ASCII's isMirrored.
  const [isMirrored, setIsMirrored] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const showError = useToastError()

  const handleLiveSource = useCallback((video: HTMLVideoElement | null) => {
    setLiveSource(video)
    if (!video) {
      setIsMirrored(false)
    }
  }, [])

  const handleFacingModeChange = useCallback((mirrored: boolean) => {
    setIsMirrored(mirrored)
  }, [])

  const handleMirrorToggle = useCallback(() => setIsMirrored((prev) => !prev), [])

  const { state: webcam, switchMode } = useWebcamState(handleLiveSource, handleFacingModeChange)
  const {
    isSupported: canRecord,
    isRecording,
    elapsedSeconds,
    startRecording,
    stopRecording,
  } = useRecording(canvasRef, {
    // The core emits a neutral reason; this app words it. 'start' can retry, 'export' cannot — the
    // take is already lost by then (ADR 0006).
    onError: (reason) =>
      showError(
        reason === 'start'
          ? Errors.recordingFailed().message
          : Errors.recordingExportFailed().message,
      ),
    filename: (ext) => outputFilename('recording', { timestamp: Date.now(), ext }),
  })

  useEffect(() => {
    if (webcam.error) {
      showError(webcam.error)
    }
  }, [webcam.error, showError])

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

      {/* On mobile the aside is hidden and its controls move to a bottom sheet (MobileControls), so
          main takes the whole area; at sm the aside reappears as the left column. */}
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
                  chain={chain}
                  seed={seed}
                  canvasRef={canvasRef}
                  onClearSource={handleClearSource}
                  isRecording={isRecording}
                  isMirrored={isMirrored}
                  onMirrorToggle={handleMirrorToggle}
                />
              ) : (
                <EmptyStateHero
                  onImage={setSourceImage}
                  onUseWebcam={handleUseWebcam}
                  tagline="it gets glitched right here — nothing leaves your browser"
                />
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

        {/* The Presets moved to the Strip (ADR 0020), so the aside is down to the tweak layer alone
            until the EDIT tab replaces it. Hidden on mobile, where MobileControls carries the same
            `advanced` fold in a bottom sheet. */}
        <aside className="hidden sm:flex sm:border-r border-base p-md overflow-y-auto flex-col gap-lg sm:order-first">
          <Disclosure label="advanced">
            <ControlPanel chain={chain} actions={chainActions} onReroll={reroll} />
          </Disclosure>
        </aside>
      </div>

      {/* Outside the grid, so the Strip spans the aside's column too and stays bottom-anchored at
          both breakpoints — the canvas above it is never occluded (ADR 0020). Only with a Source:
          on the empty state the choice is which Source to open, not how to glitch it. */}
      {hasSource && (
        // `relative` so the mobile ⚙ trigger can anchor itself just above the Strip rather than to
        // a fixed offset that a taller Strip would collide with.
        <div className="relative shrink-0">
          <MobileControls chain={chain} actions={chainActions} onReroll={reroll} />
          <ControlStrip
            activePresetId={activePresetId}
            isModified={isModified}
            onSelect={selectPreset}
            onRandomize={randomize}
          />
        </div>
      )}
    </div>
  )
}

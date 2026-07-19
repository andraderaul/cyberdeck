import { useRecording } from '@cyberdeck/deck-kit/recording'
import { EmptyStateHero, ErrorBoundary, useToastError } from '@cyberdeck/deck-kit/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import ControlPanel, { type ChainActions } from './components/control-panel'
import ExportBar from './components/export-bar'
import GlitchCanvas from './components/glitch-canvas'
import MobileControls from './components/mobile-controls'
import PresetPicker from './components/preset-picker'
import Disclosure from './components/ui/disclosure'
import { Errors } from './errors/app-error'
import { outputFilename } from './export/output'
import {
  addLink,
  type Chain,
  duplicateLink,
  type EffectType,
  type Link,
  moveLink,
  removeLink,
} from './glitch/chain'
import { DEFAULT_PRESET, type Preset, randomizeChain } from './glitch/presets'
import { createSeed } from './glitch/rng'
import type { Seed } from './glitch/types'
import { useWebcamState } from './hooks/use-webcam-state'

export default function App() {
  // The app opens on a Preset rather than a raw look: a casual creator has to see the point on the
  // first screen, not a near-untouched image.
  const [chain, setChain] = useState<Chain>(DEFAULT_PRESET.chain)
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESET.id)
  // Beside the Chain, never inside it: the look and the arrangement are separate pieces
  // of state, which is what lets Re-roll move one and leave the other alone. Drawn fresh here for
  // the same reason applying a Preset rolls one: a look is shared, an arrangement of it is yours.
  const [seed, setSeed] = useState<Seed>(createSeed)
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

  // Leaves activePresetId alone: an edited look still belongs to the Preset it started from, which
  // the picker marks as modified rather than deselecting — the user keeps their bearings.
  const patchLink = useCallback((id: string, params: Link['params']) => {
    setChain((prev) => prev.map((link) => (link.id === id ? ({ ...link, params } as Link) : link)))
  }, [])

  // Leaves activePresetId alone for the same reason a param edit does: a reordered look still
  // belongs to the Preset it started from, and chainMatch — being order-sensitive — is what marks
  // it (modified). Reordering back therefore restores the match on its own.
  const handleReorder = useCallback((from: number, to: number) => {
    setChain((prev) => moveLink(prev, from, to))
  }, [])

  // Add / remove / duplicate all leave activePresetId alone, exactly as a param edit and a reorder
  // do: the look still belongs to the Preset it started from, and chainMatch — comparing length,
  // type and params at each position — is what marks it (modified).
  const handleAdd = useCallback((type: EffectType) => {
    setChain((prev) => addLink(prev, type))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setChain((prev) => removeLink(prev, id))
  }, [])

  const handleDuplicate = useCallback((id: string) => {
    setChain((prev) => duplicateLink(prev, id))
  }, [])

  const chainActions: ChainActions = {
    onLinkChange: patchLink,
    onReorder: handleReorder,
    onAdd: handleAdd,
    onRemove: handleRemove,
    onDuplicate: handleDuplicate,
  }

  // The Seed is not part of the look, so a Re-roll leaves both the Chain and the active
  // Preset exactly where they were — a new arrangement is not a customisation.
  const handleReroll = useCallback(() => setSeed(createSeed()), [])

  // A Preset carries no Seed, so applying one draws its own arrangement: everyone shares the look,
  // nobody gets handed the byte-identical image.
  const handlePresetSelect = useCallback((preset: Preset) => {
    setChain(preset.chain)
    setActivePresetId(preset.id)
    setSeed(createSeed())
  }, [])

  // Clears the active Preset rather than marking its base modified: a jittered look is a new one the
  // user discovered, not an edit they made to the Preset it happened to start from.
  const handleRandomize = useCallback(() => {
    setChain(randomizeChain(Math.random))
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

        {/* Progressive disclosure: the Presets are the front door — one click to a good-looking
            result — and the sliders are the tweak layer, folded away behind the affordance.
            Hidden on mobile, where MobileControls carries the same stack in a bottom sheet. */}
        <aside className="hidden sm:flex sm:border-r border-base p-md overflow-y-auto flex-col gap-lg sm:order-first">
          <PresetPicker
            chain={chain}
            activePresetId={activePresetId}
            onSelect={handlePresetSelect}
            onRandomize={handleRandomize}
          />
          <Disclosure label="advanced">
            <ControlPanel chain={chain} actions={chainActions} onReroll={handleReroll} />
          </Disclosure>
        </aside>
      </div>

      {/* Only with a Source: there's nothing to tweak on the empty state, where the choice is which
          Source to open, not how to glitch it. */}
      {hasSource && (
        <MobileControls
          chain={chain}
          activePresetId={activePresetId}
          onSelect={handlePresetSelect}
          onRandomize={handleRandomize}
          actions={chainActions}
          onReroll={handleReroll}
        />
      )}
    </div>
  )
}

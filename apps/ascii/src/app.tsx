import { normalizeError } from '@cyberdeck/deck-kit/errors'
import { useRecording } from '@cyberdeck/deck-kit/recording'
import {
  EmptyStateHero,
  ErrorBoundary,
  ThemeControl,
  useToastError,
  useToastInfo,
} from '@cyberdeck/deck-kit/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeCanvas, toAnalysisState } from './ai/analysis-service'
import type { AnalysisState } from './ai/types'
import { useAIConfig } from './ai/use-ai-config'
import type { Preset } from './ascii/presets'
import type { RenderInstruction } from './ascii/renderer'
import type { ConversionSettings } from './ascii/types'
import AboutModal from './components/about-modal'
import AnalysisModal from './components/analysis-modal'
import ApiKeyModal from './components/api-key-modal'
import AsciiCanvas from './components/ascii-canvas'
import ControlStrip from './components/control-strip'
import Footer from './components/footer'
import HeaderButton from './components/ui/header-button'
import { outputFilename } from './export/output'
import { useWebcamState } from './hooks/use-webcam-state'

type ActiveModal =
  | { kind: 'apiKey' }
  | { kind: 'about' }
  | { kind: 'analysis'; state: AnalysisState }
  | null

/**
 * What an applied suggestion displaced — the look the user was standing on, and which Preset they
 * were standing on it *from*, since the chips track that rather than derive it.
 */
interface RevertPoint {
  settings: ConversionSettings
  presetId: string | null
}

const DEFAULT_SETTINGS: ConversionSettings = {
  resolution: 12,
  brightness: 1.0,
  contrast: 1.0,
  colorMode: 'matrix',
  charset: 'sharp',
  edgeGlyphs: false,
  dithering: 'none',
}

export default function App() {
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [revertPoint, setRevertPoint] = useState<RevertPoint | null>(null)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceVideo, setSourceVideo] = useState<HTMLVideoElement | null>(null)
  const [asciiRows, setAsciiRows] = useState<string[]>([])
  const [renderInstructions, setRenderInstructions] = useState<RenderInstruction[]>([])
  const [isMirrored, setIsMirrored] = useState(false)
  const [canvasDimensions, setCanvasDimensions] = useState<{ w: number; h: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const showError = useToastError()
  const showInfo = useToastInfo()
  const { config: aiConfig, save: saveAiConfig, remove: removeAiConfig } = useAIConfig()

  const handleSaveAiConfig = useCallback(
    (config: Parameters<typeof saveAiConfig>[0]) => {
      try {
        saveAiConfig(config)
      } catch (err) {
        showError(normalizeError(err).message)
      }
    },
    [saveAiConfig, showError],
  )

  const handleRemoveAiConfig = useCallback(() => {
    try {
      removeAiConfig()
    } catch (err) {
      showError(normalizeError(err).message)
    }
  }, [removeAiConfig, showError])
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const {
    isSupported: canRecord,
    isRecording,
    elapsedSeconds,
    startRecording,
    stopRecording,
  } = useRecording(canvasRef, {
    // No onError — ASCII//Convert surfaces no toast for a Recording failure (ADR 0007); the take
    // simply doesn't start. The vocabulary lives app-side, so opting out is just omitting it.
    filename: (ext) => outputFilename('recording', { timestamp: Date.now(), ext }),
  })

  const handleVideoStream = useCallback((video: HTMLVideoElement | null) => {
    setSourceImage(null)
    setSourceVideo(video)
    if (!video) {
      setIsMirrored(false)
    }
  }, [])

  const handleFacingModeChange = useCallback((mirrored: boolean) => {
    setIsMirrored(mirrored)
  }, [])

  const handleMirrorToggle = useCallback(() => setIsMirrored((prev) => !prev), [])

  // One conversion feeds both text Exports: TXT Export reads the rows, HTML Export the same grid
  // with its colours still attached.
  const handleConverted = useCallback((rows: string[], instructions: RenderInstruction[]) => {
    setAsciiRows(rows)
    setRenderInstructions(instructions)
  }, [])

  const handleDimensionsChange = useCallback((w: number, h: number) => {
    setCanvasDimensions({ w, h })
  }, [])

  const {
    state: webcamState,
    stopWebcam,
    switchCamera,
    switchMode,
  } = useWebcamState(handleVideoStream, handleFacingModeChange)

  // Surface camera errors as toasts (ADR 0006) — covers both UploadZone and hero webcam paths
  useEffect(() => {
    if (webcamState.error) {
      showError(webcamState.error)
    }
  }, [webcamState.error, showError])

  // The revert offer expires with the first edit of the user's own: it undoes *this* apply, and
  // once they have tuned on top of the suggestion, restoring the snapshot would throw that work
  // away under a word that promised the opposite.
  const patchSettings = useCallback((patch: Partial<ConversionSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    setRevertPoint(null)
  }, [])

  const handlePresetSelect = useCallback((preset: Preset) => {
    setSettings(preset.settings)
    setActivePresetId(preset.id)
    setRevertPoint(null)
  }, [])

  // Only ever from the modal's apply — nothing here runs when an Analysis arrives (issue #308: the
  // settings never move on their own). The displaced look is kept so the move is one chip away
  // from being undone, no re-upload involved.
  const handleApplySuggestion = useCallback(
    (suggestion: ConversionSettings) => {
      setRevertPoint({ settings, presetId: activePresetId })
      setSettings(suggestion)
      // The suggestion is nobody's Preset: leaving the old chip selected would mark it merely
      // modified, when what happened is that the user left it.
      setActivePresetId(null)
      showInfo('suggested conversion applied — revert from the presets tab')
    },
    [settings, activePresetId, showInfo],
  )

  const handleRevert = useCallback(() => {
    if (!revertPoint) {
      return
    }
    setSettings(revertPoint.settings)
    setActivePresetId(revertPoint.presetId)
    setRevertPoint(null)
  }, [revertPoint])

  const handleImage = useCallback(
    (img: HTMLImageElement) => {
      stopWebcam()
      setSourceImage(img)
    },
    [stopWebcam],
  )

  const handleClearSource = useCallback(() => {
    if (isRecording) {
      stopRecording()
    }
    stopWebcam()
    setSourceImage(null)
    setSourceVideo(null)
    setAsciiRows([])
  }, [isRecording, stopRecording, stopWebcam])

  const handleAnalyze = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !aiConfig) {
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    setActiveModal({ kind: 'analysis', state: { status: 'loading' } })

    try {
      const analysis = await analyzeCanvas(dataUrl, aiConfig)
      setActiveModal({ kind: 'analysis', state: toAnalysisState({ ok: analysis }) })
    } catch (err) {
      setActiveModal({ kind: 'analysis', state: toAnalysisState({ error: err }) })
    }
  }, [aiConfig])

  return (
    <div className="flex flex-col h-screen">
      <header className="py-sm px-sm sm:px-lg border-b border-base flex items-center gap-sm shrink-0">
        <span className="text-accent text-base font-bold tracking-wide">ASCII//CONVERT</span>
        <span className="text-fg-faint text-xs hidden sm:block">—</span>
        <span className="text-fg-muted text-xs hidden sm:block">image → ascii art</span>
        <div className="ml-auto flex items-center gap-xs">
          <HeaderButton
            variant={aiConfig ? 'accent-text' : 'accent-fill'}
            onClick={() => setActiveModal({ kind: 'apiKey' })}
            title="Configure AI key"
            // The mark sits in its own element to be hidden, which makes it a flex item of the
            // button's own row — and flex drops the leading space of the text item beside it. The
            // gap is what puts that space back.
            className="gap-2xs"
          >
            {/* Hollow to AI Analyze's filled ◈ — the deck's two AI surfaces read as one family.
                Unhidden it would join the accessible name, which is what the old ⚿ did: a screen
                reader opened this button with "squared key". */}
            <span aria-hidden="true">◇</span> {aiConfig ? 'ai configured' : 'configure ai'}
          </HeaderButton>
          {/* Deck chrome rather than the artefact's: it changes what the program is drawn in, where
              a Color Mode changes what the conversion paints. They are neighbours here, so the
              Theme names deliberately avoid `matrix` and `neon` (ADR 0024). */}
          <ThemeControl />
        </div>
      </header>

      {/* One column at both breakpoints now: the Strip below carries every control, so there is no
          aside to make room for (ADR 0020). */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            <ErrorBoundary
              fallback={
                <div className="h-full flex items-center justify-center text-fg-muted text-sm">
                  render failed — try a different image or adjust settings
                </div>
              }
            >
              {sourceImage || sourceVideo ? (
                <AsciiCanvas
                  sourceImage={sourceImage}
                  sourceVideo={sourceVideo}
                  settings={settings}
                  onConverted={handleConverted}
                  canvasRef={canvasRef}
                  isMirrored={isMirrored}
                  isRecording={isRecording}
                  elapsedSeconds={elapsedSeconds}
                  onStopRecording={stopRecording}
                  isLive={!!sourceVideo}
                  onClearSource={handleClearSource}
                  onMirrorToggle={handleMirrorToggle}
                  onSwitchCamera={switchCamera}
                  onDimensionsChange={handleDimensionsChange}
                />
              ) : (
                <EmptyStateHero
                  onImage={handleImage}
                  onUseWebcam={() => void switchMode('webcam')}
                  tagline="it gets converted right here — nothing leaves your browser"
                />
              )}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Bottom-anchored at both breakpoints, with the canvas above it never occluded (ADR 0020).
          Only with a Source: on the empty state the choice is which Source to open, not how to
          convert it. */}
      {(sourceImage || sourceVideo) && (
        <ControlStrip
          canvasRef={canvasRef}
          asciiRows={asciiRows}
          renderInstructions={renderInstructions}
          isLive={!!sourceVideo}
          canvasDimensions={canvasDimensions}
          hasAiConfig={!!aiConfig}
          onAnalyze={handleAnalyze}
          onConfigureAi={() => setActiveModal({ kind: 'apiKey' })}
          canRecord={canRecord}
          isRecording={isRecording}
          onStartRecording={startRecording}
          settings={settings}
          activePresetId={activePresetId}
          onPresetSelect={handlePresetSelect}
          onSettingsChange={patchSettings}
          onRevertSuggestion={revertPoint ? handleRevert : undefined}
        />
      )}

      {/* Empty state only: with a Source the Control Strip owns the bottom edge, and a footer
          directly under it invites a mis-tap on the way to a control. */}
      {!(sourceImage || sourceVideo) && (
        <Footer onAbout={() => setActiveModal({ kind: 'about' })} />
      )}

      {activeModal?.kind === 'apiKey' && (
        <ApiKeyModal
          current={aiConfig}
          onSave={handleSaveAiConfig}
          onRemove={handleRemoveAiConfig}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.kind === 'analysis' && (
        <AnalysisModal
          state={activeModal.state}
          onClose={() => setActiveModal(null)}
          onRetry={activeModal.state.status === 'parse-error' ? handleAnalyze : undefined}
          onApplySuggestion={handleApplySuggestion}
        />
      )}

      {activeModal?.kind === 'about' && <AboutModal onClose={() => setActiveModal(null)} />}
    </div>
  )
}

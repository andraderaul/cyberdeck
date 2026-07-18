import { normalizeError } from '@cyberdeck/deck-kit/errors'
import { useRecording } from '@cyberdeck/deck-kit/recording'
import { ErrorBoundary, useToastError } from '@cyberdeck/deck-kit/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeCanvas, toAnalysisState } from './ai/analysis-service'
import type { AnalysisState } from './ai/types'
import { useAIConfig } from './ai/use-ai-config'
import type { Preset } from './ascii/presets'
import type { ConversionSettings } from './ascii/types'
import AboutModal from './components/about-modal'
import AiConfigBanner from './components/ai-config-banner'
import AnalysisModal from './components/analysis-modal'
import ApiKeyModal from './components/api-key-modal'
import AsciiCanvas from './components/ascii-canvas'
import ControlPanel from './components/control-panel'
import EmptyStateHero from './components/empty-state-hero'
import ExportBar from './components/export-bar'
import LiveSourceBar from './components/live-source-bar'
import MobileControls from './components/mobile-controls'
import HeaderButton from './components/ui/header-button'
import UploadZone from './components/upload-zone'
import { outputFilename } from './export/output'
import { useWebcamState } from './hooks/use-webcam-state'

type ActiveModal =
  | { kind: 'apiKey' }
  | { kind: 'about' }
  | { kind: 'analysis'; state: AnalysisState }
  | null

const DEFAULT_SETTINGS: ConversionSettings = {
  resolution: 12,
  brightness: 1.0,
  contrast: 1.0,
  colorMode: 'matrix',
  charset: 'sharp',
}

export default function App() {
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceVideo, setSourceVideo] = useState<HTMLVideoElement | null>(null)
  const [asciiRows, setAsciiRows] = useState<string[]>([])
  const [isMirrored, setIsMirrored] = useState(false)
  const [canvasDimensions, setCanvasDimensions] = useState<{ w: number; h: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const showError = useToastError()
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

  const patchSettings = useCallback((patch: Partial<ConversionSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const handlePresetSelect = useCallback((preset: Preset) => {
    setSettings(preset.settings)
    setActivePresetId(preset.id)
  }, [])

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
        <span className="text-violet text-base font-bold tracking-wide">ASCII//CONVERT</span>
        <span className="text-slate text-xs hidden sm:block">—</span>
        <span className="text-fg-muted text-xs hidden sm:block">image → ascii art</span>
        <div className="ml-auto flex items-center gap-xs">
          <HeaderButton variant="neutral" onClick={() => setActiveModal({ kind: 'about' })}>
            about
          </HeaderButton>
          <HeaderButton
            variant={aiConfig ? 'accent-text' : 'accent-fill'}
            onClick={() => setActiveModal({ kind: 'apiKey' })}
            title="Configure AI key"
          >
            ⚿ {aiConfig ? 'ai configured' : 'configure ai'}
          </HeaderButton>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 [grid-template-rows:1fr_auto] sm:grid-cols-[280px_1fr] sm:[grid-template-rows:1fr] overflow-hidden">
        <aside className="hidden sm:flex border-r border-base p-md overflow-y-auto flex-col gap-lg sm:order-first">
          <UploadZone
            onImage={handleImage}
            webcamState={webcamState}
            onSwitchMode={switchMode}
            onSwitchCamera={switchCamera}
            isMirrored={isMirrored}
            onMirrorToggle={handleMirrorToggle}
          />
          <div className="w-full h-px bg-slate" />
          <ControlPanel
            settings={settings}
            onChange={patchSettings}
            activePresetId={activePresetId}
            onPresetSelect={handlePresetSelect}
          />
        </aside>

        <main className="flex flex-col overflow-hidden">
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
                  onConverted={setAsciiRows}
                  canvasRef={canvasRef}
                  isMirrored={isMirrored}
                  isRecording={isRecording}
                  isLive={!!sourceVideo}
                  onClearSource={handleClearSource}
                  onDimensionsChange={handleDimensionsChange}
                />
              ) : (
                <EmptyStateHero
                  onImage={handleImage}
                  onStartWebcam={() => void switchMode('webcam')}
                />
              )}
            </ErrorBoundary>
          </div>
          {(sourceImage || sourceVideo) && (
            <div className="flex flex-col gap-xs py-sm px-md border-t border-base shrink-0">
              {!aiConfig && (
                <AiConfigBanner onConfigure={() => setActiveModal({ kind: 'apiKey' })} />
              )}
              {sourceVideo ? (
                <LiveSourceBar
                  canvasRef={canvasRef}
                  hasAiConfig={!!aiConfig}
                  onAnalyze={handleAnalyze}
                  canRecord={canRecord}
                  isRecording={isRecording}
                  elapsedSeconds={elapsedSeconds}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                />
              ) : (
                <ExportBar
                  canvasRef={canvasRef}
                  asciiRows={asciiRows}
                  hasImage={!!sourceImage}
                  canvasDimensions={canvasDimensions}
                  hasAiConfig={!!aiConfig}
                  onAnalyze={handleAnalyze}
                />
              )}
            </div>
          )}
        </main>
      </div>

      <MobileControls
        onImage={handleImage}
        webcamState={webcamState}
        onSwitchMode={switchMode}
        onSwitchCamera={switchCamera}
        isMirrored={isMirrored}
        onMirrorToggle={handleMirrorToggle}
        settings={settings}
        onSettingsChange={patchSettings}
        activePresetId={activePresetId}
        onPresetSelect={handlePresetSelect}
      />

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
        />
      )}

      {activeModal?.kind === 'about' && <AboutModal onClose={() => setActiveModal(null)} />}
    </div>
  )
}

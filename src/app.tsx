import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeCanvas } from './ai/analysis-service'
import { AuthError, NetworkError, QuotaError } from './ai/errors'
import type { AnalysisState } from './ai/types'
import { useAIConfig } from './ai/use-ai-config'
import type { ConversionSettings } from './ascii/types'
import AboutModal from './components/about-modal'
import AnalysisModal from './components/analysis-modal'
import ApiKeyModal from './components/api-key-modal'
import AsciiCanvas from './components/ascii-canvas'
import ControlPanel from './components/control-panel'
import DownloadBar from './components/download-bar'
import EmptyStateHero from './components/empty-state-hero'
import ErrorBoundary from './components/error-boundary'
import MobileControls from './components/mobile-controls'
import { useToastError } from './components/toast-provider'
import UploadZone from './components/upload-zone'
import { useRecording } from './hooks/use-recording'
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
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceVideo, setSourceVideo] = useState<HTMLVideoElement | null>(null)
  const [asciiRows, setAsciiRows] = useState<string[]>([])
  const [isMirrored, setIsMirrored] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const showError = useToastError()
  const { config: aiConfig, save: saveAiConfig, remove: removeAiConfig } = useAIConfig()
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const {
    isSupported: canRecord,
    isRecording,
    elapsedSeconds,
    startRecording,
    stopRecording,
  } = useRecording(canvasRef)

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

  const {
    state: webcamState,
    startWebcam,
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

  const handleImage = useCallback(
    (img: HTMLImageElement) => {
      stopWebcam()
      setSourceImage(img)
    },
    [stopWebcam],
  )

  const handleAnalyze = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !aiConfig) {
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    setActiveModal({ kind: 'analysis', state: { status: 'loading' } })

    try {
      const analysis = await analyzeCanvas(dataUrl, aiConfig)
      setActiveModal({ kind: 'analysis', state: { status: 'success', analysis } })
    } catch (err) {
      if (err instanceof AuthError) {
        setActiveModal({ kind: 'analysis', state: { status: 'auth-error' } })
      } else if (err instanceof QuotaError) {
        setActiveModal({ kind: 'analysis', state: { status: 'quota-error' } })
      } else if (err instanceof NetworkError) {
        setActiveModal({ kind: 'analysis', state: { status: 'network-error' } })
      } else {
        setActiveModal({ kind: 'analysis', state: { status: 'parse-error' } })
      }
    }
  }, [aiConfig])

  const isLive = !!sourceVideo

  return (
    <div className="flex flex-col h-screen">
      <header className="py-sm px-sm sm:px-lg border-b border-base flex items-center gap-sm shrink-0">
        <span className="text-violet text-base font-bold tracking-wide">ASCII//CONVERT</span>
        <span className="text-slate text-xs hidden sm:block">—</span>
        <span className="text-fg-muted text-xs hidden sm:block">image → ascii art</span>
        <div className="ml-auto flex items-center gap-xs">
          <button
            type="button"
            onClick={() => setActiveModal({ kind: 'about' })}
            className="font-mono tracking-wide cursor-pointer transition-all"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--muted)',
              background: 'none',
              border: 'none',
              letterSpacing: 'var(--tracking-wide)',
              padding: '4px 8px',
            }}
          >
            about
          </button>
          <button
            type="button"
            onClick={() => setActiveModal({ kind: 'apiKey' })}
            className="font-mono tracking-wide cursor-pointer transition-all"
            style={{
              fontSize: 'var(--text-xs)',
              color: aiConfig ? 'var(--violet)' : 'var(--muted)',
              background: 'none',
              border: 'none',
              letterSpacing: 'var(--tracking-wide)',
              padding: '4px 8px',
            }}
            title="Configure AI key"
          >
            ⚿ {aiConfig ? 'ai configured' : 'configure ai'}
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 [grid-template-rows:1fr_auto] sm:grid-cols-[280px_1fr] sm:[grid-template-rows:1fr] overflow-hidden">
        <aside className="hidden sm:flex border-r border-base p-md overflow-y-auto flex-col gap-lg sm:order-first">
          <UploadZone
            onImage={handleImage}
            webcamState={webcamState}
            onSwitchMode={switchMode}
            onSwitchCamera={switchCamera}
          />
          <div className="w-full h-px bg-slate" />
          <ControlPanel settings={settings} onChange={patchSettings} />
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
                />
              ) : (
                <EmptyStateHero
                  onImage={handleImage}
                  onStartWebcam={() => void startWebcam('user')}
                />
              )}
            </ErrorBoundary>
          </div>
          <div className="py-sm px-md border-t border-base shrink-0">
            <DownloadBar
              canvasRef={canvasRef}
              asciiRows={asciiRows}
              isLive={isLive}
              hasAiConfig={!!aiConfig}
              onAnalyze={handleAnalyze}
              canRecord={canRecord}
              isRecording={isRecording}
              elapsedSeconds={elapsedSeconds}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
            />
          </div>
        </main>
      </div>

      <MobileControls
        onImage={handleImage}
        webcamState={webcamState}
        onSwitchMode={switchMode}
        onSwitchCamera={switchCamera}
        settings={settings}
        onSettingsChange={patchSettings}
      />

      {activeModal?.kind === 'apiKey' && (
        <ApiKeyModal
          current={aiConfig}
          onSave={saveAiConfig}
          onRemove={removeAiConfig}
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

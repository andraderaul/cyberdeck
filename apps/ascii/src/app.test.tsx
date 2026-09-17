import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIConfig } from './ai/types'
import App from './app'

// Mock all heavy dependencies so we render only the header
vi.mock('./ai/use-ai-config', () => ({
  useAIConfig: vi.fn(() => ({ config: null, save: vi.fn(), remove: vi.fn() })),
}))

vi.mock('./hooks/use-webcam-state', () => ({
  useWebcamState: vi.fn(() => ({
    state: { mode: 'upload', live: false, facingMode: 'user', error: null },
    startWebcam: vi.fn(),
    stopWebcam: vi.fn(),
    switchCamera: vi.fn(),
    switchMode: vi.fn(),
  })),
}))

vi.mock('@cyberdeck/deck-kit/recording', () => ({
  useRecording: vi.fn(() => ({
    isSupported: false,
    isRecording: false,
    elapsedSeconds: 0,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  })),
}))

// Hoisted above the mock factory that closes over it — `vi.mock` runs before the module body.
const { mockShowInfo } = vi.hoisted(() => ({ mockShowInfo: vi.fn() }))

// EmptyStateHero now lives in the kit (ADR 0015); stub it here as the app's Source entry probe.
vi.mock('@cyberdeck/deck-kit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@cyberdeck/deck-kit/ui')>()),
  useToastError: vi.fn(() => vi.fn()),
  useToastInfo: vi.fn(() => mockShowInfo),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EmptyStateHero: ({
    onImage,
    onUseWebcam,
  }: {
    onImage: (img: HTMLImageElement) => void
    onUseWebcam: () => void
  }) => (
    <>
      <button type="button" onClick={() => onImage(new Image())}>
        hero
      </button>
      <button type="button" onClick={onUseWebcam}>
        hero-webcam
      </button>
    </>
  ),
}))

// The ref is forwarded because Analyze reads the canvas off it — without it `handleAnalyze`
// returns before it ever reaches a Provider.
vi.mock('./components/ascii-canvas', () => ({
  default: ({
    canvasRef,
    onUseLiveSource,
  }: {
    canvasRef: React.RefObject<HTMLCanvasElement>
    onUseLiveSource?: () => void
  }) => (
    <>
      <canvas ref={canvasRef} />
      <button type="button" onClick={onUseLiveSource}>
        canvas-live-source
      </button>
    </>
  ),
}))

vi.mock('./ai/analysis-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./ai/analysis-service')>()),
  analyzeCanvas: vi.fn(),
}))

import { useRecording } from '@cyberdeck/deck-kit/recording'
import { analyzeCanvas } from './ai/analysis-service'
import { useAIConfig } from './ai/use-ai-config'
import { PRESETS } from './ascii/presets'
import type { ConversionSettings } from './ascii/types'
import { DEFAULT_SETTINGS } from './ascii/types'
import { useWebcamState } from './hooks/use-webcam-state'

const mockUseAIConfig = vi.mocked(useAIConfig)
const mockAnalyzeCanvas = vi.mocked(analyzeCanvas)
const mockUseWebcamState = vi.mocked(useWebcamState)
const mockUseRecording = vi.mocked(useRecording)

const mockAIConfig: AIConfig = {
  provider: 'anthropic',
  key: 'sk-ant-test',
}

// The banner is rehomed inside the OUT tab (ADR 0020), where the AI Analysis it advertises now
// lives — so reaching it means opening that tab.
function openOut() {
  fireEvent.click(screen.getByRole('tab', { name: 'out' }))
}

describe('AiConfigBanner visibility', () => {
  beforeEach(() => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    sessionStorage.clear()
  })

  afterEach(() => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    sessionStorage.clear()
  })

  it('shows banner when source is loaded and no AI Config is set', () => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    openOut()
    expect(screen.getByText(/AI Analyze/i)).toBeInTheDocument()
  })

  it('hides banner once AI Config is saved', () => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    const { rerender } = render(<App />)
    fireEvent.click(screen.getByText('hero'))
    openOut()
    expect(screen.getByText(/AI Analyze/i)).toBeInTheDocument()

    mockUseAIConfig.mockReturnValue({ config: mockAIConfig, save: vi.fn(), remove: vi.fn() })
    rerender(<App />)
    expect(screen.queryByText(/AI Analyze/i)).not.toBeInTheDocument()
  })
})

describe('EmptyStateHero webcam integration', () => {
  it('clicking webcam button calls switchMode("webcam"), not startWebcam', () => {
    const startWebcam = vi.fn()
    const switchMode = vi.fn()
    mockUseWebcamState.mockReturnValue({
      state: { mode: 'upload', live: false, facingMode: 'user', error: null },
      startWebcam,
      stopWebcam: vi.fn(),
      switchCamera: vi.fn(),
      switchMode,
    })

    render(<App />)
    fireEvent.click(screen.getByText('hero-webcam'))

    expect(switchMode).toHaveBeenCalledWith('webcam')
    expect(startWebcam).not.toHaveBeenCalled()
  })
})

// #366: with a Source Image on the canvas the Live Source used to be three acts away, because the
// hero was `switchMode`'s only caller and the hero is gone the moment a Source loads.
describe('the Live Source, reached with a Source Image already loaded', () => {
  const IDLE_WEBCAM = {
    state: { mode: 'upload' as const, live: false, facingMode: 'user' as const, error: null },
    startWebcam: vi.fn(),
    stopWebcam: vi.fn(),
    switchCamera: vi.fn(),
    switchMode: vi.fn(),
  }
  const IDLE_RECORDING = {
    isSupported: false,
    isRecording: false,
    elapsedSeconds: 0,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  }

  afterEach(() => {
    mockUseWebcamState.mockReturnValue({ ...IDLE_WEBCAM })
    mockUseRecording.mockReturnValue({ ...IDLE_RECORDING })
  })

  it('asks for the switch in one act, from the canvas', () => {
    const switchMode = vi.fn()
    mockUseWebcamState.mockReturnValue({ ...IDLE_WEBCAM, switchMode })

    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    fireEvent.click(screen.getByText('canvas-live-source'))

    expect(switchMode).toHaveBeenCalledWith('webcam')
  })

  // The same rule `handleClearSource` keeps: a take belongs to the Source it was recording, so it
  // ends before that Source is replaced rather than running on over the next one.
  it('stops a running Recording before the Source changes', () => {
    const stopRecording = vi.fn()
    mockUseRecording.mockReturnValue({
      ...IDLE_RECORDING,
      isSupported: true,
      isRecording: true,
      stopRecording,
    })

    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    fireEvent.click(screen.getByText('canvas-live-source'))

    expect(stopRecording).toHaveBeenCalledOnce()
  })

  // A refusal reaches the app as a null stream on the same callback a teardown uses. Clearing the
  // Source Image there would take the canvas away under the toast that is about to explain why.
  it('leaves the Source Image on the canvas when the camera is refused', () => {
    let onVideoStream: (video: HTMLVideoElement | null) => void = () => {}
    mockUseWebcamState.mockImplementation((handler) => {
      onVideoStream = handler
      return { ...IDLE_WEBCAM }
    })

    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    expect(screen.getByRole('tab', { name: 'out' })).toBeInTheDocument()

    act(() => {
      onVideoStream(null)
    })

    expect(screen.getByRole('tab', { name: 'out' })).toBeInTheDocument()
    expect(screen.queryByText('hero')).not.toBeInTheDocument()
  })
})

describe('the OUT tab', () => {
  it('offers no Strip at all before a source is loaded', () => {
    render(<App />)

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  // Export is the session's terminal action and affords a tab switch — the always-visible bars
  // are what ADR 0020 replaced.
  it('keeps the outputs behind the tab rather than always on screen', () => {
    render(<App />)

    fireEvent.click(screen.getByText('hero'))

    expect(screen.queryByRole('button', { name: 'export png' })).not.toBeInTheDocument()
    openOut()
    expect(screen.getByRole('button', { name: 'export png' })).toBeInTheDocument()
  })

  it('offers PNG and TXT Export for a Source Image', () => {
    render(<App />)
    fireEvent.click(screen.getByText('hero'))

    openOut()

    expect(screen.getByRole('button', { name: 'export png' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'export txt' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /capture/ })).not.toBeInTheDocument()
  })
})

describe('App header buttons', () => {
  it('the configure ai button has min-h-[44px]', () => {
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: /configure ai/i })
    expect(aiBtn.className).toContain('min-h-[44px]')
  })

  // The mark is decoration and the words are the control, so the name has to be the words alone —
  // unhidden, the glyph joins it and the button opens with a character name nobody asked for.
  it('names itself in words, with the mark left out of the name', () => {
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: 'configure ai' })

    expect(aiBtn).toHaveTextContent('◇')
    expect(screen.getByText('◇')).toHaveAttribute('aria-hidden', 'true')
  })

  it('configure ai button has border-accent at rest when aiConfig is null', () => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: /configure ai/i })
    expect(aiBtn.className.split(/\s+/)).toContain('border-accent')
  })

  it('keeps the configure ai button off --fg-dim, which sits below the contrast floor', () => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: /configure ai/i })
    expect(aiBtn.className.split(/\s+/)).not.toContain('text-fg-dim')
  })

  it('configure ai button has transparent border at rest when aiConfig is set', () => {
    mockUseAIConfig.mockReturnValue({ config: mockAIConfig, save: vi.fn(), remove: vi.fn() })
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: /ai configured/i })
    const tokens = aiBtn.className.split(/\s+/)
    expect(tokens).toContain('border-transparent')
    expect(tokens).not.toContain('border-accent')
  })
})

describe('the empty-state footer', () => {
  it('carries the About trigger and the attribution links before a Source loads', () => {
    render(<App />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'about' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /source code/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /author/i })).toBeInTheDocument()
  })

  // The bar is ultra-thin but sits in the thumb zone, so the target floor is per-control
  it('holds every control to min-h-[44px] despite the thin bar', () => {
    render(<App />)
    const controls = [
      screen.getByRole('button', { name: 'about' }),
      screen.getByRole('link', { name: /source code/i }),
      screen.getByRole('link', { name: /author/i }),
    ]
    for (const control of controls) {
      expect(control.className).toContain('min-h-[44px]')
    }
  })

  it('keeps the about button off --fg-dim, which sits below the contrast floor', () => {
    render(<App />)
    const aboutBtn = screen.getByRole('button', { name: 'about' })
    expect(aboutBtn.className.split(/\s+/)).not.toContain('text-fg-dim')
  })

  it('is gone once a Source loads, so it can never sit under the Control Strip', () => {
    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })
})

describe('the Analysis suggestion', () => {
  // Nothing in DEFAULT_SETTINGS, so applying it is visible on every axis the EDIT tab shows.
  const SUGGESTION: ConversionSettings = {
    charset: 'braille',
    colorMode: 'neon',
    edgeGlyphs: true,
    dithering: 'bayer',
    resolution: 10,
    brightness: 1.15,
    contrast: 1.4,
  }

  beforeEach(() => {
    mockShowInfo.mockClear()
    mockUseAIConfig.mockReturnValue({ config: mockAIConfig, save: vi.fn(), remove: vi.fn() })
    mockAnalyzeCanvas.mockResolvedValue({
      description: 'a lone figure',
      threatLevel: 'HIGH',
      tags: ['NOMAD'],
      suggestion: SUGGESTION,
    })
  })

  afterEach(() => {
    mockAnalyzeCanvas.mockReset()
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
  })

  async function analyze() {
    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    openOut()
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    return screen.findByRole('button', { name: 'apply' })
  }

  function openCharsetTab() {
    fireEvent.click(screen.getByRole('tab', { name: 'edit' }))
  }

  it('leaves the settings where they were until the user applies', async () => {
    await analyze()
    fireEvent.click(screen.getByRole('button', { name: 'close' }))

    openCharsetTab()

    expect(screen.getByRole('button', { name: 'sharp' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'braille' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('applies every suggested axis at once when asked', async () => {
    const apply = await analyze()
    fireEvent.click(apply)

    openCharsetTab()
    expect(screen.getByRole('button', { name: 'braille' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'edge glyphs' }))
    expect(screen.getByRole('button', { name: 'on' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('puts the displaced settings back from the presets tab, with no Source re-upload', async () => {
    const apply = await analyze()
    fireEvent.click(apply)

    fireEvent.click(screen.getByRole('tab', { name: 'presets' }))
    fireEvent.click(screen.getByRole('button', { name: 'revert to the previous look' }))

    openCharsetTab()
    expect(screen.getByRole('button', { name: 'sharp' })).toHaveAttribute('aria-pressed', 'true')
  })

  // The offer expires with the user's first edit of their own — so a control that moves nothing is
  // not one. The scoped `↺` is the only way to press an edit that patches nothing: a refused ramp
  // stands in the field rather than in ConversionSettings, so over the default Charset it is live
  // with an empty patch, and App reads any patch at all as the edit that ends the offer.
  it('keeps the revert offer through a reset that moves no setting', async () => {
    mockAnalyzeCanvas.mockResolvedValue({
      description: 'a lone figure',
      threatLevel: 'HIGH',
      tags: ['NOMAD'],
      suggestion: { ...SUGGESTION, charset: DEFAULT_SETTINGS.charset },
    })
    const apply = await analyze()
    fireEvent.click(apply)

    openCharsetTab()
    fireEvent.change(screen.getByLabelText('custom charset'), { target: { value: '@' } })
    fireEvent.click(screen.getByRole('button', { name: 'reset charset' }))
    expect(screen.queryByText(/2 characters or more/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'presets' }))
    expect(screen.getByRole('button', { name: 'revert to the previous look' })).toBeInTheDocument()
  })

  // One level deep, not a stack: `replaceLook` re-snapshots unconditionally, so the second of the
  // two acts displaces the first one's snapshot rather than pushing onto it. Deliberate — the
  // control undoes whichever of them last ran, and says so by naming "the previous look".
  it('holds one level of undo — a reset over an applied suggestion gives that suggestion back', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    openCharsetTab()
    fireEvent.click(screen.getByRole('button', { name: 'box' }))

    openOut()
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'apply' }))

    fireEvent.click(screen.getByRole('tab', { name: 'presets' }))
    fireEvent.click(screen.getByRole('button', { name: 'reset to defaults' }))
    fireEvent.click(screen.getByRole('button', { name: 'revert to the previous look' }))

    openCharsetTab()
    expect(screen.getByRole('button', { name: 'braille' })).toHaveAttribute('aria-pressed', 'true')
    // The pre-Suggestion look is gone, and no second press brings it back.
    expect(screen.getByRole('button', { name: 'box' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('withdraws the revert offer once the user edits on top of the suggestion', async () => {
    const apply = await analyze()
    fireEvent.click(apply)

    openCharsetTab()
    fireEvent.click(screen.getByRole('button', { name: 'box' }))

    fireEvent.click(screen.getByRole('tab', { name: 'presets' }))
    expect(
      screen.queryByRole('button', { name: 'revert to the previous look' }),
    ).not.toBeInTheDocument()
  })

  // The apply closes the modal, so the canvas is the only other feedback — and it can't say where
  // the undo lives.
  it('says what happened and where to undo it', async () => {
    const apply = await analyze()
    expect(mockShowInfo).not.toHaveBeenCalled()

    fireEvent.click(apply)

    expect(mockShowInfo).toHaveBeenCalledWith(expect.stringContaining('presets'))
  })

  it('keeps the prose when the suggestion was dropped, and offers no apply', async () => {
    mockAnalyzeCanvas.mockResolvedValue({
      description: 'a lone figure',
      threatLevel: 'HIGH',
      tags: ['NOMAD'],
    })
    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    openOut()
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(await screen.findByText('a lone figure')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'apply' })).not.toBeInTheDocument()
  })

  it('offers no revert before anything has been applied', () => {
    render(<App />)
    fireEvent.click(screen.getByText('hero'))

    fireEvent.click(screen.getByRole('tab', { name: 'presets' }))
    expect(
      screen.queryByRole('button', { name: 'revert to the previous look' }),
    ).not.toBeInTheDocument()
  })
})

describe('the reset to defaults', () => {
  beforeEach(() => {
    mockShowInfo.mockClear()
  })

  function openPresets() {
    fireEvent.click(screen.getByRole('tab', { name: 'presets' }))
  }

  function openEdit() {
    fireEvent.click(screen.getByRole('tab', { name: 'edit' }))
  }

  // A Source and a look that is nobody's default: `box` is a Charset no Preset and no default names.
  function loadAndDiverge() {
    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    openEdit()
    fireEvent.click(screen.getByRole('button', { name: 'box' }))
  }

  it('returns every axis to DEFAULT_SETTINGS', () => {
    loadAndDiverge()

    openPresets()
    fireEvent.click(screen.getByRole('button', { name: 'reset to defaults' }))

    openEdit()
    expect(screen.getByRole('button', { name: 'sharp' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'box' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('leaves the active Preset behind rather than marking it modified', () => {
    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    openPresets()
    const preset = PRESETS[0]
    fireEvent.click(screen.getByRole('button', { name: preset.name }))

    fireEvent.click(screen.getByRole('button', { name: 'reset to defaults' }))

    expect(screen.getByRole('button', { name: preset.name })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('leaves the loaded Source converting — only the conversion moves', () => {
    loadAndDiverge()

    openPresets()
    fireEvent.click(screen.getByRole('button', { name: 'reset to defaults' }))

    // The canvas stub only renders while App holds a Source, and the Strip only with one.
    expect(document.querySelector('canvas')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'controls' })).toBeInTheDocument()
  })

  it('is undone by the revert control it raises, with no confirmation asked first', () => {
    loadAndDiverge()

    openPresets()
    fireEvent.click(screen.getByRole('button', { name: 'reset to defaults' }))
    fireEvent.click(screen.getByRole('button', { name: 'revert to the previous look' }))

    openEdit()
    expect(screen.getByRole('button', { name: 'box' })).toHaveAttribute('aria-pressed', 'true')
  })

  // The revert offer is the whole of what this act gives back in place of a confirmation, so the
  // one press that patches nothing must not spend it. A refused ramp stands in the field rather
  // than in ConversionSettings, so over the restored default Charset the scoped `↺` is live with an
  // empty patch — and App reads any patch at all as the edit that ends the offer (issue #393).
  it('keeps that revert offer through a scoped reset that moves no setting', () => {
    loadAndDiverge()

    openPresets()
    fireEvent.click(screen.getByRole('button', { name: 'reset to defaults' }))

    // The refusal is local to SettingsEditor, which unmounts on a tab switch — so it has to be made
    // after coming back to EDIT, not before leaving it.
    openEdit()
    fireEvent.change(screen.getByLabelText('custom charset'), { target: { value: '@' } })
    fireEvent.click(screen.getByRole('button', { name: 'reset charset' }))

    openPresets()
    fireEvent.click(screen.getByRole('button', { name: 'revert to the previous look' }))

    openEdit()
    expect(screen.getByRole('button', { name: 'box' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('withdraws that revert offer once the user edits on top of the reset', () => {
    loadAndDiverge()

    openPresets()
    fireEvent.click(screen.getByRole('button', { name: 'reset to defaults' }))

    openEdit()
    fireEvent.click(screen.getByRole('button', { name: 'blocks' }))

    openPresets()
    expect(
      screen.queryByRole('button', { name: 'revert to the previous look' }),
    ).not.toBeInTheDocument()
  })

  it('says what happened and where to undo it', () => {
    loadAndDiverge()

    openPresets()
    fireEvent.click(screen.getByRole('button', { name: 'reset to defaults' }))

    expect(mockShowInfo).toHaveBeenCalledWith(expect.stringContaining('presets'))
  })

  it('is unavailable on the look the program opens on', () => {
    render(<App />)
    fireEvent.click(screen.getByText('hero'))

    openPresets()
    expect(screen.getByRole('button', { name: /reset to defaults — unavailable/ })).toBeDisabled()
  })
})

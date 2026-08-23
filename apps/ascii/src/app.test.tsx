import { fireEvent, render, screen } from '@testing-library/react'
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
  default: ({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) => (
    <canvas ref={canvasRef} />
  ),
}))

vi.mock('./ai/analysis-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./ai/analysis-service')>()),
  analyzeCanvas: vi.fn(),
}))

import { analyzeCanvas } from './ai/analysis-service'
import { useAIConfig } from './ai/use-ai-config'
import type { ConversionSettings } from './ascii/types'
import { useWebcamState } from './hooks/use-webcam-state'

const mockUseAIConfig = vi.mocked(useAIConfig)
const mockAnalyzeCanvas = vi.mocked(analyzeCanvas)
const mockUseWebcamState = vi.mocked(useWebcamState)

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
    fireEvent.click(screen.getByRole('button', { name: 'revert suggestion' }))

    openCharsetTab()
    expect(screen.getByRole('button', { name: 'sharp' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('withdraws the revert offer once the user edits on top of the suggestion', async () => {
    const apply = await analyze()
    fireEvent.click(apply)

    openCharsetTab()
    fireEvent.click(screen.getByRole('button', { name: 'box' }))

    fireEvent.click(screen.getByRole('tab', { name: 'presets' }))
    expect(screen.queryByRole('button', { name: 'revert suggestion' })).not.toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'revert suggestion' })).not.toBeInTheDocument()
  })
})

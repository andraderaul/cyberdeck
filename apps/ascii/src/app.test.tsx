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

vi.mock('@cyberdeck/deck-kit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@cyberdeck/deck-kit/ui')>()),
  useToastError: vi.fn(() => vi.fn()),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./components/ascii-canvas', () => ({ default: () => <canvas /> }))
vi.mock('./components/upload-zone', () => ({ default: () => <div>upload</div> }))
vi.mock('./components/control-panel', () => ({ default: () => <div>control</div> }))
vi.mock('./components/export-bar', () => ({ default: () => <div>export</div> }))
vi.mock('./components/live-source-bar', () => ({ default: () => <div>live</div> }))
vi.mock('./components/empty-state-hero', () => ({
  default: ({
    onImage,
    onStartWebcam,
  }: {
    onImage: (img: HTMLImageElement) => void
    onStartWebcam: () => void
  }) => (
    <>
      <button type="button" onClick={() => onImage(new Image())}>
        hero
      </button>
      <button type="button" onClick={onStartWebcam}>
        hero-webcam
      </button>
    </>
  ),
}))
vi.mock('./components/mobile-controls', () => ({ default: () => <div>mobile</div> }))

import { useAIConfig } from './ai/use-ai-config'
import { useWebcamState } from './hooks/use-webcam-state'

const mockUseAIConfig = vi.mocked(useAIConfig)
const mockUseWebcamState = vi.mocked(useWebcamState)

const mockAIConfig: AIConfig = {
  provider: 'anthropic',
  key: 'sk-ant-test',
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
    expect(screen.getByText(/AI Analyze/i)).toBeInTheDocument()
  })

  it('hides banner once AI Config is saved', () => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    const { rerender } = render(<App />)
    fireEvent.click(screen.getByText('hero'))
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

describe('ExportBar visibility', () => {
  it('is not rendered before a source is loaded', () => {
    render(<App />)
    expect(screen.queryByText('export')).not.toBeInTheDocument()
  })

  it('appears after a source image is loaded via EmptyStateHero', () => {
    render(<App />)
    fireEvent.click(screen.getByText('hero'))
    expect(screen.getByText('export')).toBeInTheDocument()
  })
})

describe('App header buttons', () => {
  it('both buttons have min-h-[44px]', () => {
    render(<App />)
    const aboutBtn = screen.getByRole('button', { name: /about/i })
    const aiBtn = screen.getByRole('button', { name: /configure ai/i })
    expect(aboutBtn.className).toContain('min-h-[44px]')
    expect(aiBtn.className).toContain('min-h-[44px]')
  })

  it('configure ai button has border-violet at rest when aiConfig is null', () => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: /configure ai/i })
    expect(aiBtn.className.split(/\s+/)).toContain('border-violet')
  })

  it('about button does not use text-muted (fails WCAG AA)', () => {
    render(<App />)
    const aboutBtn = screen.getByRole('button', { name: /about/i })
    expect(aboutBtn.className.split(/\s+/)).not.toContain('text-muted')
  })

  it('configure ai button does not use text-muted (fails WCAG AA)', () => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: /configure ai/i })
    expect(aiBtn.className.split(/\s+/)).not.toContain('text-muted')
  })

  it('configure ai button has transparent border at rest when aiConfig is set', () => {
    mockUseAIConfig.mockReturnValue({ config: mockAIConfig, save: vi.fn(), remove: vi.fn() })
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: /ai configured/i })
    const tokens = aiBtn.className.split(/\s+/)
    expect(tokens).toContain('border-transparent')
    expect(tokens).not.toContain('border-violet')
  })
})

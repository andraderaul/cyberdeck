import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

vi.mock('./hooks/use-recording', () => ({
  useRecording: vi.fn(() => ({
    isSupported: false,
    isRecording: false,
    elapsedSeconds: 0,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  })),
}))

vi.mock('./components/toast-provider', () => ({
  useToastError: vi.fn(() => vi.fn()),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./components/ascii-canvas', () => ({ default: () => <canvas /> }))
vi.mock('./components/upload-zone', () => ({ default: () => <div>upload</div> }))
vi.mock('./components/control-panel', () => ({ default: () => <div>control</div> }))
vi.mock('./components/download-bar', () => ({ default: () => <div>download</div> }))
vi.mock('./components/empty-state-hero', () => ({ default: () => <div>hero</div> }))
vi.mock('./components/mobile-controls', () => ({ default: () => <div>mobile</div> }))
vi.mock('./components/error-boundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { useAIConfig } from './ai/use-ai-config'

const mockUseAIConfig = vi.mocked(useAIConfig)

const mockAIConfig: AIConfig = {
  provider: 'anthropic',
  key: 'sk-ant-test',
}

describe('App header buttons', () => {
  it('both buttons have min-h-[44px]', () => {
    render(<App />)
    const aboutBtn = screen.getByRole('button', { name: /about/i })
    const aiBtn = screen.getByRole('button', { name: /configure ai/i })
    expect(aboutBtn.className).toContain('min-h-[44px]')
    expect(aiBtn.className).toContain('min-h-[44px]')
  })

  it('configure ai button has border-violet when aiConfig is null', () => {
    mockUseAIConfig.mockReturnValue({ config: null, save: vi.fn(), remove: vi.fn() })
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: /configure ai/i })
    expect(aiBtn.className).toContain('border-violet')
  })

  it('configure ai button does NOT have border-violet when aiConfig is set', () => {
    mockUseAIConfig.mockReturnValue({ config: mockAIConfig, save: vi.fn(), remove: vi.fn() })
    render(<App />)
    const aiBtn = screen.getByRole('button', { name: /ai configured/i })
    expect(aiBtn.className).not.toContain('border-violet')
  })
})

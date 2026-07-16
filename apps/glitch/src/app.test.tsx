import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './app'
import type { GlitchSettings } from './glitch/types'

vi.mock('./components/toast-provider', () => ({
  useToastError: vi.fn(() => vi.fn()),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// The canvas and its render shell are covered at their own seams; here they stand in as probes
// so this test can stay about the app's wiring.
const renderedSettings = vi.fn<(s: GlitchSettings) => void>()

vi.mock('./components/glitch-canvas', () => ({
  default: ({
    settings,
    onClearSource,
  }: {
    settings: GlitchSettings
    onClearSource?: () => void
  }) => {
    renderedSettings(settings)
    return (
      <>
        <canvas aria-label="glitched preview" />
        <button type="button" onClick={onClearSource}>
          clear
        </button>
      </>
    )
  },
}))

vi.mock('./components/export-bar', () => ({ default: () => <div>export png</div> }))

vi.mock('./components/empty-state-hero', () => ({
  default: ({ onImage }: { onImage: (img: HTMLImageElement) => void }) => (
    <button type="button" onClick={() => onImage(new Image())}>
      upload
    </button>
  ),
}))

describe('App', () => {
  it('opens on the empty state, with no preview or Export yet', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'upload' })).toBeInTheDocument()
    expect(screen.queryByLabelText('glitched preview')).not.toBeInTheDocument()
    expect(screen.queryByText('export png')).not.toBeInTheDocument()
  })

  it('shows the preview and PNG Export once a Source Image is uploaded', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    expect(screen.getByLabelText('glitched preview')).toBeInTheDocument()
    expect(screen.getByText('export png')).toBeInTheDocument()
  })

  it('returns to the empty state when the Source is cleared', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    fireEvent.click(screen.getByRole('button', { name: 'clear' }))

    expect(screen.getByRole('button', { name: 'upload' })).toBeInTheDocument()
    expect(screen.queryByLabelText('glitched preview')).not.toBeInTheDocument()
  })

  it('passes an updated GlitchSettings down to the canvas when a control changes', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))
    renderedSettings.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'green' }))

    expect(renderedSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ channelShift: expect.objectContaining({ channel: 'g' }) }),
    )
  })

  it('keeps the rest of the look intact when one Effect param changes', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    fireEvent.change(screen.getByLabelText('amount'), { target: { value: '20' } })

    expect(renderedSettings).toHaveBeenLastCalledWith({
      channelShift: { channel: 'r', amount: 20 },
    })
  })
})

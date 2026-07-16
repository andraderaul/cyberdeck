import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './app'
import { DEFAULT_PIXEL_SORT, type GlitchSettings } from './glitch/types'

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

  it('passes a toggled-off Pixel Sort down to the canvas', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))
    renderedSettings.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'off' }))

    expect(renderedSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ pixelSort: expect.objectContaining({ enabled: false }) }),
    )
  })

  it('hides the Pixel Sort params when the Effect is off', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    fireEvent.click(screen.getByRole('button', { name: 'off' }))

    expect(screen.queryByLabelText('threshold')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('run length')).not.toBeInTheDocument()
  })

  it('keeps the rest of the look intact when one Effect param changes', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    fireEvent.change(screen.getByLabelText('amount'), { target: { value: '20' } })

    // Exhaustive by design: patching Channel Shift must leave Pixel Sort's params exactly as they
    // were, and only a whole-object match catches a patch that drops a sibling Effect.
    expect(renderedSettings).toHaveBeenLastCalledWith({
      pixelSort: DEFAULT_PIXEL_SORT,
      channelShift: { channel: 'r', amount: 20 },
    })
  })
})

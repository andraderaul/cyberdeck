import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ConversionSettings } from '../ascii/types'
import AnalysisModal from './analysis-modal'

const SUGGESTION: ConversionSettings = {
  charset: 'braille',
  colorMode: 'neon',
  edgeGlyphs: true,
  dithering: 'bayer',
  resolution: 10,
  brightness: 1.15,
  contrast: 1.4,
}

const SUCCESS_STATE = {
  status: 'success' as const,
  analysis: {
    description: 'A lone figure moves through the grid.',
    threatLevel: 'HIGH' as const,
    tags: ['NOMAD', 'GRID-RUNNER'],
    suggestion: SUGGESTION,
  },
}

describe('AnalysisModal', () => {
  it('shows scanning message while loading', () => {
    render(
      <AnalysisModal state={{ status: 'loading' }} onClose={vi.fn()} onApplySuggestion={vi.fn()} />,
    )

    expect(screen.getByText(/scanning visual feed/i)).toBeInTheDocument()
  })

  it('shows threat level, description, and tags on success', () => {
    render(<AnalysisModal state={SUCCESS_STATE} onClose={vi.fn()} onApplySuggestion={vi.fn()} />)

    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText(SUCCESS_STATE.analysis.description)).toBeInTheDocument()
    expect(screen.getByText(/#nomad/i)).toBeInTheDocument()
    expect(screen.getByText(/#grid-runner/i)).toBeInTheDocument()
  })

  it('shows auth-error message', () => {
    render(
      <AnalysisModal
        state={{ status: 'auth-error' }}
        onClose={vi.fn()}
        onApplySuggestion={vi.fn()}
      />,
    )

    expect(screen.getByText(/auth failed/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid or expired api key/i)).toBeInTheDocument()
  })

  it('shows quota-error message', () => {
    render(
      <AnalysisModal
        state={{ status: 'quota-error' }}
        onClose={vi.fn()}
        onApplySuggestion={vi.fn()}
      />,
    )

    expect(screen.getByText(/quota exceeded/i)).toBeInTheDocument()
  })

  it('shows parse-error message with retry button', () => {
    const onRetry = vi.fn()
    render(
      <AnalysisModal
        state={{ status: 'parse-error' }}
        onClose={vi.fn()}
        onRetry={onRetry}
        onApplySuggestion={vi.fn()}
      />,
    )

    expect(screen.getByText(/feed corrupted/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows network-error message with retry button', () => {
    const onRetry = vi.fn()
    render(
      <AnalysisModal
        state={{ status: 'network-error' }}
        onClose={vi.fn()}
        onRetry={onRetry}
        onApplySuggestion={vi.fn()}
      />,
    )

    expect(screen.getByText(/transmission failure/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<AnalysisModal state={SUCCESS_STATE} onClose={onClose} onApplySuggestion={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not show a close button while loading', () => {
    render(
      <AnalysisModal state={{ status: 'loading' }} onClose={vi.fn()} onApplySuggestion={vi.fn()} />,
    )

    expect(screen.queryByRole('button', { name: 'close' })).not.toBeInTheDocument()
  })

  it('keeps the loading helper off --fg-dim, which sits below the contrast floor', () => {
    render(
      <AnalysisModal state={{ status: 'loading' }} onClose={vi.fn()} onApplySuggestion={vi.fn()} />,
    )
    const helper = screen.getByText(/interfacing with ai provider/i)
    expect(helper.className.split(/\s+/)).not.toContain('text-fg-dim')
  })

  it('shows every suggested ConversionSetting on success', () => {
    render(<AnalysisModal state={SUCCESS_STATE} onClose={vi.fn()} onApplySuggestion={vi.fn()} />)

    const panel = screen.getByRole('region', { name: /suggested conversion/i })
    expect(panel).toHaveTextContent('braille')
    expect(panel).toHaveTextContent('neon')
    expect(panel).toHaveTextContent('on')
    expect(panel).toHaveTextContent('10px')
    expect(panel).toHaveTextContent('1.15')
    expect(panel).toHaveTextContent('1.40')
  })

  it('applies nothing until the user asks — rendering alone moves no settings', () => {
    const onApplySuggestion = vi.fn()
    render(
      <AnalysisModal
        state={SUCCESS_STATE}
        onClose={vi.fn()}
        onApplySuggestion={onApplySuggestion}
      />,
    )

    expect(onApplySuggestion).not.toHaveBeenCalled()
  })

  it('hands the suggestion up and closes when apply is clicked', () => {
    const onApplySuggestion = vi.fn()
    const onClose = vi.fn()
    render(
      <AnalysisModal
        state={SUCCESS_STATE}
        onClose={onClose}
        onApplySuggestion={onApplySuggestion}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'apply' }))

    expect(onApplySuggestion).toHaveBeenCalledWith(SUGGESTION)
    expect(onClose).toHaveBeenCalledOnce()
  })

  // The split in analysis-service: a suggestion the reader refused costs the panel, not the scan.
  it('reports the scan with no panel when the suggestion was dropped', () => {
    render(
      <AnalysisModal
        state={{
          status: 'success',
          analysis: { ...SUCCESS_STATE.analysis, suggestion: undefined },
        }}
        onClose={vi.fn()}
        onApplySuggestion={vi.fn()}
      />,
    )

    expect(screen.getByText(SUCCESS_STATE.analysis.description)).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /suggested conversion/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'apply' })).not.toBeInTheDocument()
  })

  it('offers no apply on an error state — there is no suggestion to spend', () => {
    render(
      <AnalysisModal
        state={{ status: 'parse-error' }}
        onClose={vi.fn()}
        onApplySuggestion={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'apply' })).not.toBeInTheDocument()
  })

  it('renders a redundant aria-hidden icon for CRITICAL threat level', () => {
    render(
      <AnalysisModal
        state={{
          status: 'success',
          analysis: {
            threatLevel: 'CRITICAL',
            description: 'test',
            tags: [],
            suggestion: SUGGESTION,
          },
        }}
        onClose={vi.fn()}
        onApplySuggestion={vi.fn()}
      />,
    )
    const icon = document.querySelector('[data-testid="threat-icon"]')
    expect(icon).toBeDefined()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon?.textContent).toBe('‼')
  })
})

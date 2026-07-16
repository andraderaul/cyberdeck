import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AnalysisModal from './analysis-modal'

const SUCCESS_STATE = {
  status: 'success' as const,
  analysis: {
    description: 'A lone figure moves through the grid.',
    threatLevel: 'HIGH' as const,
    tags: ['NOMAD', 'GRID-RUNNER'],
  },
}

describe('AnalysisModal', () => {
  it('shows scanning message while loading', () => {
    render(<AnalysisModal state={{ status: 'loading' }} onClose={vi.fn()} />)

    expect(screen.getByText(/scanning visual feed/i)).toBeInTheDocument()
  })

  it('shows threat level, description, and tags on success', () => {
    render(<AnalysisModal state={SUCCESS_STATE} onClose={vi.fn()} />)

    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText(SUCCESS_STATE.analysis.description)).toBeInTheDocument()
    expect(screen.getByText(/#nomad/i)).toBeInTheDocument()
    expect(screen.getByText(/#grid-runner/i)).toBeInTheDocument()
  })

  it('shows auth-error message', () => {
    render(<AnalysisModal state={{ status: 'auth-error' }} onClose={vi.fn()} />)

    expect(screen.getByText(/auth failed/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid or expired api key/i)).toBeInTheDocument()
  })

  it('shows quota-error message', () => {
    render(<AnalysisModal state={{ status: 'quota-error' }} onClose={vi.fn()} />)

    expect(screen.getByText(/quota exceeded/i)).toBeInTheDocument()
  })

  it('shows parse-error message with retry button', () => {
    const onRetry = vi.fn()
    render(<AnalysisModal state={{ status: 'parse-error' }} onClose={vi.fn()} onRetry={onRetry} />)

    expect(screen.getByText(/feed corrupted/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows network-error message with retry button', () => {
    const onRetry = vi.fn()
    render(
      <AnalysisModal state={{ status: 'network-error' }} onClose={vi.fn()} onRetry={onRetry} />,
    )

    expect(screen.getByText(/transmission failure/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<AnalysisModal state={SUCCESS_STATE} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /✕/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not show a close button while loading', () => {
    render(<AnalysisModal state={{ status: 'loading' }} onClose={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /✕/i })).not.toBeInTheDocument()
  })

  it('loading helper text does not use text-muted (fails WCAG AA)', () => {
    render(<AnalysisModal state={{ status: 'loading' }} onClose={vi.fn()} />)
    const helper = screen.getByText(/interfacing with ai provider/i)
    expect(helper.className.split(/\s+/)).not.toContain('text-muted')
  })

  it('renders a redundant aria-hidden icon for CRITICAL threat level', () => {
    render(
      <AnalysisModal
        state={{
          status: 'success',
          analysis: { threatLevel: 'CRITICAL', description: 'test', tags: [] },
        }}
        onClose={vi.fn()}
      />,
    )
    const icon = document.querySelector('[data-testid="threat-icon"]')
    expect(icon).toBeDefined()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon?.textContent).toBe('‼')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './app'

describe('SPRAWL//Atlas', () => {
  it('opens in OVERFLOW — the first screen is honestly blown out (ADR 0021)', () => {
    render(<App />)
    expect(screen.getByTestId('overflow-flag')).toBeInTheDocument()
  })

  it('opens the scale reader at 1 Gbps and keeps it visible', () => {
    render(<App />)
    // The reader is the vertigo — always on screen, live with the current unit.
    expect(screen.getByText(/1 px ≈ 1 Gbps/)).toBeInTheDocument()
  })

  it('exposes the map as a slider whose value text carries the scale (control-over-canvas, ADR 0020)', () => {
    render(<App />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/overflow/)
  })

  it('credits the measure as connected capacity, never traffic (ADR 0022)', () => {
    render(<App />)
    expect(screen.getByText(/PeeringDB connected capacity/)).toBeInTheDocument()
    expect(screen.queryByText(/traffic/i)).not.toBeInTheDocument()
  })
})

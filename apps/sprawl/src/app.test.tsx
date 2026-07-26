import { fireEvent, render, screen } from '@testing-library/react'
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

  it('labels the strongest cities for orientation without a basemap (#228)', () => {
    render(<App />)
    // Frankfurt is the top connected-capacity metro in the vendored snapshot.
    expect(screen.getByText('FRANKFURT')).toBeInTheDocument()
  })

  it('opens with the basemap off — pure light on dark (#229)', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /outline/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('toggles the earned basemap with the B key', () => {
    render(<App />)
    const toggle = screen.getByRole('button', { name: /outline/i })
    fireEvent.keyDown(window, { key: 'b' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(window, { key: 'b' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggles the basemap by clicking the chip, for touch', () => {
    render(<App />)
    const toggle = screen.getByRole('button', { name: /outline/i })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })
})

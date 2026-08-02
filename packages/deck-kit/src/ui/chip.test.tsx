import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Chip from './chip'

describe('Chip', () => {
  it('renders as a button with type="button"', () => {
    render(<Chip selected={false}>label</Chip>)
    const btn = screen.getByRole('button', { name: 'label' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('sets aria-pressed=true when selected', () => {
    render(<Chip selected>on</Chip>)
    expect(screen.getByRole('button', { name: 'on' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sets aria-pressed=false when not selected', () => {
    render(<Chip selected={false}>off</Chip>)
    expect(screen.getByRole('button', { name: 'off' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('applies border-accent and text-accent when selected', () => {
    render(<Chip selected>active</Chip>)
    const btn = screen.getByRole('button', { name: 'active' })
    expect(btn.className).toContain('border-accent')
    expect(btn.className).toContain('text-accent')
  })

  it('applies border-base and text-fg-muted when not selected', () => {
    render(<Chip selected={false}>inactive</Chip>)
    const btn = screen.getByRole('button', { name: 'inactive' })
    expect(btn.className).toContain('border-base')
    expect(btn.className).toContain('text-fg-muted')
  })

  it('applies opacity-40 and cursor-not-allowed when disabled', () => {
    render(
      <Chip selected={false} disabled>
        off
      </Chip>,
    )
    const btn = screen.getByRole('button', { name: 'off' })
    expect(btn).toBeDisabled()
    expect(btn.className).toContain('opacity-40')
    expect(btn.className).toContain('cursor-not-allowed')
  })

  it('passes through onClick handler', () => {
    const onClick = vi.fn()
    render(
      <Chip selected={false} onClick={onClick}>
        click me
      </Chip>,
    )
    screen.getByRole('button', { name: 'click me' }).click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('passes through aria-label', () => {
    render(
      <Chip selected={false} aria-label="my label">
        content
      </Chip>,
    )
    expect(screen.getByRole('button', { name: 'my label' })).toBeInTheDocument()
  })

  it('passes through className merged with base classes', () => {
    render(
      <Chip selected={false} className="custom-class">
        x
      </Chip>,
    )
    expect(screen.getByRole('button').className).toContain('custom-class')
  })

  it('renders children', () => {
    render(
      <Chip selected={false}>
        <span data-testid="child">child</span>
      </Chip>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies min-h-[44px] touch target', () => {
    render(
      <Chip selected={false} onClick={() => {}}>
        content
      </Chip>,
    )
    expect(screen.getByRole('button').className).toContain('min-h-[44px]')
  })

  // The half that was missing: a two-character label draws ~31px wide, and only the height was ever
  // held. `1×`, `VHS` and the add-effect `+` were all short enough to sit under the target.
  it('holds the target on the axis a short label leaves short', () => {
    render(
      <Chip selected={false} onClick={() => {}}>
        1×
      </Chip>,
    )
    const classes = new Set(screen.getByRole('button').className.split(/\s+/))

    expect(classes).toContain('min-w-[44px]')
    // Without this the stretched width all falls to one side of a label that no longer fills it.
    expect(classes).toContain('justify-center')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HeaderButton from './header-button'

describe('HeaderButton', () => {
  it('renders as a button with type="button"', () => {
    render(<HeaderButton variant="neutral">about</HeaderButton>)
    const btn = screen.getByRole('button', { name: 'about' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('applies touch target min-h and min-w', () => {
    render(<HeaderButton variant="neutral">about</HeaderButton>)
    const btn = screen.getByRole('button', { name: 'about' })
    expect(btn.className).toContain('min-h-[44px]')
    expect(btn.className).toContain('min-w-[44px]')
  })

  it('applies neutral variant classes', () => {
    render(<HeaderButton variant="neutral">about</HeaderButton>)
    const btn = screen.getByRole('button', { name: 'about' })
    expect(btn.className).toContain('border-transparent')
    expect(btn.className).toContain('text-fg-subtle')
  })

  it('applies accent-text variant classes', () => {
    render(<HeaderButton variant="accent-text">ai configured</HeaderButton>)
    const btn = screen.getByRole('button', { name: 'ai configured' })
    expect(btn.className).toContain('text-violet')
    expect(btn.className).toContain('hover:border-violet')
  })

  it('applies accent-fill variant classes', () => {
    render(<HeaderButton variant="accent-fill">configure ai</HeaderButton>)
    const btn = screen.getByRole('button', { name: 'configure ai' })
    expect(btn.className).toContain('border-violet')
    expect(btn.className).toContain('bg-accent-ghost')
    expect(btn.className).toContain('text-violet')
  })

  it('passes through onClick handler', () => {
    const onClick = vi.fn()
    render(
      <HeaderButton variant="neutral" onClick={onClick}>
        click me
      </HeaderButton>,
    )
    screen.getByRole('button', { name: 'click me' }).click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('passes through title attribute', () => {
    render(
      <HeaderButton variant="accent-text" title="Configure AI key">
        ai
      </HeaderButton>,
    )
    expect(screen.getByRole('button', { name: 'ai' })).toHaveAttribute('title', 'Configure AI key')
  })

  it('passes through className merged with base classes', () => {
    render(
      <HeaderButton variant="neutral" className="custom-class">
        x
      </HeaderButton>,
    )
    expect(screen.getByRole('button').className).toContain('custom-class')
  })

  it('renders children', () => {
    render(
      <HeaderButton variant="neutral">
        <span data-testid="child">child</span>
      </HeaderButton>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies pill shape', () => {
    render(<HeaderButton variant="neutral">x</HeaderButton>)
    expect(screen.getByRole('button').className).toContain('rounded-pill')
  })

  it('applies focus-visible outline classes for keyboard navigation', () => {
    render(<HeaderButton variant="neutral">x</HeaderButton>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('focus-visible:outline')
    expect(btn.className).toContain('focus-visible:outline-violet')
  })
})

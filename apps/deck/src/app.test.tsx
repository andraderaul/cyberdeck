import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './app'
import { PROGRAMS } from './roster'

describe('the hub', () => {
  it('links every program to its live deploy', () => {
    render(<App />)
    for (const program of PROGRAMS) {
      const link = screen.getByRole('link', { name: new RegExp(program.name, 'i') })
      expect(link).toHaveAttribute('href', program.url)
    }
  })

  it('offers the Theme picker, because the hub is entirely what the deck drew', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /^theme:/ })).toBeInTheDocument()
  })

  // Chrome is constituted by what it does *not* have (ADR 0025): the first byte of user material
  // makes it a program. This is here so a future "just a quick search box" has to argue with a test.
  it('takes no user material', () => {
    const { container } = render(<App />)
    expect(container.querySelector('input, textarea, canvas, [contenteditable]')).toBeNull()
  })

  it('carries the deck-wide attribution bar at the bottom edge', () => {
    render(<App />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /source code/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /author/i })).toBeInTheDocument()
  })

  // The bar is the kit's, and the kit makes `about` optional for exactly this caller
  it('offers no About trigger, having no About to open', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: 'about' })).not.toBeInTheDocument()
  })

  // The fence forbids an embedded program too, not only an input — and an iframe is how that
  // arrives, wearing a link's clothes. Cheap to check, and the docs claim this test covers it.
  it('runs no program inside itself', () => {
    const { container } = render(<App />)
    expect(container.querySelector('iframe, embed, object')).toBeNull()
  })
})

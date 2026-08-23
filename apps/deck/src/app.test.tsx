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
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './app'

describe('App', () => {
  it('renders a region for each surface the program needs', () => {
    render(<App />)

    for (const region of ['Source', 'Console', 'Registers', 'Flags', 'Memory', 'Terminal']) {
      expect(screen.getByRole('region', { name: region })).toBeInTheDocument()
    }
  })

  // ADR 0018: the Console is the only control grammar, so the shell ships no buttons. This guards
  // the boundary while the panels are still empty — the first stray control trips it.
  it('exposes no interactive control outside the Console', () => {
    render(<App />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

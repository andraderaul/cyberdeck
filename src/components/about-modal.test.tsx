import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AboutModal from './about-modal'

vi.mock('./ui/modal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('AboutModal section headings', () => {
  it('renders "ai scan" heading in lowercase', () => {
    render(<AboutModal onClose={vi.fn()} />)
    expect(screen.getByText('ai scan')).toBeInTheDocument()
  })

  it('renders "made with ai" heading in lowercase', () => {
    render(<AboutModal onClose={vi.fn()} />)
    expect(screen.getByText('made with ai')).toBeInTheDocument()
  })

  it('section headings have no uppercase or tracking-wide classes', () => {
    render(<AboutModal onClose={vi.fn()} />)
    for (const text of ['ai scan', 'made with ai']) {
      const el = screen.getByText(text)
      expect(el.className).not.toContain('uppercase')
      expect(el.className).not.toContain('tracking-wide')
    }
  })
})

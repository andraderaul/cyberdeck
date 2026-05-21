import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ApiKeyModal from './api-key-modal'

vi.mock('./ui/modal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('ApiKeyModal helper text contrast', () => {
  it('API key helper text does not use text-muted (fails WCAG AA)', () => {
    render(<ApiKeyModal current={null} onSave={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    const helper = screen.getByText(/your key stays in your browser/i)
    expect(helper.className.split(/\s+/)).not.toContain('text-muted')
  })
})

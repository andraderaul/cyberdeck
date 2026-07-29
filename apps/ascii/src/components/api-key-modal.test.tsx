import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ApiKeyModal from './api-key-modal'

vi.mock('@cyberdeck/deck-kit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@cyberdeck/deck-kit/ui')>()),
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function renderModal(current: Parameters<typeof ApiKeyModal>[0]['current'] = null) {
  return render(
    <ApiKeyModal current={current} onSave={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />,
  )
}

describe('ApiKeyModal helper text contrast', () => {
  it('keeps the helper text off --fg-dim, which sits below the contrast floor', () => {
    renderModal()
    const helper = screen.getByText(/your key stays in your browser/i)
    expect(helper.className.split(/\s+/)).not.toContain('text-fg-dim')
  })
})

describe('ApiKeyModal provider key-generation links', () => {
  it('shows a link to the anthropic key page when anthropic is selected (default)', () => {
    renderModal()
    const link = screen.getByRole('link', { name: /api key/i })
    expect(link).toHaveAttribute('href', 'https://console.anthropic.com/settings/keys')
  })

  it('shows a link to the openai key page when openai is selected', () => {
    renderModal()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'openai' } })
    const link = screen.getByRole('link', { name: /api key/i })
    expect(link).toHaveAttribute('href', 'https://platform.openai.com/api-keys')
  })

  it('shows a link to the gemini key page when gemini is selected', () => {
    renderModal()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'gemini' } })
    const link = screen.getByRole('link', { name: /api key/i })
    expect(link).toHaveAttribute('href', 'https://aistudio.google.com/app/apikey')
  })

  it('link opens in a new tab', () => {
    renderModal()
    const link = screen.getByRole('link', { name: /api key/i })
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('link has rel="noopener noreferrer"', () => {
    renderModal()
    const link = screen.getByRole('link', { name: /api key/i })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('link href updates when provider changes', () => {
    renderModal()
    const select = screen.getByRole('combobox')

    fireEvent.change(select, { target: { value: 'openai' } })
    expect(screen.getByRole('link', { name: /api key/i })).toHaveAttribute(
      'href',
      'https://platform.openai.com/api-keys',
    )

    fireEvent.change(select, { target: { value: 'anthropic' } })
    expect(screen.getByRole('link', { name: /api key/i })).toHaveAttribute(
      'href',
      'https://console.anthropic.com/settings/keys',
    )
  })

  it('link aria-label includes the selected provider name', () => {
    renderModal()
    expect(screen.getByRole('link', { name: /api key/i })).toHaveAttribute(
      'aria-label',
      'get anthropic api key',
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'gemini' } })
    expect(screen.getByRole('link', { name: /api key/i })).toHaveAttribute(
      'aria-label',
      'get gemini api key',
    )
  })
})

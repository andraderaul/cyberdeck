import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AiConfigBanner from './ai-config-banner'

function renderBanner(props: Partial<Parameters<typeof AiConfigBanner>[0]> = {}) {
  return render(<AiConfigBanner onConfigure={vi.fn()} {...props} />)
}

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('AiConfigBanner', () => {
  it('renders banner text about AI Analyze by default', () => {
    renderBanner()
    expect(screen.getByText(/AI Analyze/i)).toBeInTheDocument()
  })

  it('calls onConfigure when the CTA button is clicked', () => {
    const onConfigure = vi.fn()
    renderBanner({ onConfigure })
    fireEvent.click(screen.getByRole('button', { name: /configure AI/i }))
    expect(onConfigure).toHaveBeenCalledOnce()
  })

  it('hides the banner after clicking dismiss and writes dismissed flag to sessionStorage', () => {
    renderBanner()
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText(/AI Analyze/i)).not.toBeInTheDocument()
    expect(sessionStorage.getItem('ai-config-banner-dismissed')).toBe('true')
  })

  it('does not render when sessionStorage dismissed flag is already set', () => {
    sessionStorage.setItem('ai-config-banner-dismissed', 'true')
    renderBanner()
    expect(screen.queryByText(/AI Analyze/i)).not.toBeInTheDocument()
  })
})

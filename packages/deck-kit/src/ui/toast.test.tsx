import { render, renderHook, screen } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it, vi } from 'vitest'
import Toast from './toast'
import {
  ToastContext,
  ToastProvider,
  useToastError,
  useToastInfo,
  useToastWarn,
} from './toast-provider'

// ── Toast component ──────────────────────────────────────────────────────────

describe('Toast component', () => {
  it('variant="error" has border-danger class', () => {
    render(<Toast message="oops" variant="error" onDismiss={vi.fn()} />)
    const el = screen.getByRole('alert')
    expect(el.className).toContain('border-danger')
  })

  it('variant="error" icon is ✕ (distinct from warn ⚠)', () => {
    render(<Toast message="oops" variant="error" onDismiss={vi.fn()} />)
    expect(screen.getByText('✕')).toBeInTheDocument()
  })

  it('variant="info" has border-info class', () => {
    render(<Toast message="info msg" variant="info" onDismiss={vi.fn()} />)
    const el = screen.getByRole('alert')
    expect(el.className).toContain('border-info')
  })

  it('variant="info" icon has text-info class', () => {
    render(<Toast message="info msg" variant="info" onDismiss={vi.fn()} />)
    const icon = screen.getByText('ℹ')
    expect(icon.className).toContain('text-info')
  })

  it('variant="warn" has border-warning class', () => {
    render(<Toast message="warn msg" variant="warn" onDismiss={vi.fn()} />)
    const el = screen.getByRole('alert')
    expect(el.className).toContain('border-warning')
  })

  it('variant="warn" icon has text-warning class', () => {
    render(<Toast message="warn msg" variant="warn" onDismiss={vi.fn()} />)
    const icon = screen.getByText('⚠')
    expect(icon.className).toContain('text-warning')
  })
})

// ── ToastProvider context ────────────────────────────────────────────────────

function ContextConsumer() {
  const ctx = useContext(ToastContext)
  return (
    <div>
      <span data-testid="has-error">{typeof ctx.error}</span>
      <span data-testid="has-info">{typeof ctx.info}</span>
      <span data-testid="has-warn">{typeof ctx.warn}</span>
    </div>
  )
}

// The dismiss glyph is ~7x13px on its own. The negative margins are what let it reach 44 without
// taking a one-line toast from ~37px to ~60px.
describe('the dismiss target', () => {
  it('reaches 44px square and overflows the padding box to do it', () => {
    render(<Toast message="gone wrong" variant="error" onDismiss={() => {}} />)
    const classes = new Set(screen.getByRole('button', { name: 'dismiss' }).className.split(/\s+/))

    expect(classes).toContain('min-h-[44px]')
    expect(classes).toContain('min-w-[44px]')
    expect(classes).toContain('-my-2xs')
  })
})

describe('ToastProvider context', () => {
  it('provides error, info, and warn functions through context', () => {
    render(
      <ToastProvider>
        <ContextConsumer />
      </ToastProvider>,
    )
    expect(screen.getByTestId('has-error').textContent).toBe('function')
    expect(screen.getByTestId('has-info').textContent).toBe('function')
    expect(screen.getByTestId('has-warn').textContent).toBe('function')
  })
})

// ── Hook return types ────────────────────────────────────────────────────────

describe('toast hooks', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ToastProvider>{children}</ToastProvider>
  )

  it('useToastError returns a function', () => {
    const { result } = renderHook(() => useToastError(), { wrapper })
    expect(typeof result.current).toBe('function')
  })

  it('useToastInfo returns a function', () => {
    const { result } = renderHook(() => useToastInfo(), { wrapper })
    expect(typeof result.current).toBe('function')
  })

  it('useToastWarn returns a function', () => {
    const { result } = renderHook(() => useToastWarn(), { wrapper })
    expect(typeof result.current).toBe('function')
  })
})

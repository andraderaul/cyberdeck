import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MobileBottomSheet from './mobile-bottom-sheet'

describe('MobileBottomSheet', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders children when open', () => {
    render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
        <div>Sheet content</div>
      </MobileBottomSheet>,
    )
    expect(screen.getByText('Sheet content')).toBeInTheDocument()
  })

  it('does not render children when closed', () => {
    render(
      <MobileBottomSheet isOpen={false} onClose={vi.fn()}>
        <div>Sheet content</div>
      </MobileBottomSheet>,
    )
    expect(screen.queryByText('Sheet content')).not.toBeInTheDocument()
  })

  it('calls onClose when overlay backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose}>
        <div>Sheet content</div>
      </MobileBottomSheet>,
    )
    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose}>
        <div>Sheet content</div>
      </MobileBottomSheet>,
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose}>
        <div>Sheet content</div>
      </MobileBottomSheet>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('locks body scroll when open', () => {
    render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
        <div>content</div>
      </MobileBottomSheet>,
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll when closed', () => {
    const { rerender } = render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
        <div>content</div>
      </MobileBottomSheet>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <MobileBottomSheet isOpen={false} onClose={vi.fn()}>
        <div>content</div>
      </MobileBottomSheet>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('calls onClose on swipe-down gesture of 80px+ on the drag handle', () => {
    const onClose = vi.fn()
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose}>
        <div>Sheet content</div>
      </MobileBottomSheet>,
    )
    const handle = screen.getByTestId('drag-handle')
    fireEvent.touchStart(handle, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(handle, { touches: [{ clientY: 190 }] })
    fireEvent.touchEnd(handle)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close on short swipe-down (< 80px) on handle', () => {
    const onClose = vi.fn()
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose}>
        <div>Sheet content</div>
      </MobileBottomSheet>,
    )
    const handle = screen.getByTestId('drag-handle')
    fireEvent.touchStart(handle, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(handle, { touches: [{ clientY: 150 }] })
    fireEvent.touchEnd(handle)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('close button does not use text-muted (fails WCAG AA)', () => {
    render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
        <div>content</div>
      </MobileBottomSheet>,
    )
    const closeBtn = screen.getByRole('button', { name: /close/i })
    expect(closeBtn.className.split(/\s+/)).not.toContain('text-muted')
  })

  it('does not close when scrolling inside the sheet body (not the handle)', () => {
    const onClose = vi.fn()
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose}>
        <div>Sheet content</div>
      </MobileBottomSheet>,
    )
    // Touch the dialog content area (not the handle)
    const panel = screen.getByRole('dialog')
    fireEvent.touchStart(panel, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(panel, { touches: [{ clientY: 190 }] })
    fireEvent.touchEnd(panel)
    expect(onClose).not.toHaveBeenCalled()
  })

  describe('Focus trap (via useDialog)', () => {
    const TABBABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function getSheetTabbables(container: HTMLElement): HTMLElement[] {
      return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter((el) => {
        const trap = el.closest<HTMLElement>('[tabindex="-1"]')
        return !trap || trap === container
      })
    }

    it('wraps Tab forward from last tabbable to first inside the sheet', () => {
      render(
        <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
          <button type="button" id="btn1">
            Button 1
          </button>
          <button type="button" id="btn2">
            Button 2
          </button>
        </MobileBottomSheet>,
      )

      const dialog = screen.getByRole('dialog')
      const tabbables = getSheetTabbables(dialog)

      expect(tabbables.length).toBeGreaterThan(1)

      const last = tabbables[tabbables.length - 1]
      last.focus()
      expect(document.activeElement).toBe(last)

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false })
      expect(document.activeElement).toBe(tabbables[0])
    })

    it('wraps Shift+Tab backward from first tabbable to last inside the sheet', () => {
      render(
        <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
          <button type="button" id="btn1">
            Button 1
          </button>
          <button type="button" id="btn2">
            Button 2
          </button>
        </MobileBottomSheet>,
      )

      const dialog = screen.getByRole('dialog')
      const tabbables = getSheetTabbables(dialog)

      expect(tabbables.length).toBeGreaterThan(1)

      const first = tabbables[0]
      first.focus()
      expect(document.activeElement).toBe(first)

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(tabbables[tabbables.length - 1])
    })
  })
})

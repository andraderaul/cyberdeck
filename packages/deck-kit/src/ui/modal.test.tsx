import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Modal from './modal'

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getTabbables(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return []
  }
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => !el.closest('[tabindex="-1"]'),
  )
}

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const defaultProps = {
    onClose: vi.fn(),
    title: <span>Test Title</span>,
    ariaLabel: 'Test Modal',
    children: (
      <div>
        <button type="button">First Button</button>
        <button type="button">Second Button</button>
        <button type="button">Last Button</button>
      </div>
    ),
  }
  return render(<Modal {...defaultProps} {...props} />)
}

describe('Modal', () => {
  describe('Escape key', () => {
    it('calls onClose when Escape is pressed and closeable=true', () => {
      const onClose = vi.fn()
      renderModal({ onClose, closeable: true })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does NOT call onClose when Escape is pressed and closeable=false', () => {
      const onClose = vi.fn()
      renderModal({ onClose, closeable: false })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Focus on open', () => {
    it('moves focus to the first tabbable element inside the dialog on open', () => {
      const { container } = render(
        <div>
          <button type="button" id="outside">
            Outside
          </button>
        </div>,
      )
      const outsideBtn = container.querySelector<HTMLElement>('#outside')
      if (!outsideBtn) {
        throw new Error('outsideBtn not found')
      }
      outsideBtn.focus()
      expect(document.activeElement).toBe(outsideBtn)

      render(
        <Modal onClose={vi.fn()} title="T" ariaLabel="modal">
          <button type="button" id="first-in-modal">
            First
          </button>
          <button type="button" id="second-in-modal">
            Second
          </button>
        </Modal>,
      )

      const dialog = screen.getByRole('dialog')
      const tabbables = getTabbables(dialog)
      expect(tabbables.length).toBeGreaterThan(0)
      expect(document.activeElement).toBe(tabbables[0])
    })
  })

  describe('Focus trap', () => {
    it('wraps Tab from last tabbable to first', () => {
      renderModal()
      const dialog = screen.getByRole('dialog')
      const tabbables = getTabbables(dialog)
      expect(tabbables.length).toBeGreaterThan(1)

      const last = tabbables[tabbables.length - 1]
      last.focus()
      expect(document.activeElement).toBe(last)

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false })
      expect(document.activeElement).toBe(tabbables[0])
    })

    it('wraps Shift+Tab from first tabbable to last', () => {
      renderModal()
      const dialog = screen.getByRole('dialog')
      const tabbables = getTabbables(dialog)
      expect(tabbables.length).toBeGreaterThan(1)

      const first = tabbables[0]
      first.focus()
      expect(document.activeElement).toBe(first)

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(tabbables[tabbables.length - 1])
    })
  })

  describe('close button contrast', () => {
    it('stays off --fg-dim, which sits below the contrast floor', () => {
      renderModal()
      const closeBtn = screen.getByRole('button', { name: '✕' })
      expect(closeBtn.className.split(/\s+/)).not.toContain('text-fg-dim')
    })
  })

  describe('Focus return on close', () => {
    it('returns focus to the previously focused element when modal unmounts', () => {
      const { container, unmount: unmountModal } = render(
        <button type="button" id="trigger">
          Open Modal
        </button>,
      )
      const trigger = container.querySelector<HTMLElement>('#trigger')
      if (!trigger) {
        throw new Error('trigger not found')
      }
      trigger.focus()
      expect(document.activeElement).toBe(trigger)

      const { unmount } = renderModal()
      const dialog = screen.getByRole('dialog')
      const tabbables = getTabbables(dialog)
      expect(document.activeElement).toBe(tabbables[0])

      unmount()
      expect(document.activeElement).toBe(trigger)

      unmountModal()
    })
  })

  describe('Mobile overflow', () => {
    it('caps the panel to the viewport and scrolls internally, so a tall dialog cannot clip its title', () => {
      renderModal()
      const tokens = screen.getByRole('dialog').className.split(/\s+/)
      expect(tokens).toContain('max-h-full')
      expect(tokens).toContain('overflow-y-auto')
    })

    // The cap only reads as a cap with room around it — flush to the edge, a capped panel looks clipped
    it('pads the overlay, so the capped panel is inset from the viewport edge', () => {
      renderModal()
      const overlay = screen.getByRole('presentation')
      expect(overlay.className.split(/\s+/)).toContain('p-md')
    })
  })

  describe('Body scroll lock (via useDialog)', () => {
    it('locks body scroll when modal is open', () => {
      renderModal()
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('restores body scroll when modal unmounts', () => {
      const { unmount } = renderModal()
      expect(document.body.style.overflow).toBe('hidden')
      unmount()
      expect(document.body.style.overflow).toBe('')
    })
  })
})

import { type RefObject, useEffect } from 'react'

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getTabbables(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return []
  }
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter((el) => {
    const trap = el.closest<HTMLElement>('[tabindex="-1"]')
    // Exclude the element if it lives inside a tabindex="-1" subtree that is
    // itself inside our container (not the container itself).
    return !trap || trap === container
  })
}

export interface UseDialogOptions {
  panelRef: RefObject<HTMLElement | null>
  onClose: () => void
  triggerRef?: RefObject<HTMLElement | null>
}

export function useDialog({ panelRef, onClose, triggerRef }: UseDialogOptions): void {
  // Focus first tabbable on mount; return focus on unmount
  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const tabbables = getTabbables(panelRef.current)
    tabbables[0]?.focus()

    return () => {
      if (triggerRef?.current) {
        triggerRef.current.focus()
      } else {
        previouslyFocused?.focus()
      }
    }
  }, [panelRef, triggerRef])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Escape key → onClose
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus trap on Tab/Shift+Tab
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) {
      return
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') {
        return
      }
      const tabbables = getTabbables(panel)
      if (tabbables.length === 0) {
        return
      }
      const first = tabbables[0]
      const last = tabbables[tabbables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    panel.addEventListener('keydown', handler)
    return () => panel.removeEventListener('keydown', handler)
  }, [panelRef])
}

import type { ReactNode, RefObject } from 'react'
import { useEffect, useRef } from 'react'
import { cn } from '../utils/cn'

interface Props {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  triggerRef?: RefObject<HTMLElement | null>
}

export default function MobileBottomSheet({ isOpen, onClose, children, triggerRef }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)
  const touchCurrentY = useRef<number | null>(null)

  // Focus first focusable element on open; return focus to trigger on close
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
      )
      focusable[0]?.focus()
    } else if (!isOpen) {
      const el = triggerRef?.current
      if (el && typeof el.focus === 'function') {
        el.focus()
      }
    }
  }, [isOpen, triggerRef])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Escape key listener
  useEffect(() => {
    if (!isOpen) {
      return
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Drag handle touch handlers — scoped to handle only
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchCurrentY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY
    const delta = Math.max(0, touchCurrentY.current - (touchStartY.current ?? 0))
    if (panelRef.current) {
      panelRef.current.style.transform = `translateY(${delta}px)`
      panelRef.current.style.transition = 'none'
    }
  }

  const handleTouchEnd = () => {
    const start = touchStartY.current
    const current = touchCurrentY.current
    if (panelRef.current) {
      panelRef.current.style.transform = ''
      panelRef.current.style.transition = ''
    }
    if (start !== null && current !== null && current - start >= 80) {
      onClose()
    }
    touchStartY.current = null
    touchCurrentY.current = null
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <button
        type="button"
        data-testid="sheet-backdrop"
        className={cn(
          'absolute inset-0 w-full h-full bg-modal-overlay backdrop-blur-sm',
          'cursor-default border-none',
        )}
        onClick={onClose}
        aria-label="dismiss sheet"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Controls"
        tabIndex={-1}
        className="absolute bottom-0 left-0 right-0 bg-abyss border-t border-slate rounded-t-sm max-h-[80vh] flex flex-col"
      >
        {/* Drag handle — touch handlers scoped here, not on the scroll body */}
        <div
          data-testid="drag-handle"
          className="relative flex items-center justify-center px-md py-sm border-b border-base shrink-0 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-8 h-1 bg-slate rounded-full" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-md text-muted text-sm cursor-pointer bg-transparent border-none"
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-md">{children}</div>
      </div>
    </div>
  )
}

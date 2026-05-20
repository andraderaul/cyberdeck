import { type ReactNode, useEffect, useRef } from 'react'
import { cn } from '../../utils/cn'

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

interface Props {
  children: ReactNode
  onClose: () => void
  title: ReactNode
  ariaLabel: string
  variant?: 'default' | 'cyber'
  closeable?: boolean
  containerClassName?: string
}

export default function Modal({
  children,
  onClose,
  title,
  ariaLabel,
  variant = 'cyber',
  closeable = true,
  containerClassName,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  // Save the currently focused element, then focus first tabbable on mount
  useEffect(() => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const tabbables = getTabbables(dialogRef.current)
    tabbables[0]?.focus()
    return () => {
      triggerRef.current?.focus()
    }
  }, [])

  // Escape key handler
  useEffect(() => {
    if (!closeable) {
      return
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closeable, onClose])

  // Focus trap on keydown inside dialog
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') {
      return
    }
    const tabbables = getTabbables(dialogRef.current)
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

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-modal-overlay backdrop-blur-sm"
    >
      {closeable && (
        <button
          type="button"
          className="absolute inset-0 w-full h-full cursor-default bg-transparent border-none"
          onClick={onClose}
          tabIndex={-1}
        />
      )}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex flex-col p-xl',
          variant === 'default'
            ? 'gap-lg bg-elevated max-w-[480px] w-[90%] rounded-sm border border-base'
            : 'gap-md bg-abyss border border-slate border-t-2 border-t-violet w-full max-w-sm',
          containerClassName,
        )}
      >
        <div className="flex items-center justify-between">
          {title}
          {closeable && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted text-sm cursor-pointer bg-transparent border-none"
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

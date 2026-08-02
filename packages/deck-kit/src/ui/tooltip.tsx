import { useEffect, useRef, useState } from 'react'
import { cn } from '../utils/cn'
import { ICON_GLYPH_SIZE } from './icon-glyph'
import { TOUCH_TARGET_OVERLAY } from './touch-target'

interface Props {
  id: string
  content: string
}

export default function Tooltip({ id, content }: Props) {
  const [visible, setVisible] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Tracks whether focus just opened the tooltip so the subsequent click
  // (which always fires after focus on touch) doesn't immediately close it.
  const justFocusedRef = useRef(false)

  useEffect(() => {
    if (!visible) {
      return
    }

    function handleOutsideClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) {
        return
      }
      setVisible(false)
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setVisible(false)
      }
    }

    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible])

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-label="more info"
        aria-expanded={visible}
        aria-describedby={id}
        // The target is an overlay rather than padding because this sits in a Slider's label row: a
        // 44px box would triple that row's height, and with three sliders on a phone it would push
        // the params the labels name off the screen. Its neighbours are inert text either side.
        className={cn(
          'font-mono text-fg-subtle hover:text-accent transition-colors cursor-help p-0 bg-transparent border-none',
          ICON_GLYPH_SIZE,
          TOUCH_TARGET_OVERLAY,
        )}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => {
          justFocusedRef.current = true
          setVisible(true)
        }}
        onBlur={() => {
          justFocusedRef.current = false
          setVisible(false)
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (justFocusedRef.current) {
            justFocusedRef.current = false
            return
          }
          setVisible((v) => !v)
        }}
      >
        &#x24D8;
      </button>
      <div
        id={id}
        role="tooltip"
        aria-hidden={!visible}
        className={cn(
          'absolute z-10 max-w-48 w-max p-xs bg-bg-elevated border border-base rounded-xs font-mono text-xs text-fg-muted leading-relaxed',
          'top-full left-0 mt-2xs',
          visible ? 'block' : 'hidden',
        )}
      >
        {content}
      </div>
    </span>
  )
}

import type { KeyboardEvent } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Theme } from '../theme/themes'
import { useTheme } from '../theme/use-theme'
import { cn } from '../utils/cn'

interface Props {
  className?: string
}

/**
 * The deck's Theme picker, as a popover (ADR 0024). It lives in the header — the one surface all
 * the programs share, and the one that already carries deck-level rather than program-level
 * controls — and the trigger shows the Theme in force rather than one it would move to, because the
 * label has to answer "what am I looking at" before "what happens if I press it".
 *
 * **It presents the roster rather than cycling it.** The control it replaced cycled, which traded
 * discoverability for width and only held while any Theme was two activations away — a ceiling ADR
 * 0024 put at four. A popover has no width-based cap: it lists every Theme, marks the one in force,
 * and lets a user jump straight to the one they want. The header cost the cycling control existed to
 * avoid is paid instead by keeping the panel small and anchored to the trigger.
 *
 * Menu semantics rather than a listbox: a Theme is an action taken immediately, not a value staged
 * for a later submit, and `menuitemradio` is the one role that says both "picking me does something
 * now" and "exactly one of us is the current answer". Opening lands focus on the Theme in force so a
 * keyboard or screen-reader user starts where they are; the arrows move within the list, Escape or a
 * pick closes it, and focus returns to the trigger either way so the header place is never lost.
 *
 * Born in the kit rather than duplicated first: the usual discipline is to extract at the second
 * caller once the diff is empty (ADR 0014), but the callers are known to be identical and there is
 * no per-program variation to discover, so duplicating would be ceremony.
 */
export default function ThemeControl({ className }: Props) {
  const { theme, themes, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = useId()

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  const select = useCallback(
    (next: Theme) => {
      setTheme(next)
      closeAndReturnFocus()
    },
    [setTheme, closeAndReturnFocus],
  )

  useEffect(() => {
    if (!open) {
      return
    }
    // Focus starts on the Theme in force, never the top of the list, so "where am I" is answered
    // before "what else is there".
    const start = Math.max(0, themes.indexOf(theme))
    optionRefs.current[start]?.focus()
  }, [open, theme, themes])

  useEffect(() => {
    if (!open) {
      return
    }
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const count = themes.length
    const current = optionRefs.current.indexOf(document.activeElement as HTMLButtonElement | null)
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        optionRefs.current[(current + 1) % count]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        optionRefs.current[(current - 1 + count) % count]?.focus()
        break
      case 'Home':
        event.preventDefault()
        optionRefs.current[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        optionRefs.current[count - 1]?.focus()
        break
      case 'Escape':
        event.preventDefault()
        closeAndReturnFocus()
        break
      case 'Tab':
        // A menu does not trap Tab, but it closes behind you rather than lingering open off-screen.
        setOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        // The visible label is the Theme's name, so the accessible name has to contain it as well as
        // say what the control is (WCAG 2.5.3).
        aria-label={`theme: ${theme}`}
        title="pick the deck's theme"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={cn(
          'flex min-h-[44px] items-center justify-center gap-2xs',
          'rounded-pill border border-transparent bg-transparent px-md py-2xs',
          'font-mono text-fg-subtle text-xs tracking-wide',
          'cursor-pointer transition-all duration-fast',
          'hover:border-base hover:text-fg',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        )}
      >
        <span aria-hidden="true">◐</span>
        {theme}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="theme"
          onKeyDown={onMenuKeyDown}
          className={cn(
            'absolute right-0 top-full z-10 mt-2xs min-w-[8rem]',
            'flex flex-col rounded-xs border border-base bg-bg-elevated p-2xs',
          )}
        >
          {themes.map((option, index) => {
            const isActive = option === theme
            return (
              <button
                key={option}
                ref={(el) => {
                  optionRefs.current[index] = el
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                // Roving focus: the menu is one tab stop, and the arrows move within it.
                tabIndex={-1}
                onClick={() => select(option)}
                className={cn(
                  'flex min-h-[36px] items-center gap-xs rounded-xs px-xs py-2xs',
                  'font-mono text-xs tracking-wide',
                  'cursor-pointer transition-colors duration-fast',
                  isActive ? 'text-accent' : 'text-fg-subtle hover:text-fg',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(isActive ? 'text-accent' : 'text-transparent')}
                >
                  ◐
                </span>
                {option}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { cn } from '../utils/cn'

export default function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
  labels,
  ariaLabel,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  fullWidth?: boolean
  labels?: Partial<Record<T, React.ReactNode>>
  ariaLabel?: string
}) {
  return (
    <fieldset
      className={cn('flex border-none p-0 m-0', fullWidth ? 'gap-2xs' : 'gap-xs flex-wrap')}
    >
      {/* A fieldset is spec'd to take its name from its legend, and `aria-label` on one is honoured
          inconsistently — the same reason PresetPicker spells it this way. */}
      <legend className="sr-only">{ariaLabel}</legend>
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => onChange(opt)}
          // Colour and border alone are no state at all to a screen reader (WCAG 1.4.1, 4.1.2). This
          // is the toggle-button spelling `Chip` already uses, rather than a radiogroup: single
          // select is the truer role, but it would drag in roving tabindex and arrow keys, and every
          // option here is meant to stay its own tab stop.
          aria-pressed={value === opt}
          className={cn(
            'min-h-[44px] text-xs font-mono tracking-wide rounded-xs border cursor-pointer transition-all duration-fast',
            fullWidth ? 'flex-1 py-2xs' : 'py-xs px-sm',
            value === opt
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-base bg-transparent text-fg-muted',
          )}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </fieldset>
  )
}

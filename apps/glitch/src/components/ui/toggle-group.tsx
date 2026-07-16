import { cn } from '../../utils/cn'

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
      aria-label={ariaLabel}
      className={cn('flex border-none p-0 m-0', fullWidth ? 'gap-2xs' : 'gap-xs flex-wrap')}
    >
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'min-h-[44px] text-xs font-mono tracking-wide rounded-xs border cursor-pointer transition-all duration-fast',
            fullWidth ? 'flex-1 py-2xs' : 'py-xs px-sm',
            value === opt
              ? 'border-violet bg-accent-soft text-violet'
              : 'border-base bg-transparent text-fg-muted',
          )}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </fieldset>
  )
}

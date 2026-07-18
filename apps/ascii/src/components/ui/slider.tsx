import { cn } from '@cyberdeck/deck-kit/utils'
import type { ReactNode } from 'react'
import Label from './label'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
  defaultValue?: number
  tooltip?: ReactNode
  tooltipId?: string
}

/**
 * Accounts for the 20px thumb width so the marker aligns with the visual thumb center
 * rather than the input's left edge at min and max.
 */
function pct(value: number, min: number, max: number): string {
  const ratio = (value - min) / (max - min)
  return `calc(${ratio * 100}% + ${(0.5 - ratio) * 20}px)`
}

export default function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => v.toFixed(1),
  defaultValue,
  tooltip,
  tooltipId,
}: Props) {
  const isAtDefault = defaultValue !== undefined && value === defaultValue

  return (
    <div className="flex flex-col gap-2xs">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2xs">
          <Label>{label}</Label>
          {tooltip}
        </div>
        <span className="text-violet text-xs">{format(value)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          aria-label={label}
          aria-describedby={tooltipId}
          title={
            defaultValue !== undefined
              ? `double-click to reset to ${format(defaultValue)}`
              : undefined
          }
          aria-valuetext={format(value)}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onDoubleClick={() => {
            if (defaultValue !== undefined) {
              onChange(defaultValue)
            }
          }}
          style={{ touchAction: 'pan-y' }}
        />
        {defaultValue !== undefined && (
          <div
            data-testid="default-marker"
            aria-hidden="true"
            className={cn(
              'absolute w-0.5 h-2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-pill pointer-events-none',
              isAtDefault ? 'bg-violet' : 'bg-slate',
            )}
            style={{ left: pct(defaultValue, min, max) }}
          />
        )}
      </div>
    </div>
  )
}

import {
  type ChannelName,
  DEFAULT_PIXEL_SORT,
  type GlitchSettings,
  type SortDirection,
} from '../glitch/types'
import Label from './ui/label'
import Slider from './ui/slider'
import ToggleGroup from './ui/toggle-group'

export const CHANNEL_SHIFT_AMOUNT_RANGE = { min: -40, max: 40 } as const

export const PIXEL_SORT_THRESHOLD_RANGE = { min: 0, max: 1 } as const

export const PIXEL_SORT_RUN_LENGTH_RANGE = { min: 1, max: 200 } as const

const CHANNELS: readonly ChannelName[] = ['r', 'g', 'b']

const CHANNEL_LABELS: Record<ChannelName, string> = { r: 'red', g: 'green', b: 'blue' }

const SORT_DIRECTIONS: readonly SortDirection[] = ['horizontal', 'vertical']

const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  horizontal: 'horiz',
  vertical: 'vert',
}

// The toggle primitive speaks in string options, so the boolean rides in as a two-option group.
const SORT_POWER = ['off', 'on'] as const

interface Props {
  settings: GlitchSettings
  onChange: (patch: Partial<GlitchSettings>) => void
}

export default function ControlPanel({ settings, onChange }: Props) {
  const { channelShift, pixelSort } = settings

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <Label>pixel sort</Label>
        <ToggleGroup
          ariaLabel="pixel sort"
          options={SORT_POWER}
          value={pixelSort.enabled ? 'on' : 'off'}
          fullWidth
          onChange={(power) => onChange({ pixelSort: { ...pixelSort, enabled: power === 'on' } })}
        />
        {pixelSort.enabled && (
          <>
            <ToggleGroup
              ariaLabel="sort direction"
              options={SORT_DIRECTIONS}
              value={pixelSort.direction}
              labels={SORT_DIRECTION_LABELS}
              fullWidth
              onChange={(direction) => onChange({ pixelSort: { ...pixelSort, direction } })}
            />
            <Slider
              label="threshold"
              value={pixelSort.threshold}
              min={PIXEL_SORT_THRESHOLD_RANGE.min}
              max={PIXEL_SORT_THRESHOLD_RANGE.max}
              step={0.01}
              defaultValue={DEFAULT_PIXEL_SORT.threshold}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(threshold) => onChange({ pixelSort: { ...pixelSort, threshold } })}
            />
            <Slider
              label="run length"
              value={pixelSort.runLength}
              min={PIXEL_SORT_RUN_LENGTH_RANGE.min}
              max={PIXEL_SORT_RUN_LENGTH_RANGE.max}
              step={1}
              defaultValue={DEFAULT_PIXEL_SORT.runLength}
              format={(v) => `${v}px`}
              onChange={(runLength) => onChange({ pixelSort: { ...pixelSort, runLength } })}
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-sm">
        <Label>channel shift</Label>
        <ToggleGroup
          ariaLabel="channel"
          options={CHANNELS}
          value={channelShift.channel}
          labels={CHANNEL_LABELS}
          fullWidth
          onChange={(channel) => onChange({ channelShift: { ...channelShift, channel } })}
        />
        <Slider
          label="amount"
          value={channelShift.amount}
          min={CHANNEL_SHIFT_AMOUNT_RANGE.min}
          max={CHANNEL_SHIFT_AMOUNT_RANGE.max}
          step={1}
          defaultValue={0}
          format={(v) => `${v}px`}
          onChange={(amount) => onChange({ channelShift: { ...channelShift, amount } })}
        />
      </div>
    </div>
  )
}

import type { ChannelName, GlitchSettings } from '../glitch/types'
import Label from './ui/label'
import Slider from './ui/slider'
import ToggleGroup from './ui/toggle-group'

export const CHANNEL_SHIFT_AMOUNT_RANGE = { min: -40, max: 40 } as const

const CHANNELS: readonly ChannelName[] = ['r', 'g', 'b']

const CHANNEL_LABELS: Record<ChannelName, string> = { r: 'red', g: 'green', b: 'blue' }

interface Props {
  settings: GlitchSettings
  onChange: (patch: Partial<GlitchSettings>) => void
}

export default function ControlPanel({ settings, onChange }: Props) {
  const { channelShift } = settings

  return (
    <div className="flex flex-col gap-lg">
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

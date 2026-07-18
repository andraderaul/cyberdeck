import { Button } from '@cyberdeck/deck-kit/ui'
import {
  CHANNEL_SHIFT_AMOUNT_RANGE,
  type ChannelName,
  DEFAULT_BLOCK_DISPLACEMENT,
  DEFAULT_NOISE,
  DEFAULT_PIXEL_SORT,
  DEFAULT_SCANLINES,
  type GlitchSettings,
  type NoiseTint,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  SCANLINES_DENSITY_STEP,
  type SortDirection,
} from '../glitch/types'
import Label from './ui/label'
import Slider from './ui/slider'
import ToggleGroup from './ui/toggle-group'

export const BLOCK_DISPLACEMENT_DENSITY_RANGE = { min: 0, max: 1 } as const

export const BLOCK_DISPLACEMENT_AMOUNT_RANGE = { min: 0, max: 1 } as const

export const PIXEL_SORT_THRESHOLD_RANGE = { min: 0, max: 1 } as const

export const SCANLINES_DENSITY_RANGE = { min: 0, max: 1 } as const

export const SCANLINES_INTENSITY_RANGE = { min: 0, max: 1 } as const

export const NOISE_AMOUNT_RANGE = { min: 0, max: 1 } as const

const CHANNELS: readonly ChannelName[] = ['r', 'g', 'b']

const NOISE_TINTS: readonly NoiseTint[] = ['mono', 'color']

const CHANNEL_LABELS: Record<ChannelName, string> = { r: 'red', g: 'green', b: 'blue' }

const SORT_DIRECTIONS: readonly SortDirection[] = ['horizontal', 'vertical']

const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  horizontal: 'horiz',
  vertical: 'vert',
}

// The toggle primitive speaks in string options, so an Effect's boolean rides in as a two-option group.
const EFFECT_POWER = ['off', 'on'] as const

interface Props {
  settings: GlitchSettings
  // Re-roll rides its own callback rather than an onChange patch: the Seed is not part of the look,
  // and the panel edits the look. Threading it as a patch would put the arrangement inside
  // GlitchSettings by the back door.
  onReroll: () => void
  onChange: (patch: Partial<GlitchSettings>) => void
}

export default function ControlPanel({ settings, onChange, onReroll }: Props) {
  const { blockDisplacement, channelShift, pixelSort, scanlines, noise } = settings

  // Sections run in the Pipeline's canonical order — the panel reads top to bottom the way the
  // Effects apply.
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <Label>seed</Label>
        <Button variant="ghost" onClick={onReroll} aria-label="re-roll" className="w-full">
          ⟳ re-roll
        </Button>
      </div>

      <div className="flex flex-col gap-sm">
        <Label>block displacement</Label>
        {/* No power toggle: the Effect is off at density 0, the way Noise is off at amount 0. */}
        {/* Labelled "blocks" and "displace" rather than after the params they edit: a screen reader
            reaches these labels with no section heading around them, and "density" alone would be
            indistinguishable from Scanlines'. */}
        <Slider
          label="blocks"
          value={blockDisplacement.density}
          min={BLOCK_DISPLACEMENT_DENSITY_RANGE.min}
          max={BLOCK_DISPLACEMENT_DENSITY_RANGE.max}
          step={0.01}
          defaultValue={DEFAULT_BLOCK_DISPLACEMENT.density}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(density) => onChange({ blockDisplacement: { ...blockDisplacement, density } })}
        />
        <Slider
          label="displace"
          value={blockDisplacement.amount}
          min={BLOCK_DISPLACEMENT_AMOUNT_RANGE.min}
          max={BLOCK_DISPLACEMENT_AMOUNT_RANGE.max}
          step={0.01}
          defaultValue={DEFAULT_BLOCK_DISPLACEMENT.amount}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(amount) => onChange({ blockDisplacement: { ...blockDisplacement, amount } })}
        />
      </div>

      <div className="flex flex-col gap-sm">
        <Label>pixel sort</Label>
        <ToggleGroup
          ariaLabel="pixel sort"
          options={EFFECT_POWER}
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

      <div className="flex flex-col gap-sm">
        <Label>scanlines</Label>
        <ToggleGroup
          ariaLabel="scanlines"
          options={EFFECT_POWER}
          value={scanlines.enabled ? 'on' : 'off'}
          fullWidth
          onChange={(power) => onChange({ scanlines: { ...scanlines, enabled: power === 'on' } })}
        />
        {scanlines.enabled && (
          <>
            <Slider
              label="density"
              value={scanlines.density}
              min={SCANLINES_DENSITY_RANGE.min}
              max={SCANLINES_DENSITY_RANGE.max}
              step={SCANLINES_DENSITY_STEP}
              defaultValue={DEFAULT_SCANLINES.density}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(density) => onChange({ scanlines: { ...scanlines, density } })}
            />
            <Slider
              label="intensity"
              value={scanlines.intensity}
              min={SCANLINES_INTENSITY_RANGE.min}
              max={SCANLINES_INTENSITY_RANGE.max}
              step={0.01}
              defaultValue={DEFAULT_SCANLINES.intensity}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(intensity) => onChange({ scanlines: { ...scanlines, intensity } })}
            />
          </>
        )}
      </div>

      {/* No power toggle: Noise is off at amount 0, the same way Channel Shift is off at amount 0. */}
      <div className="flex flex-col gap-sm">
        <Label>noise</Label>
        <ToggleGroup
          ariaLabel="noise tint"
          options={NOISE_TINTS}
          value={noise.tint}
          fullWidth
          onChange={(tint) => onChange({ noise: { ...noise, tint } })}
        />
        {/* Labelled "grain", not "amount" after the param it edits: the section headings are visual
            only, so a second slider named "amount" would reach a screen reader indistinguishable
            from Channel Shift's. */}
        <Slider
          label="grain"
          value={noise.amount}
          min={NOISE_AMOUNT_RANGE.min}
          max={NOISE_AMOUNT_RANGE.max}
          step={0.01}
          defaultValue={DEFAULT_NOISE.amount}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(amount) => onChange({ noise: { ...noise, amount } })}
        />
      </div>
    </div>
  )
}

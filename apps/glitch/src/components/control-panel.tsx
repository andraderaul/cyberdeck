import { Button, Label, Slider, ToggleGroup, Tooltip } from '@cyberdeck/deck-kit/ui'
import type { Chain, EffectType, Link } from '../glitch/chain'
import {
  CHANNEL_SHIFT_AMOUNT_RANGE,
  type ChannelName,
  DEFAULT_BLOCK_DISPLACEMENT,
  DEFAULT_CHANNEL_SHIFT,
  DEFAULT_CHROMATIC_ABERRATION,
  DEFAULT_NOISE,
  DEFAULT_PIXEL_SORT,
  DEFAULT_SCANLINES,
  type NoiseTint,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  SCANLINES_DENSITY_STEP,
  type SortDirection,
} from '../glitch/types'

export const BLOCK_DISPLACEMENT_DENSITY_RANGE = { min: 0, max: 1 } as const

export const BLOCK_DISPLACEMENT_AMOUNT_RANGE = { min: 0, max: 1 } as const

export const PIXEL_SORT_THRESHOLD_RANGE = { min: 0, max: 1 } as const

export const SCANLINES_DENSITY_RANGE = { min: 0, max: 1 } as const

export const SCANLINES_INTENSITY_RANGE = { min: 0, max: 1 } as const

export const NOISE_AMOUNT_RANGE = { min: 0, max: 1 } as const

export const CHROMATIC_ABERRATION_STRENGTH_RANGE = { min: 0, max: 1 } as const

const CHANNELS: readonly ChannelName[] = ['r', 'g', 'b']

const NOISE_TINTS: readonly NoiseTint[] = ['mono', 'color']

const CHANNEL_LABELS: Record<ChannelName, string> = { r: 'red', g: 'green', b: 'blue' }

const SORT_DIRECTIONS: readonly SortDirection[] = ['horizontal', 'vertical']

const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  horizontal: 'horiz',
  vertical: 'vert',
}

/** What each Effect is called in the panel — the Link's heading. */
export const EFFECT_LABELS: Record<EffectType, string> = {
  blockDisplacement: 'block displacement',
  pixelSort: 'pixel sort',
  channelShift: 'channel shift',
  chromaticAberration: 'chromatic aberration',
  scanlines: 'scanlines',
  noise: 'noise',
}

const EFFECT_TOOLTIPS: Record<EffectType, string> = {
  blockDisplacement: 'tears rectangular blocks sideways — data corruption',
  pixelSort: 'sorts bright runs of pixels — the melted smear',
  channelShift: 'offsets one r/g/b channel by a constant — rgb split',
  chromaticAberration: 'splits r/b outward from the centre — lens fringe',
  scanlines: 'dark horizontal lines over the image — crt raster',
  noise: 'grain / static laid over the image',
}

interface LinkProps {
  link: Link
  onChange: (params: Link['params']) => void
}

/**
 * The params editor for one Link. Switches on the Link's Effect because each one edits a genuinely
 * different param shape — this is the one place that has to know all six, which is why the rest of
 * the panel can stay a loop over the Chain.
 */
function LinkControls({ link, onChange }: LinkProps) {
  switch (link.type) {
    case 'blockDisplacement': {
      const params = link.params
      return (
        <>
          <Slider
            label="blocks"
            value={params.density}
            min={BLOCK_DISPLACEMENT_DENSITY_RANGE.min}
            max={BLOCK_DISPLACEMENT_DENSITY_RANGE.max}
            step={0.01}
            defaultValue={DEFAULT_BLOCK_DISPLACEMENT.density}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(density) => onChange({ ...params, density })}
          />
          <Slider
            label="displace"
            value={params.amount}
            min={BLOCK_DISPLACEMENT_AMOUNT_RANGE.min}
            max={BLOCK_DISPLACEMENT_AMOUNT_RANGE.max}
            step={0.01}
            defaultValue={DEFAULT_BLOCK_DISPLACEMENT.amount}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(amount) => onChange({ ...params, amount })}
          />
        </>
      )
    }
    case 'pixelSort': {
      const params = link.params
      return (
        <>
          <ToggleGroup
            ariaLabel="sort direction"
            options={SORT_DIRECTIONS}
            value={params.direction}
            labels={SORT_DIRECTION_LABELS}
            fullWidth
            onChange={(direction) => onChange({ ...params, direction })}
          />
          <Slider
            label="threshold"
            value={params.threshold}
            min={PIXEL_SORT_THRESHOLD_RANGE.min}
            max={PIXEL_SORT_THRESHOLD_RANGE.max}
            step={0.01}
            defaultValue={DEFAULT_PIXEL_SORT.threshold}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(threshold) => onChange({ ...params, threshold })}
          />
          <Slider
            label="run length"
            value={params.runLength}
            min={PIXEL_SORT_RUN_LENGTH_RANGE.min}
            max={PIXEL_SORT_RUN_LENGTH_RANGE.max}
            step={1}
            defaultValue={DEFAULT_PIXEL_SORT.runLength}
            format={(v) => `${v}px`}
            onChange={(runLength) => onChange({ ...params, runLength })}
          />
        </>
      )
    }
    case 'channelShift': {
      const params = link.params
      return (
        <>
          <ToggleGroup
            ariaLabel="channel"
            options={CHANNELS}
            value={params.channel}
            labels={CHANNEL_LABELS}
            fullWidth
            onChange={(channel) => onChange({ ...params, channel })}
          />
          <Slider
            label="amount"
            value={params.amount}
            min={CHANNEL_SHIFT_AMOUNT_RANGE.min}
            max={CHANNEL_SHIFT_AMOUNT_RANGE.max}
            step={1}
            defaultValue={DEFAULT_CHANNEL_SHIFT.amount}
            format={(v) => `${v}px`}
            onChange={(amount) => onChange({ ...params, amount })}
          />
        </>
      )
    }
    case 'chromaticAberration': {
      const params = link.params
      return (
        <Slider
          label="strength"
          value={params.strength}
          min={CHROMATIC_ABERRATION_STRENGTH_RANGE.min}
          max={CHROMATIC_ABERRATION_STRENGTH_RANGE.max}
          step={0.01}
          defaultValue={DEFAULT_CHROMATIC_ABERRATION.strength}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(strength) => onChange({ strength })}
        />
      )
    }
    case 'scanlines': {
      const params = link.params
      return (
        <>
          <Slider
            label="density"
            value={params.density}
            min={SCANLINES_DENSITY_RANGE.min}
            max={SCANLINES_DENSITY_RANGE.max}
            step={SCANLINES_DENSITY_STEP}
            defaultValue={DEFAULT_SCANLINES.density}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(density) => onChange({ ...params, density })}
          />
          <Slider
            label="intensity"
            value={params.intensity}
            min={SCANLINES_INTENSITY_RANGE.min}
            max={SCANLINES_INTENSITY_RANGE.max}
            step={0.01}
            defaultValue={DEFAULT_SCANLINES.intensity}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(intensity) => onChange({ ...params, intensity })}
          />
        </>
      )
    }
    case 'noise': {
      const params = link.params
      return (
        <>
          <ToggleGroup
            ariaLabel="noise tint"
            options={NOISE_TINTS}
            value={params.tint}
            fullWidth
            onChange={(tint) => onChange({ ...params, tint })}
          />
          {/* Labelled "grain", not "amount" after the param it edits: the section headings are
              visual only, so a second slider named "amount" would reach a screen reader
              indistinguishable from Channel Shift's. */}
          <Slider
            label="grain"
            value={params.amount}
            min={NOISE_AMOUNT_RANGE.min}
            max={NOISE_AMOUNT_RANGE.max}
            step={0.01}
            defaultValue={DEFAULT_NOISE.amount}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(amount) => onChange({ ...params, amount })}
          />
        </>
      )
    }
  }
}

interface Props {
  chain: Chain
  // Re-roll rides its own callback rather than a Link edit: the Seed is not part of the look, and
  // the panel edits the look. Threading it as a Link patch would put the arrangement inside the
  // Chain by the back door.
  onReroll: () => void
  onLinkChange: (id: string, params: Link['params']) => void
}

/**
 * The advanced surface: one section per Link, in Chain order.
 *
 * Reads top to bottom in the order the Effects apply, the same as before — but that order is now the
 * Chain's rather than a constant this file hardcodes, so a Preset that drops an Effect simply has
 * one section fewer (ADR 0017). Keyed by Link id, not by Effect: a Chain may hold the same Effect
 * twice, and keying by type would collapse the repeats into one row.
 */
export default function ControlPanel({ chain, onLinkChange, onReroll }: Props) {
  return (
    <div className="flex flex-col gap-lg">
      {chain.map((link) => (
        <div key={link.id} className="flex flex-col gap-sm">
          <div className="flex items-center gap-2xs">
            <Label>{EFFECT_LABELS[link.type]}</Label>
            <Tooltip id={`tooltip-${link.id}`} content={EFFECT_TOOLTIPS[link.type]} />
          </div>
          <LinkControls link={link} onChange={(params) => onLinkChange(link.id, params)} />
        </div>
      ))}

      {/* The Seed sits outside the Chain, so its control sits outside the Link list rather than
          becoming a seventh row that looks editable like the rest. */}
      <div className="flex flex-col gap-sm">
        <div className="flex items-center gap-2xs">
          <Label>seed</Label>
          <Tooltip
            id="tooltip-seed"
            content="the arrangement, not the look — re-roll rolls a new one"
          />
        </div>
        <Button variant="ghost" onClick={onReroll} aria-label="re-roll" className="w-full">
          ⟳ re-roll
        </Button>
      </div>
    </div>
  )
}

import { Button, Chip, Label, Slider, ToggleGroup, Tooltip } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'
import { useState } from 'react'
import {
  type Chain,
  EFFECT_REGISTRY,
  type EffectType,
  type Link,
  MAX_CHAIN_LENGTH,
} from '../glitch/chain'
import { EFFECT_ORDER } from '../glitch/presets'
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

/**
 * Whether duplicating this Link would render nothing — an idempotent Effect copied unedited.
 *
 * The copy is refused at the control rather than in `duplicateLink`, because the Chain it would
 * produce is *pointless*, not invalid: the same state is reachable by adding a second Link and
 * tuning it to match. Forbidding it in the core would push a UI judgement into the domain.
 */
function isIdempotent(link: Link): boolean {
  return EFFECT_REGISTRY[link.type].idempotent === true
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
  onReorder: (from: number, to: number) => void
  onAdd: (type: EffectType) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
}

/**
 * The advanced surface: one section per Link, in Chain order.
 *
 * Reads top to bottom in the order the Effects apply, the same as before — but that order is now the
 * Chain's rather than a constant this file hardcodes, so a Preset that drops an Effect simply has
 * one section fewer (ADR 0017). Keyed by Link id, not by Effect: a Chain may hold the same Effect
 * twice, and keying by type would collapse the repeats into one row.
 */
export default function ControlPanel({
  chain,
  onLinkChange,
  onReroll,
  onReorder,
  onAdd,
  onRemove,
  onDuplicate,
}: Props) {
  const isFull = chain.length >= MAX_CHAIN_LENGTH
  // Which Link the pointer is currently carrying. Held here rather than in the drag event because
  // `dataTransfer` is unreadable during dragover — the moment the drop target has to be decided.
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const moveBy = (index: number, offset: number) => {
    const target = index + offset
    if (target >= 0 && target < chain.length) {
      onReorder(index, target)
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      {chain.map((link, index) => (
        // The row is a *drop target*, which is a pointer-only gesture by nature — keyboard
        // reordering is the handle's arrow keys, a separate and complete path. Giving this div an
        // interactive role to satisfy the rule would announce every Link row to a screen reader as
        // a control it cannot operate.
        // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only drop target, see above
        <div
          key={link.id}
          className="flex flex-col gap-sm"
          onDragOver={(event) => {
            // Without this the drop is never allowed and the row silently refuses every pointer.
            event.preventDefault()
          }}
          onDrop={(event) => {
            event.preventDefault()
            if (draggingIndex !== null) {
              onReorder(draggingIndex, index)
            }
            setDraggingIndex(null)
          }}
        >
          <div className="flex items-center gap-2xs">
            {/* A real button, not a bare drag affordance: pointer reordering is unreachable by
                keyboard, and the arrow keys here are the whole of that alternative (#127). */}
            <button
              type="button"
              draggable
              onDragStart={() => setDraggingIndex(index)}
              onDragEnd={() => setDraggingIndex(null)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveBy(index, -1)
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveBy(index, 1)
                }
              }}
              // Spells the position out: the visual order is the only other cue, and it is exactly
              // what a screen-reader user is trying to change.
              aria-label={`reorder ${EFFECT_LABELS[link.type]}, position ${index + 1} of ${chain.length}`}
              aria-describedby="reorder-hint"
              className={cn(
                'cursor-grab text-dim hover:text-fg focus-visible:text-fg px-2xs -ml-2xs rounded-sm',
                'focus-visible:outline focus-visible:outline-1 focus-visible:outline-electric',
                draggingIndex === index && 'opacity-50 cursor-grabbing',
              )}
            >
              <span aria-hidden="true">⠿</span>
            </button>
            <Label>{EFFECT_LABELS[link.type]}</Label>
            <Tooltip id={`tooltip-${link.id}`} content={EFFECT_TOOLTIPS[link.type]} />
            {/* Pushed to the far end so the row's destructive control is nowhere near the handle a
                user grabs to drag it. */}
            <div className="ml-auto flex items-center gap-3xs">
              <button
                type="button"
                onClick={() => onDuplicate(link.id)}
                disabled={isFull || isIdempotent(link)}
                // Spells out *which* reason it is unavailable for. A disabled control with no
                // explanation reads as a bug, and the two reasons want different answers from the
                // user: the cap asks them to remove a Link, idempotence asks them to add a
                // differently-tuned one instead.
                aria-label={
                  isIdempotent(link)
                    ? `duplicate ${EFFECT_LABELS[link.type]} — unavailable, a second ${EFFECT_LABELS[link.type]} with the same settings changes nothing`
                    : `duplicate ${EFFECT_LABELS[link.type]}`
                }
                className="text-dim hover:text-fg disabled:opacity-40 disabled:hover:text-dim px-2xs rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-electric"
              >
                <span aria-hidden="true">⧉</span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(link.id)}
                aria-label={`remove ${EFFECT_LABELS[link.type]}`}
                className="text-dim hover:text-hot px-2xs rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-electric"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </div>
          <LinkControls link={link} onChange={(params) => onLinkChange(link.id, params)} />
        </div>
      ))}

      {/* Referenced by every handle rather than repeated into each accessible name, which would
          make the instructions the loudest part of a list the user is trying to scan. */}
      <p id="reorder-hint" className="sr-only">
        Press the up and down arrow keys to move this effect earlier or later in the chain.
      </p>

      {/* Built from the registry's own order rather than a second hand-kept list, so a new Effect
          reaches the palette the day it is registered (ADR 0017). */}
      <fieldset className="flex flex-col gap-sm border-none p-0 m-0">
        <legend className="w-full mb-2xs">
          <Label>add effect</Label>
        </legend>
        <div className="flex flex-wrap gap-2xs">
          {EFFECT_ORDER.map((type) => (
            <Chip key={type} selected={false} onClick={() => onAdd(type)} disabled={isFull}>
              + {EFFECT_LABELS[type]}
            </Chip>
          ))}
        </div>
        {/* A live region, not a static hint: the message appears mid-interaction, and a user who
            just hit the limit is the one who most needs to be told why the palette went quiet. */}
        <p role="status" className="text-2xs text-dim">
          {isFull
            ? `chain is full — ${MAX_CHAIN_LENGTH} effects max. remove one to add another.`
            : `${chain.length} of ${MAX_CHAIN_LENGTH} effects`}
        </p>
      </fieldset>

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

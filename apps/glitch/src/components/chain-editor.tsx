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
import type { ChainActions } from '../glitch/editor-state'
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

/** What each Effect is called in the editor — the Link chip's name and its panel heading. */
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
 * the editor can stay a loop over the Chain.
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
          {/* Labelled "grain", not "amount" after the param it edits: the panel headings are
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

// What the panel above the Chain row is showing. The add palette takes the same slot as a Link's
// params rather than opening its own surface: one thing in focus at a time is the Strip's whole
// grammar (ADR 0020), and a palette floating over the row would occlude what it edits.
// `id: null` means "whichever Link is first" — the tab opens on the Chain's head rather than on an
// empty panel, without this component having to re-point the focus every time the Chain changes.
type Focus = { kind: 'link'; id: string | null } | { kind: 'palette' }

interface Props {
  chain: Chain
  actions: ChainActions
  // Re-roll rides its own callback rather than joining the bundle: the Seed is not part of the
  // look, and the actions edit the look. Threading it as a Link patch would put the arrangement
  // inside the Chain by the back door.
  onReroll: () => void
}

/**
 * The Control Strip's EDIT tab: the Chain as a row of Link chips left→right in processing order,
 * with the focused Link's params in the panel above it.
 *
 * The horizontal row is the point — GLITCH's Chain processes in order, so the layout *expresses*
 * ADR 0017 instead of stacking it (ADR 0020). Keyed by Link id, not by Effect: a Chain may hold the
 * same Effect twice, and keying by type would collapse the repeats into one chip.
 */
export default function ChainEditor({ chain, actions, onReroll }: Props) {
  const { onLinkChange, onReorder, onAdd, onRemove, onDuplicate } = actions
  const isFull = chain.length >= MAX_CHAIN_LENGTH
  const [focus, setFocus] = useState<Focus>({ kind: 'link', id: null })
  // Which Link the pointer is currently carrying. Held here rather than in the drag event because
  // `dataTransfer` is unreadable during dragover — the moment the drop target has to be decided.
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  // Falls back to the first Link rather than tracking the selection through every edit: a removed
  // Link, a Preset swap and a Randomize all retire ids the focus may still name, and each one would
  // otherwise need its own reset.
  const focusedLink =
    focus.kind === 'link' ? (chain.find((link) => link.id === focus.id) ?? chain[0]) : undefined

  const moveBy = (index: number, offset: number) => {
    const target = index + offset
    if (target >= 0 && target < chain.length) {
      onReorder(index, target)
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      {/* The panel sits above the row so the canvas is never what gets covered (ADR 0020). */}
      <div className="min-h-[92px]">
        {focusedLink ? (
          <div className="flex flex-col gap-xs">
            <div className="flex items-center gap-2xs">
              <Label>{EFFECT_LABELS[focusedLink.type]}</Label>
              <Tooltip
                id={`tooltip-${focusedLink.id}`}
                content={EFFECT_TOOLTIPS[focusedLink.type]}
              />
              {/* Duplicate and remove act on the focused Link, so they live with its params rather
                  than on every chip — six chips each carrying two icon buttons would bury the
                  Chain the row exists to show. */}
              <div className="ml-auto flex items-center gap-3xs">
                <button
                  type="button"
                  onClick={() => onDuplicate(focusedLink.id)}
                  disabled={isFull || isIdempotent(focusedLink)}
                  // Spells out *which* reason it is unavailable for. A disabled control with no
                  // explanation reads as a bug, and the two reasons want different answers from the
                  // user: the cap asks them to remove a Link, idempotence asks them to add a
                  // differently-tuned one instead.
                  aria-label={
                    isIdempotent(focusedLink)
                      ? `duplicate ${EFFECT_LABELS[focusedLink.type]} — unavailable, a second ${EFFECT_LABELS[focusedLink.type]} with the same settings changes nothing`
                      : `duplicate ${EFFECT_LABELS[focusedLink.type]}`
                  }
                  className="text-dim hover:text-fg disabled:opacity-40 disabled:hover:text-dim px-2xs rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-electric"
                >
                  <span aria-hidden="true">⧉</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(focusedLink.id)}
                  aria-label={`remove ${EFFECT_LABELS[focusedLink.type]}`}
                  className="text-dim hover:text-hot px-2xs rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-electric"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
            </div>
            {/* Adaptive density (ADR 0020): stacked on mobile, one control in focus at a time; at
                sm the grid flows into equal columns so the whole param group reads at once. */}
            <div className="grid gap-sm sm:grid-flow-col sm:auto-cols-fr sm:gap-md sm:items-end">
              <LinkControls
                link={focusedLink}
                onChange={(params) => onLinkChange(focusedLink.id, params)}
              />
            </div>
          </div>
        ) : (
          <fieldset className="flex flex-col gap-xs border-none p-0 m-0">
            <legend className="w-full mb-2xs">
              <Label>add effect</Label>
            </legend>
            {/* The palette reads EFFECT_ORDER (presets.ts) — the canonical order the Presets share
                — rather than the registry's incidental key order. That list is hand-kept: a new
                Effect must be added there to reach the palette, and the compiler won't point at it. */}
            <div className="flex gap-2xs overflow-x-auto">
              {EFFECT_ORDER.map((type) => (
                <Chip
                  key={type}
                  selected={false}
                  onClick={() => onAdd(type)}
                  disabled={isFull}
                  className="shrink-0"
                >
                  + {EFFECT_LABELS[type]}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="flex items-center gap-sm">
        <div className="flex-1 min-w-0 flex gap-2xs overflow-x-auto">
          {chain.map((link, index) => (
            // The chip is both the selection control and the drag handle: in a row, the thing you
            // grab to move a Link is the Link. Its own drop target, too — dropping *onto* a chip is
            // how a horizontal reorder reads.
            <Chip
              key={link.id}
              selected={focusedLink?.id === link.id}
              draggable
              onClick={() => setFocus({ kind: 'link', id: link.id })}
              onDragStart={() => setDraggingIndex(index)}
              onDragEnd={() => setDraggingIndex(null)}
              onDragOver={(event) => {
                // Without this the drop is never allowed and the chip silently refuses every pointer.
                event.preventDefault()
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (draggingIndex !== null) {
                  onReorder(draggingIndex, index)
                }
                setDraggingIndex(null)
              }}
              onKeyDown={(event) => {
                // Pointer reordering is unreachable by keyboard, and these arrows are the whole of
                // that alternative (#127). Left/right rather than up/down: the Chain reads across.
                if (event.key === 'ArrowLeft') {
                  event.preventDefault()
                  moveBy(index, -1)
                }
                if (event.key === 'ArrowRight') {
                  event.preventDefault()
                  moveBy(index, 1)
                }
              }}
              // Spells the position out: the visual order is the only other cue, and it is exactly
              // what a screen-reader user is trying to change.
              aria-label={`${EFFECT_LABELS[link.type]}, position ${index + 1} of ${chain.length}`}
              aria-describedby="reorder-hint"
              className={cn('shrink-0 cursor-grab', draggingIndex === index && 'opacity-50')}
            >
              {EFFECT_LABELS[link.type]}
            </Chip>
          ))}
          <Chip
            selected={focus.kind === 'palette'}
            onClick={() => setFocus({ kind: 'palette' })}
            aria-label="add effect"
            className="shrink-0"
          >
            +
          </Chip>
        </div>
        {/* The Seed sits outside the Chain, so its control sits outside the Link row rather than
            becoming a seventh chip that looks like part of the look. */}
        <Button variant="ghost" onClick={onReroll} aria-label="re-roll" className="shrink-0">
          ⟳ re-roll
        </Button>
      </div>

      {/* Referenced by every chip rather than repeated into each accessible name, which would make
          the instructions the loudest part of a row the user is trying to scan. */}
      <p id="reorder-hint" className="sr-only">
        Press the left and right arrow keys to move this effect earlier or later in the chain.
      </p>

      {/* A live region, not a static hint: the message appears mid-interaction, and a user who just
          hit the limit is the one who most needs to be told why the palette went quiet. */}
      <p role="status" className="text-2xs text-dim">
        {isFull
          ? `chain is full — ${MAX_CHAIN_LENGTH} effects max. remove one to add another.`
          : `${chain.length} of ${MAX_CHAIN_LENGTH} effects`}
      </p>
    </div>
  )
}

import { Chip, ICON_GLYPH_SIZE, Label, Slider, ToggleGroup, Tooltip } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'
import { useRef, useState } from 'react'
import {
  type Chain,
  EFFECT_REGISTRY,
  type EffectType,
  type Link,
  MAX_CHAIN_LENGTH,
} from '../glitch/chain'
import { type ChainActions, formatSeed, type SeedControls } from '../glitch/editor-state'
import { EFFECT_ORDER } from '../glitch/presets'
import {
  CHANNEL_NAMES,
  CHANNEL_SHIFT_AMOUNT_RANGE,
  type ChannelName,
  DEFAULT_BLOCK_DISPLACEMENT,
  DEFAULT_CHANNEL_SHIFT,
  DEFAULT_CHROMATIC_ABERRATION,
  DEFAULT_HALFTONE,
  DEFAULT_NOISE,
  DEFAULT_PIXEL_SORT,
  DEFAULT_SCANLINES,
  DEFAULT_WAVE,
  HALFTONE_CELL_SIZE_RANGE,
  HALFTONE_TINTS,
  NOISE_TINTS,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  SCANLINES_DENSITY_STEP,
  SORT_DIRECTIONS,
  type SortDirection,
  WAVE_AXES,
  WAVE_WAVELENGTH_RANGE,
  type WaveAxis,
} from '../glitch/types'
import { type ChipBounds, dropTargetAt, isDragGesture } from './chain-drag'
import IconLabelButton from './icon-label-button'

/**
 * The params panel's reserved height. On mobile the params stack (the sm grid flows into columns
 * only at ≥640px), so each Effect's stacked height differs — 1 to 3 controls. Reserve the tallest
 * (pixel sort, wave and halftone: a toggle + two sliders) so switching Effects doesn't reflow. At
 * sm every Effect is one row, so the floor drops back to the single-row height. A full class
 * string, not an interpolated `min-h-[${n}px]` — Tailwind only emits arbitrary values it can see
 * literally.
 */
const PANEL_MIN_HEIGHT = 'min-h-[240px] sm:min-h-[92px]'

/**
 * Every slider here spans the unit interval; the params with no natural 0..1 bound
 * (`CHANNEL_SHIFT_AMOUNT_RANGE`, `PIXEL_SORT_RUN_LENGTH_RANGE`, `HALFTONE_CELL_SIZE_RANGE`,
 * `WAVE_WAVELENGTH_RANGE`) get their ranges from the core.
 */
const UNIT_RANGE = { min: 0, max: 1 } as const

// The option tuples come from the core beside the params they belong to (types.ts), so this panel
// and the Chain JSON codec can never offer different sets of the same choice.
const CHANNEL_LABELS: Record<ChannelName, string> = { r: 'red', g: 'green', b: 'blue' }

const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  horizontal: 'horiz',
  vertical: 'vert',
}

// Its own list and its own labels, for the reason HALFTONE_TINTS has its own: Pixel Sort's axis is
// the line it walks and Wave's is the way the pixels travel, so sharing one would tie two unrelated
// choices together.
const WAVE_AXIS_LABELS: Record<WaveAxis, string> = {
  horizontal: 'horiz',
  vertical: 'vert',
}

/** What each Effect is called in the editor — the Link chip's name and its panel heading. */
export const EFFECT_LABELS: Record<EffectType, string> = {
  blockDisplacement: 'block displacement',
  pixelSort: 'pixel sort',
  wave: 'wave',
  channelShift: 'channel shift',
  chromaticAberration: 'chromatic aberration',
  halftone: 'halftone',
  scanlines: 'scanlines',
  noise: 'noise',
}

const EFFECT_TOOLTIPS: Record<EffectType, string> = {
  blockDisplacement: 'tears rectangular blocks sideways — data corruption',
  pixelSort: 'sorts bright runs of pixels — the melted smear',
  wave: 'bends whole rows or columns along a sine — the signal warping',
  channelShift: 'offsets one r/g/b channel by a constant — rgb split',
  chromaticAberration: 'splits r/b outward from the centre — lens fringe',
  halftone: 'redraws the image as a grid of dots sized by brightness — print screen',
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
 * different param shape — this is the one place that has to know every Effect, which is why the rest
 * of the editor can stay a loop over the Chain.
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
            min={UNIT_RANGE.min}
            max={UNIT_RANGE.max}
            step={0.01}
            defaultValue={DEFAULT_BLOCK_DISPLACEMENT.density}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(density) => onChange({ ...params, density })}
          />
          <Slider
            label="displace"
            value={params.amount}
            min={UNIT_RANGE.min}
            max={UNIT_RANGE.max}
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
            min={UNIT_RANGE.min}
            max={UNIT_RANGE.max}
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
    case 'wave': {
      const params = link.params
      return (
        <>
          <ToggleGroup
            ariaLabel="wave axis"
            options={WAVE_AXES}
            value={params.axis}
            labels={WAVE_AXIS_LABELS}
            fullWidth
            onChange={(axis) => onChange({ ...params, axis })}
          />
          <Slider
            label="amplitude"
            value={params.amplitude}
            min={UNIT_RANGE.min}
            max={UNIT_RANGE.max}
            step={0.01}
            defaultValue={DEFAULT_WAVE.amplitude}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(amplitude) => onChange({ ...params, amplitude })}
          />
          <Slider
            label="wavelength"
            value={params.wavelength}
            min={WAVE_WAVELENGTH_RANGE.min}
            max={WAVE_WAVELENGTH_RANGE.max}
            step={1}
            defaultValue={DEFAULT_WAVE.wavelength}
            format={(v) => `${v}px`}
            onChange={(wavelength) => onChange({ ...params, wavelength })}
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
            options={CHANNEL_NAMES}
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
          min={UNIT_RANGE.min}
          max={UNIT_RANGE.max}
          step={0.01}
          defaultValue={DEFAULT_CHROMATIC_ABERRATION.strength}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(strength) => onChange({ strength })}
        />
      )
    }
    case 'halftone': {
      const params = link.params
      return (
        <>
          <ToggleGroup
            ariaLabel="halftone tint"
            options={HALFTONE_TINTS}
            value={params.tint}
            fullWidth
            onChange={(tint) => onChange({ ...params, tint })}
          />
          {/* "cell" and "dot", not the param names: two sliders reading "size" would reach a
              screen reader as the same control twice. */}
          <Slider
            label="cell"
            value={params.cellSize}
            min={HALFTONE_CELL_SIZE_RANGE.min}
            max={HALFTONE_CELL_SIZE_RANGE.max}
            step={1}
            defaultValue={DEFAULT_HALFTONE.cellSize}
            format={(v) => `${v}px`}
            onChange={(cellSize) => onChange({ ...params, cellSize })}
          />
          <Slider
            label="dot"
            value={params.dotScale}
            min={UNIT_RANGE.min}
            max={UNIT_RANGE.max}
            step={0.01}
            defaultValue={DEFAULT_HALFTONE.dotScale}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(dotScale) => onChange({ ...params, dotScale })}
          />
        </>
      )
    }
    case 'scanlines': {
      const params = link.params
      return (
        <>
          <Slider
            label="density"
            value={params.density}
            min={UNIT_RANGE.min}
            max={UNIT_RANGE.max}
            step={SCANLINES_DENSITY_STEP}
            defaultValue={DEFAULT_SCANLINES.density}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(density) => onChange({ ...params, density })}
          />
          <Slider
            label="intensity"
            value={params.intensity}
            min={UNIT_RANGE.min}
            max={UNIT_RANGE.max}
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
            min={UNIT_RANGE.min}
            max={UNIT_RANGE.max}
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

/**
 * What the panel above the Chain row is showing. The add palette takes the same slot as a Link's
 * params rather than opening its own surface: one thing in focus at a time is the Strip's whole
 * grammar (ADR 0020), and a palette floating over the row would occlude what it edits.
 *
 * `id: null` means "whichever Link is first" — the tab opens on the Chain's head rather than on an
 * empty panel, without this component having to re-point the focus every time the Chain changes.
 */
type Focus = { kind: 'link'; id: string | null } | { kind: 'palette' }

interface Props {
  chain: Chain
  actions: ChainActions
  // Its own bundle rather than joining `actions`: those six edit the look, these two move the
  // arrangement (editor-state.ts). Threading Re-roll as a Link patch would put the arrangement
  // inside the Chain by the back door, and animate is Re-roll once a frame, so it belongs here.
  seedControls: SeedControls
  // A Source Image has no elapsing time for the arrangement to advance through, so animate is
  // absent rather than disabled there — the same gate Record uses (output-panel.tsx).
  isLive: boolean
}

/**
 * The Control Strip's EDIT tab: the Chain as a row of Link chips left→right in processing order,
 * with the focused Link's params in the panel above it.
 *
 * The horizontal row is the point — GLITCH's Chain processes in order, so the layout *expresses*
 * ADR 0017 instead of stacking it (ADR 0020). Keyed by Link id, not by Effect: a Chain may hold the
 * same Effect twice, and keying by type would collapse the repeats into one chip.
 */
export default function ChainEditor({ chain, actions, seedControls, isLive }: Props) {
  const { onLinkChange, onReorder, onAdd, onRemove, onDuplicate, onToggleBypass } = actions
  const { isAnimated, onReroll, onToggleAnimation, seed, previous, onStepBack } = seedControls
  const isFull = chain.length >= MAX_CHAIN_LENGTH
  const [focus, setFocus] = useState<Focus>({ kind: 'link', id: null })
  // Which Link the pointer is carrying, once the press has cleared the tap threshold.
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  // The press in flight, before it is known to be a drag. A ref, not state: it changes on every
  // pointermove and nothing renders from it.
  const press = useRef<{ index: number; x: number; y: number; dragging: boolean } | null>(null)
  // The row, so the chips can be measured on demand. Read through `data-chip-index` rather than a
  // ref per chip: the kit's Chip is a plain function component on React 18, so it forwards no ref,
  // and a data attribute spreads through it like any other prop.
  const rowRef = useRef<HTMLDivElement>(null)

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

  const chipBounds = (): ChipBounds[] =>
    [...(rowRef.current?.querySelectorAll<HTMLElement>('[data-chip-index]') ?? [])].map((el) => {
      const rect = el.getBoundingClientRect()
      return { index: Number(el.dataset.chipIndex), left: rect.left, right: rect.right }
    })

  const endPress = () => {
    press.current = null
    setDraggingIndex(null)
  }

  return (
    <div className="flex flex-col gap-sm">
      {/* The panel sits above the row so the canvas is never what gets covered (ADR 0020). */}
      <div className={PANEL_MIN_HEIGHT}>
        {focusedLink ? (
          <div className="flex flex-col gap-xs">
            <div className="flex items-center gap-2xs">
              <Label>{EFFECT_LABELS[focusedLink.type]}</Label>
              <Tooltip
                id={`tooltip-${focusedLink.id}`}
                content={EFFECT_TOOLTIPS[focusedLink.type]}
              />
              {/* Bypass, duplicate and remove act on the focused Link, so they live with its
                  params rather than on every chip — six chips each carrying three icon buttons
                  would bury the Chain the row exists to show. */}
              <div className="ml-auto flex items-center gap-2xs">
                {/* First of the three, and beside the destructive one on purpose: it is the
                    non-destructive answer to the question remove used to be the only way to ask. */}
                <button
                  type="button"
                  onClick={() => onToggleBypass(focusedLink.id)}
                  // A toggle with a fixed name and a pressed state, the way animate is: a label
                  // that flipped to "un-bypass" would change the control's name under a screen
                  // reader every time it was used, when what changed is whether it is engaged.
                  aria-pressed={focusedLink.bypassed}
                  aria-label={`bypass ${EFFECT_LABELS[focusedLink.type]}`}
                  className={cn(
                    'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-warning',
                    focusedLink.bypassed ? 'text-accent' : 'text-fg-muted hover:text-fg',
                    ICON_GLYPH_SIZE,
                  )}
                >
                  <span aria-hidden="true">⊘</span>
                </button>
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
                  className={cn(
                    'inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-warning',
                    ICON_GLYPH_SIZE,
                  )}
                >
                  <span aria-hidden="true">⧉</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(focusedLink.id)}
                  aria-label={`remove ${EFFECT_LABELS[focusedLink.type]}`}
                  className={cn(
                    'inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-fg-muted hover:text-danger rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-warning',
                    ICON_GLYPH_SIZE,
                  )}
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
                — rather than the registry's incidental key order. That list derives from a Record
                over EffectType, so a newly registered Effect can't reach the editor missing: it
                fails to compile there first. It wraps rather than scrolls: it's a set of options,
                not the ordered Chain, so showing every Effect at once beats hiding half behind a
                horizontal scroll. */}
            <div className="flex flex-wrap gap-2xs">
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
        <div ref={rowRef} className="flex-1 min-w-0 flex gap-2xs overflow-x-auto">
          {chain.map((link, index) => (
            // The chip is both the selection control and the drag handle: in a row, the thing you
            // grab to move a Link is the Link. Pointer Events rather than HTML5 drag-and-drop —
            // that never fires on touch, which left reorder desktop-only against #187's parity
            // requirement. One path now covers mouse, pen and finger.
            <Chip
              key={link.id}
              data-chip-index={index}
              selected={focusedLink?.id === link.id}
              onClick={() => setFocus({ kind: 'link', id: link.id })}
              onPointerDown={(event) => {
                press.current = {
                  index,
                  x: event.clientX,
                  y: event.clientY,
                  dragging: false,
                }
                // Keeps the moves coming to this chip even once the pointer has left it, which is
                // the whole of the gesture — without capture, a finger crossing to a neighbour
                // stops reporting and the drag dies mid-row.
                event.currentTarget.setPointerCapture?.(event.pointerId)
              }}
              onPointerMove={(event) => {
                const started = press.current
                if (!started) {
                  return
                }
                if (
                  !started.dragging &&
                  isDragGesture(event.clientX - started.x, event.clientY - started.y)
                ) {
                  started.dragging = true
                  setDraggingIndex(started.index)
                }
                if (!started.dragging) {
                  return
                }
                const target = dropTargetAt(event.clientX, chipBounds())
                if (target !== null && target !== started.index) {
                  onReorder(started.index, target)
                  // The dragged Link is at the target now, so the next move measures from there.
                  started.index = target
                  setDraggingIndex(target)
                }
              }}
              onPointerUp={endPress}
              onPointerCancel={endPress}
              onClickCapture={(event) => {
                // A drag ends with a click on mobile and desktop alike; letting it through would
                // move the focus to whichever Link the finger happened to land on.
                if (draggingIndex !== null) {
                  event.stopPropagation()
                  event.preventDefault()
                }
              }}
              onKeyDown={(event) => {
                // The keyboard path (#127): pointer reordering is unreachable without one, and
                // left/right rather than up/down because the Chain reads across.
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
              //
              // Bypass lands in the same sentence rather than beside it as a symbol — the dashed
              // border and the ⊘ are cues a screen reader never gets — and *before* the position,
              // where it sits next to the Effect it qualifies and leaves the position at the end,
              // which is where a user scanning the row expects to hear it.
              aria-label={`${EFFECT_LABELS[link.type]}${link.bypassed ? ', bypassed' : ''}, position ${index + 1} of ${chain.length}`}
              aria-describedby="reorder-hint"
              // `touch-none` only while dragging: the row scrolls horizontally, and killing
              // touch-action outright would leave a finger unable to scroll past the chips it
              // starts on.
              // A dashed border for a bypassed Link, and nothing dimmed or struck through: a
              // half-faded chip is what the drag ghost already means here, and both of those read
              // as "on its way out" when the point is that the Link is still in the Chain holding
              // its slot. Dashes read as a break in the signal, which is what a bypass is. The
              // colour is left alone in both states, so a bypassed chip stays distinguishable from
              // a focused one (accent) and from an unfocused one (solid) without spending contrast.
              className={cn(
                'shrink-0 cursor-grab',
                link.bypassed && 'border-dashed',
                draggingIndex !== null && 'touch-none',
                draggingIndex === index && 'opacity-50',
              )}
            >
              {/* The visible half of what the accessible name spells out — a screen reader gets the
                  word, everyone else gets the mark, and neither is carrying it alone. */}
              {link.bypassed && <span aria-hidden="true">⊘</span>}
              {EFFECT_LABELS[link.type]}
            </Chip>
          ))}
          {/* On mobile it matches the Re-roll icon's 60px footprint so the two read as a pair; from
              sm up it shrinks back to a chip as Re-roll regains its label. */}
          <Chip
            selected={focus.kind === 'palette'}
            onClick={() => setFocus({ kind: 'palette' })}
            aria-label="add effect"
            className={cn(
              'shrink-0 w-[60px] justify-center sm:w-auto sm:justify-start',
              ICON_GLYPH_SIZE,
            )}
          >
            +
          </Chip>
        </div>
        {/* The Seed sits outside the Chain, so its controls sit outside the Link row rather than
            becoming a seventh chip that looks like part of the look. */}
        <IconLabelButton
          variant="ghost"
          onClick={onReroll}
          glyph="⟳"
          label="re-roll"
          className="shrink-0"
        />
        {/* Immediately after Re-roll, because it is the way back out of one: a good arrangement is
            otherwise unrecoverable the moment the next roll lands. Disabled rather than absent
            before the session's first roll — a control that comes and goes reflows the row every
            time, and the row is the one the user is pressing. */}
        <IconLabelButton
          variant="ghost"
          onClick={onStepBack}
          disabled={previous === null}
          glyph="↶"
          label="step back"
          // The name says which roll, which no visible label has room for — and the hex is never
          // the whole name, because "0x8f2c1a3b" announced alone says nothing about what pressing
          // it does.
          name={
            previous === null
              ? 'step back — no earlier roll yet'
              : `step back to the previous roll, seed ${formatSeed(previous)}`
          }
          className="shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {/* Beside Re-roll because it *is* Re-roll, once a frame — and the pressed state carries
            "still running" rather than the label changing, so the row doesn't reflow every time
            it is switched. */}
        {isLive && (
          <IconLabelButton
            variant={isAnimated ? 'primary' : 'ghost'}
            aria-pressed={isAnimated}
            onClick={onToggleAnimation}
            glyph="≋"
            label="animate"
            className="shrink-0"
          />
        )}
      </div>

      {/* Referenced by every chip rather than repeated into each accessible name, which would make
          the instructions the loudest part of a row the user is trying to scan. */}
      <p id="reorder-hint" className="sr-only">
        Drag this effect, or press the left and right arrow keys, to move it earlier or later in the
        chain.
      </p>

      <div className="flex items-baseline justify-between gap-sm">
        {/* A live region, not a static hint: the message appears mid-interaction, and a user who just
            hit the limit is the one who most needs to be told why the palette went quiet. */}
        <p role="status" className="text-2xs text-fg-muted">
          {isFull
            ? `chain is full — ${MAX_CHAIN_LENGTH} effects max. remove one to add another.`
            : `${chain.length} of ${MAX_CHAIN_LENGTH} effects`}
        </p>
        {/* The arrangement, written down. It reads here rather than over the canvas on purpose: a
            badge on the artwork would have to stand on an opaque box to hold its contrast, and that
            box lands on the user's result (ADR 0013). Not a live region — it changes on every frame
            of an animated Seed, and announcing that would talk over the user for as long as it
            runs. */}
        <span className="shrink-0 text-fg-muted">seed {formatSeed(seed)}</span>
      </div>
    </div>
  )
}

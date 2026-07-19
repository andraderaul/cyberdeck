import { Chip, Label, Slider, Tooltip } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'
import { useState } from 'react'
import { getModePalette } from '../ascii/renderer'
import type { Charset, ColorMode, ConversionSettings } from '../ascii/types'
import { CHARSET_MAPS, COLOR_MODES } from '../ascii/types'

const RESOLUTION_RANGE = { min: 6, max: 24, step: 1 }
const BRIGHTNESS_RANGE = { min: 0.5, max: 2.0, step: 0.05 }
const CONTRAST_RANGE = { min: 0.5, max: 3.0, step: 0.05 }

const CHARSET_CATEGORIES: { label: string; charsets: Charset[] }[] = [
  { label: 'ascii gradient', charsets: ['classic', 'sharp', 'detailed', 'ascii'] },
  { label: 'unicode blocks', charsets: ['blocks', 'halfblock'] },
  { label: 'writing systems', charsets: ['braille', 'katakana'] },
  { label: 'shapes', charsets: ['geometric', 'circles'] },
  { label: 'specialized', charsets: ['box', 'binary'] },
]

/** Spans the full luminosity ramp: indices 0, ¼, ½, ¾, last. */
function sampleChars(charset: Charset): string {
  const chars = [...CHARSET_MAPS[charset]]
  if (chars.length <= 5) {
    return chars.join('')
  }
  const last = chars.length - 1
  const step = last / 4
  return Array.from({ length: 5 }, (_, i) => chars[Math.round(i * step)]).join('')
}

function swatchStyle(colorMode: ColorMode): string {
  if (colorMode === 'original') {
    return 'linear-gradient(135deg, #ff0000 0%, #00ff00 50%, #0000ff 100%)'
  }
  const palette = getModePalette(colorMode)
  if (typeof palette === 'string') {
    return palette
  }
  return `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 100%)`
}

const SOLID_MODES = COLOR_MODES.filter((m) => !Array.isArray(getModePalette(m)))
const GRADIENT_MODES = COLOR_MODES.filter((m) => Array.isArray(getModePalette(m)))

/**
 * The tools, in the order the EDIT row shows them. GLITCH's row is the Chain itself, which
 * processes left→right; ConversionSettings has no such order, so this one is grouped by what it
 * changes — what the characters *are*, then how they're coloured, then how densely they're sampled.
 */
const TOOLS = [
  { id: 'charset', label: 'charset' },
  { id: 'colorMode', label: 'color mode' },
  { id: 'resolution', label: 'resolution' },
  { id: 'brightness', label: 'brightness' },
  { id: 'contrast', label: 'contrast' },
] as const

type ToolId = (typeof TOOLS)[number]['id']

/**
 * The three sliders are siblings: at `sm` the panel shows the whole group side by side rather than
 * only the focused one (adaptive density, ADR 0020). Charset and Color Mode are groups of one —
 * their own chip grids already fill the panel.
 */
const SLIDER_GROUP: readonly ToolId[] = ['resolution', 'brightness', 'contrast']

interface Props {
  settings: ConversionSettings
  onChange: (patch: Partial<ConversionSettings>) => void
}

/**
 * The Control Strip's EDIT tab: every ConversionSettings control as a row of tool chips, with the
 * focused tool's control in the panel above the row.
 *
 * The anatomy is GLITCH's ChainEditor ported (ADR 0020's rollout order), with one honest divergence:
 * there a chip is a Link the user can add, reorder and remove, so the row is editable. Here the
 * tools are fixed — ConversionSettings is a record, not a list — so the row only ever selects.
 */
export default function SettingsEditor({ settings, onChange }: Props) {
  const [focus, setFocus] = useState<ToolId>('charset')

  // A slider outside the focused group is hidden rather than unmounted, which is what lets one
  // markup tree serve both densities: `hidden` takes it out of the accessibility tree too, so a
  // mobile user reaches exactly the one control in focus. `data-tool` is what the tests read —
  // the wrapper carries the density, and querying it through the Slider's internals would pin
  // that primitive's markup here.
  const sliderVisibility = (id: ToolId) =>
    cn(SLIDER_GROUP.includes(focus) ? 'hidden sm:block' : 'hidden', focus === id && 'block')

  return (
    <div className="flex flex-col gap-sm">
      {/* The panel sits above the row so the canvas is never what gets covered (ADR 0020). */}
      <div className="min-h-[92px]">
        {focus === 'charset' && (
          <fieldset
            className="flex flex-col gap-xs border-none p-0 m-0"
            aria-describedby="tooltip-charset"
          >
            <legend className="w-full mb-2xs flex items-center gap-2xs">
              <Label>charset</Label>
              <Tooltip
                id="tooltip-charset"
                content="symbol set mapping luminosity to a character"
              />
            </legend>
            <div className="flex gap-md overflow-x-auto">
              {CHARSET_CATEGORIES.map(({ label, charsets }) => (
                <fieldset
                  key={label}
                  className="flex flex-col gap-2xs border-none p-0 m-0 shrink-0"
                >
                  <legend className="text-fg-subtle font-mono text-xs uppercase tracking-wide mb-2xs">
                    {label}
                  </legend>
                  <div className="flex gap-2xs">
                    {charsets.map((cs) => (
                      <Chip
                        key={cs}
                        selected={settings.charset === cs}
                        aria-label={cs}
                        onClick={() => onChange({ charset: cs })}
                        className="shrink-0 flex-col items-start text-left"
                      >
                        <span>{cs}</span>
                        <span className="text-fg-subtle text-xs tracking-widest">
                          {sampleChars(cs)}
                        </span>
                      </Chip>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </fieldset>
        )}

        {focus === 'colorMode' && (
          <fieldset
            className="flex flex-col gap-xs border-none p-0 m-0"
            aria-describedby="tooltip-color-mode"
          >
            <legend className="w-full mb-2xs flex items-center gap-2xs">
              <Label>color mode</Label>
              <Tooltip
                id="tooltip-color-mode"
                content="colorization scheme applied to rendered chars"
              />
            </legend>
            {/* Solid and gradient modes stay two rows, as in the old panel: the split is the one
                cue for what a mode does before you pick it. */}
            <div className="flex flex-col gap-2xs">
              {[SOLID_MODES, GRADIENT_MODES].map((modes, index) => (
                <div
                  key={index === 0 ? 'solid' : 'gradient'}
                  className="flex gap-2xs overflow-x-auto"
                >
                  {modes.map((mode) => (
                    <Chip
                      key={mode}
                      selected={settings.colorMode === mode}
                      aria-label={mode}
                      onClick={() => onChange({ colorMode: mode })}
                      className="shrink-0"
                    >
                      <span
                        data-swatch
                        className="inline-block w-3 h-3 rounded-full shrink-0"
                        style={{ background: swatchStyle(mode) }}
                      />
                      {mode}
                    </Chip>
                  ))}
                </div>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-sm sm:grid-flow-col sm:auto-cols-fr sm:gap-md sm:items-end">
          <div data-tool="resolution" className={sliderVisibility('resolution')}>
            <Slider
              label="resolution"
              value={settings.resolution}
              min={RESOLUTION_RANGE.min}
              max={RESOLUTION_RANGE.max}
              step={RESOLUTION_RANGE.step}
              onChange={(resolution) => onChange({ resolution })}
              format={(v) => `${v}px`}
              defaultValue={12}
              tooltip={
                <Tooltip
                  id="tooltip-resolution"
                  content="chars per canvas — smaller value = more detail"
                />
              }
              tooltipId="tooltip-resolution"
            />
          </div>
          <div data-tool="brightness" className={sliderVisibility('brightness')}>
            <Slider
              label="brightness"
              value={settings.brightness}
              min={BRIGHTNESS_RANGE.min}
              max={BRIGHTNESS_RANGE.max}
              step={BRIGHTNESS_RANGE.step}
              onChange={(brightness) => onChange({ brightness })}
              defaultValue={1.0}
              tooltip={
                <Tooltip
                  id="tooltip-brightness"
                  content="amplifies pixel brightness before conversion"
                />
              }
              tooltipId="tooltip-brightness"
            />
          </div>
          <div data-tool="contrast" className={sliderVisibility('contrast')}>
            <Slider
              label="contrast"
              value={settings.contrast}
              min={CONTRAST_RANGE.min}
              max={CONTRAST_RANGE.max}
              step={CONTRAST_RANGE.step}
              onChange={(contrast) => onChange({ contrast })}
              defaultValue={1.0}
              tooltip={
                <Tooltip
                  id="tooltip-contrast"
                  content="sharpens the dark-to-light range before conversion"
                />
              }
              tooltipId="tooltip-contrast"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2xs overflow-x-auto">
        {TOOLS.map((tool) => (
          <Chip
            key={tool.id}
            selected={focus === tool.id}
            onClick={() => setFocus(tool.id)}
            className="shrink-0"
          >
            {tool.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

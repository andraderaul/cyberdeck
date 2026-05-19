import { getModePalette } from '../ascii/renderer'
import type { Charset, ColorMode, ConversionSettings } from '../ascii/types'
import { CHARSET_MAPS, COLOR_MODES } from '../ascii/types'
import { cn } from '../utils/cn'
import Label from './ui/label'
import Slider from './ui/slider'

interface Props {
  settings: ConversionSettings
  onChange: (patch: Partial<ConversionSettings>) => void
}

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

// Spans the full luminosity ramp: indices 0, ¼, ½, ¾, last
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

// Color modes ordered: solids + original → gradient pairs
const SOLID_MODES = COLOR_MODES.filter((m) => !Array.isArray(getModePalette(m)))
const GRADIENT_MODES = COLOR_MODES.filter((m) => Array.isArray(getModePalette(m)))

export default function ControlPanel({ settings, onChange }: Props) {
  return (
    <div className="flex flex-col gap-md">
      <Slider
        label="resolution"
        value={settings.resolution}
        min={RESOLUTION_RANGE.min}
        max={RESOLUTION_RANGE.max}
        step={RESOLUTION_RANGE.step}
        onChange={(resolution) => onChange({ resolution })}
        format={(v) => `${v}px`}
        defaultValue={12}
      />

      {/* Color Mode picker with swatches — solid and gradient groups */}
      <div className="flex flex-col gap-2xs">
        <Label>color mode</Label>
        <div className="flex flex-col gap-xs">
          <div className="flex flex-wrap gap-2xs">
            {SOLID_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-label={mode}
                onClick={() => onChange({ colorMode: mode })}
                className={cn(
                  'flex items-center gap-2xs px-sm py-2xs rounded-xs border font-mono text-xs transition-colors',
                  settings.colorMode === mode
                    ? 'border-violet text-violet'
                    : 'border-base text-fg-muted hover:border-dim',
                )}
              >
                <span
                  data-swatch
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ background: swatchStyle(mode) }}
                />
                {mode}
              </button>
            ))}
          </div>
          <div className="w-full h-px bg-slate" />
          <div className="flex flex-wrap gap-2xs">
            {GRADIENT_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-label={mode}
                onClick={() => onChange({ colorMode: mode })}
                className={cn(
                  'flex items-center gap-2xs px-sm py-2xs rounded-xs border font-mono text-xs transition-colors',
                  settings.colorMode === mode
                    ? 'border-violet text-violet'
                    : 'border-base text-fg-muted hover:border-dim',
                )}
              >
                <span
                  data-swatch
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ background: swatchStyle(mode) }}
                />
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grouped Charset picker — role="group" + aria-labelledby for screen readers */}
      <div className="flex flex-col gap-xs">
        <Label>charset</Label>
        {CHARSET_CATEGORIES.map(({ label, charsets }) => (
          <fieldset key={label} className="flex flex-col gap-2xs border-none p-0 m-0">
            <legend className="text-fg-subtle font-mono text-xs uppercase tracking-wide mb-2xs">
              {label}
            </legend>
            <div className="flex flex-wrap gap-2xs">
              {charsets.map((cs) => (
                <button
                  key={cs}
                  type="button"
                  aria-label={cs}
                  onClick={() => onChange({ charset: cs })}
                  className={cn(
                    'flex flex-col px-sm py-2xs rounded-xs border font-mono text-xs transition-colors text-left',
                    settings.charset === cs
                      ? 'border-violet text-violet'
                      : 'border-base text-fg-muted hover:border-dim',
                  )}
                >
                  <span>{cs}</span>
                  <span className="text-fg-subtle text-xs tracking-widest">{sampleChars(cs)}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <Slider
        label="brightness"
        value={settings.brightness}
        min={BRIGHTNESS_RANGE.min}
        max={BRIGHTNESS_RANGE.max}
        step={BRIGHTNESS_RANGE.step}
        onChange={(brightness) => onChange({ brightness })}
        defaultValue={1.0}
      />

      <Slider
        label="contrast"
        value={settings.contrast}
        min={CONTRAST_RANGE.min}
        max={CONTRAST_RANGE.max}
        step={CONTRAST_RANGE.step}
        onChange={(contrast) => onChange({ contrast })}
        defaultValue={1.0}
      />
    </div>
  )
}

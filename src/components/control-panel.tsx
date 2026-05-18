import type { Charset, ColorMode, ConversionSettings } from '../ascii/types'
import { COLOR_MODES } from '../ascii/types'
import Label from './ui/label'
import Slider from './ui/slider'
import ToggleGroup from './ui/toggle-group'

interface Props {
  settings: ConversionSettings
  onChange: (patch: Partial<ConversionSettings>) => void
}

const RESOLUTION_RANGE = { min: 6, max: 24, step: 1 }
const BRIGHTNESS_RANGE = { min: 0.5, max: 2.0, step: 0.05 }
const CONTRAST_RANGE = { min: 0.5, max: 3.0, step: 0.05 }

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
      />

      <div className="flex flex-col gap-2xs">
        <Label>color mode</Label>
        <ToggleGroup<ColorMode>
          ariaLabel="Color mode"
          options={COLOR_MODES}
          value={settings.colorMode}
          onChange={(colorMode) => onChange({ colorMode })}
        />
      </div>

      <div className="flex flex-col gap-2xs">
        <Label>charset</Label>
        <ToggleGroup<Charset>
          ariaLabel="Charset"
          options={[
            'classic',
            'sharp',
            'detailed',
            'ascii',
            'blocks',
            'halfblock',
            'braille',
            'katakana',
            'geometric',
            'circles',
            'box',
            'binary',
          ]}
          value={settings.charset}
          onChange={(charset) => onChange({ charset })}
        />
      </div>

      <Slider
        label="brightness"
        value={settings.brightness}
        min={BRIGHTNESS_RANGE.min}
        max={BRIGHTNESS_RANGE.max}
        step={BRIGHTNESS_RANGE.step}
        onChange={(brightness) => onChange({ brightness })}
      />

      <Slider
        label="contrast"
        value={settings.contrast}
        min={CONTRAST_RANGE.min}
        max={CONTRAST_RANGE.max}
        step={CONTRAST_RANGE.step}
        onChange={(contrast) => onChange({ contrast })}
      />
    </div>
  )
}

import { Chip } from '@cyberdeck/deck-kit/ui'
import type { Preset } from '../ascii/presets'
import { PRESETS, settingsMatch } from '../ascii/presets'
import type { ConversionSettings } from '../ascii/types'

interface Props {
  settings: ConversionSettings
  // The active Preset is tracked rather than derived from the settings: a slider edit has to leave
  // the user standing on the Preset they started from, marked modified, and a look alone can't say
  // which Preset it was edited away from.
  activePresetId: string | null
  onSelect: (preset: Preset) => void
}

export default function PresetPicker({ settings, activePresetId, onSelect }: Props) {
  // `min-w-0` on the fieldset: its default min-width is min-content, which would stop the chips
  // scrolling and spill them past the Strip's right edge instead.
  return (
    <fieldset className="flex items-center gap-sm border-none p-0 m-0 min-w-0">
      {/* The Strip's PRESETS tab already names this group on screen (ADR 0020) — the legend stays
          for the accessible name rather than repeating the word underneath it. */}
      <legend className="sr-only">presets</legend>
      <div className="flex-1 min-w-0 flex gap-2xs overflow-x-auto">
        {PRESETS.map((preset) => {
          const isActive = preset.id === activePresetId
          const isModified = isActive && !settingsMatch(settings, preset.settings)
          return (
            <Chip
              key={preset.id}
              selected={isActive}
              onClick={() => onSelect(preset)}
              className="shrink-0"
              // The asterisk carries "modified" visually, but it reaches a screen reader as one
              // character of punctuation — so the accessible name spells the state out instead.
              aria-label={isModified ? `${preset.name} (modified)` : preset.name}
            >
              {preset.name}
              {isModified && (
                <span aria-hidden="true" className="text-electric">
                  *
                </span>
              )}
            </Chip>
          )
        })}
      </div>
    </fieldset>
  )
}

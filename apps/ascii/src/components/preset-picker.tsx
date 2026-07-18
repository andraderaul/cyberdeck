import { Chip, Label } from '@cyberdeck/deck-kit/ui'
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
  return (
    <fieldset className="flex flex-col gap-2xs border-none p-0 m-0">
      <legend className="w-full mb-2xs">
        <Label>presets</Label>
      </legend>
      <div className="flex flex-wrap gap-2xs">
        {PRESETS.map((preset) => {
          const isActive = preset.id === activePresetId
          const isModified = isActive && !settingsMatch(settings, preset.settings)
          return (
            <Chip
              key={preset.id}
              selected={isActive}
              onClick={() => onSelect(preset)}
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

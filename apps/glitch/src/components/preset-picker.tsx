import { Button, Chip, Label } from '@cyberdeck/deck-kit/ui'
import type { Preset } from '../glitch/presets'
import { PRESETS } from '../glitch/presets'

interface Props {
  // Tracked by the Editor rather than derived from the Chain: a slider edit has to leave the user
  // standing on the Preset they started from, and a look alone can't say which Preset it was
  // edited away from.
  activePresetId: string | null
  // Whether the active Preset has been edited away from — derived by the Editor
  // (isPresetModified); this surface only renders the answer.
  isModified: boolean
  onSelect: (preset: Preset) => void
  onRandomize: () => void
}

export default function PresetPicker({ activePresetId, isModified, onSelect, onRandomize }: Props) {
  return (
    <fieldset className="flex flex-col gap-sm border-none p-0 m-0">
      <legend className="w-full mb-2xs">
        <Label>presets</Label>
      </legend>
      <div className="flex flex-wrap gap-2xs">
        {PRESETS.map((preset) => {
          const isActive = preset.id === activePresetId
          const showModified = isActive && isModified
          return (
            <Chip
              key={preset.id}
              selected={isActive}
              onClick={() => onSelect(preset)}
              // The asterisk carries "modified" visually, but it reaches a screen reader as one
              // character of punctuation — so the accessible name spells the state out instead.
              aria-label={showModified ? `${preset.name} (modified)` : preset.name}
            >
              {preset.name}
              {showModified && (
                <span aria-hidden="true" className="text-electric">
                  *
                </span>
              )}
            </Chip>
          )
        })}
      </div>
      <Button variant="secondary" onClick={onRandomize} className="w-full">
        ⚄ randomize
      </Button>
    </fieldset>
  )
}

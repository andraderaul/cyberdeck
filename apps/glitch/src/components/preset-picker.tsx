import { Button, Chip, Label } from '@cyberdeck/deck-kit/ui'
import type { Chain } from '../glitch/chain'
import type { Preset } from '../glitch/presets'
import { chainMatch, PRESETS } from '../glitch/presets'

interface Props {
  chain: Chain
  // The active Preset is tracked rather than derived from the Chain: a slider edit has to leave
  // the user standing on the Preset they started from, marked modified, and a look alone can't say
  // which Preset it was edited away from.
  activePresetId: string | null
  onSelect: (preset: Preset) => void
  onRandomize: () => void
}

export default function PresetPicker({ chain, activePresetId, onSelect, onRandomize }: Props) {
  return (
    <fieldset className="flex flex-col gap-sm border-none p-0 m-0">
      <legend className="w-full mb-2xs">
        <Label>presets</Label>
      </legend>
      <div className="flex flex-wrap gap-2xs">
        {PRESETS.map((preset) => {
          const isActive = preset.id === activePresetId
          const isModified = isActive && !chainMatch(chain, preset.chain)
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
      <Button variant="secondary" onClick={onRandomize} className="w-full">
        ⚄ randomize
      </Button>
    </fieldset>
  )
}

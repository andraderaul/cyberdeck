import { Button, Chip } from '@cyberdeck/deck-kit/ui'
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
  // `min-w-0` on both the fieldset and the scroller: a fieldset's default min-width is min-content,
  // which would let the chips push Randomize off the Strip's right edge instead of scrolling.
  return (
    <fieldset className="flex items-center gap-sm border-none p-0 m-0 min-w-0">
      {/* The Strip's PRESETS tab already names this group on screen (ADR 0020) — the legend stays
          for the accessible name rather than repeating the word underneath it. */}
      <legend className="sr-only">presets</legend>
      {/* The chips scroll horizontally so the Strip keeps one row whatever the width; Randomize sits
          outside that scroller, since it must stay reachable without scrolling past six Presets. */}
      <div className="flex-1 min-w-0 flex gap-2xs overflow-x-auto">
        {PRESETS.map((preset) => {
          const isActive = preset.id === activePresetId
          const showModified = isActive && isModified
          return (
            <Chip
              key={preset.id}
              selected={isActive}
              onClick={() => onSelect(preset)}
              className="shrink-0"
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
      <Button variant="secondary" onClick={onRandomize} className="shrink-0">
        ⚄ randomize
      </Button>
    </fieldset>
  )
}

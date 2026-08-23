import { Button, Chip } from '@cyberdeck/deck-kit/ui'
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
  /**
   * Undoes the last applied Analysis suggestion, absent when there is nothing to undo. It lands in
   * this tab rather than beside the Analyze control because what it restores is a look, and looks
   * are chosen here — and because the OUT tab stays one act wide (issue #308).
   */
  onRevertSuggestion?: () => void
}

export default function PresetPicker({
  settings,
  activePresetId,
  onSelect,
  onRevertSuggestion,
}: Props) {
  // `min-w-0` on the fieldset: its default min-width is min-content, which would stop the chips
  // scrolling and spill them past the Strip's right edge instead.
  return (
    <fieldset className="flex items-center gap-sm border-none p-0 m-0 min-w-0">
      {/* The Strip's PRESETS tab already names this group on screen (ADR 0020) — the legend stays
          for the accessible name rather than repeating the word underneath it. */}
      <legend className="sr-only">presets</legend>
      {/* A Button and not a Chip, alone in a row of them: every Chip announces `aria-pressed`,
          which offers a screen reader a toggle state this one-shot action does not have. GLITCH
          reaches for the same escape in the same place (`IconLabelButton` beside its Chain row).
          Ahead of the scrolling row because the toast that names it lands bottom-right, so the
          right edge is the one place it can be covered on arrival. */}
      {onRevertSuggestion && (
        <Button
          variant="ghost"
          onClick={onRevertSuggestion}
          className="shrink-0"
          // "revert" alone doesn't say what of; the label spells it and still contains the visible
          // word, so a voice-control user can say what they read.
          aria-label="revert suggestion"
        >
          {/* Punctuation the accessible name is better off without — the word carries it. */}
          <span aria-hidden="true">↺</span> revert
        </Button>
      )}
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
                <span aria-hidden="true" className="text-warning">
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

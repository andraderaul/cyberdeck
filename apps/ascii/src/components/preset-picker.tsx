import { Button, Chip } from '@cyberdeck/deck-kit/ui'
import type { Preset } from '../ascii/presets'
import { PRESETS, settingsMatch } from '../ascii/presets'
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from '../ascii/thumbnail'
import type { ConversionSettings } from '../ascii/types'
import { DEFAULT_SETTINGS } from '../ascii/types'
import { usePresetThumbnails } from '../hooks/use-preset-thumbnails'
import { resetPatch } from './settings-editor'

/**
 * Every axis at once — the scope of the global `↺`. Read off `DEFAULT_SETTINGS` rather than listed,
 * because "all of them" is the one scope that needs no curation: a new `ConversionSettings` axis
 * joins it by existing, where the EDIT tab's per-tool scopes are a partition somebody has to keep
 * (`TOOL_KEYS`).
 */
const ALL_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof ConversionSettings)[]

interface Props {
  settings: ConversionSettings
  // The active Preset is tracked rather than derived from the settings: a slider edit has to leave
  // the user standing on the Preset they started from, marked modified, and a look alone can't say
  // which Preset it was edited away from.
  activePresetId: string | null
  /** What the chips depict this look *on* — the Source Image, or the Live Source frozen. */
  source: HTMLImageElement | HTMLVideoElement | null
  onSelect: (preset: Preset) => void
  /**
   * Returns every axis to `DEFAULT_SETTINGS` and leaves whatever Preset was selected. It lives in
   * this tab for the reason below — the default look is the look with no Preset on it, which makes
   * it this row's zeroth chip rather than a control the EDIT tab could own.
   */
  onReset: () => void
  /**
   * Undoes whichever act last replaced the whole look — an applied Analysis suggestion, or the
   * reset above — absent when there is nothing to undo. It lands in this tab rather than beside the
   * Analyze control because what it restores is a look, and looks are chosen here — and because the
   * OUT tab stays one act wide (issue #308).
   */
  onRevert?: () => void
}

export default function PresetPicker({
  settings,
  activePresetId,
  source,
  onSelect,
  onReset,
  onRevert,
}: Props) {
  const thumbnails = usePresetThumbnails(source)

  // The empty patch *is* "already at its default" (issue #393) — the Preset has to be asked about
  // separately because a look can match the defaults while a chip is still selected, and leaving
  // that chip lit is exactly half of what this control undoes.
  const atDefault =
    Object.keys(resetPatch(settings, ALL_KEYS)).length === 0 && activePresetId === null

  // `min-w-0` on the fieldset: its default min-width is min-content, which would stop the chips
  // scrolling and spill them past the Strip's right edge instead.
  return (
    <fieldset className="flex items-center gap-sm border-none p-0 m-0 min-w-0">
      {/* The Strip's PRESETS tab already names this group on screen (ADR 0020) — the legend stays
          for the accessible name rather than repeating the word underneath it. */}
      <legend className="sr-only">presets</legend>
      {/* The global reset, in the tab that owns which *look* you are standing on. ADR 0020 leaves
          the Strip as the only control grammar, and the three tabs answer three different
          questions: PRESETS which look, EDIT which value of one axis, OUT what to do with the
          result. "back to the look this program opens on" is the first question, not the second —
          it clears `activePresetId` as much as it restores the axes, which is a thing no EDIT
          control may do (the tab is per-tool by construction, and its seven `↺` are scoped by
          contract). So this sits as the row's zeroth chip rather than an eighth reset in EDIT or a
          fourth act in OUT.

          Always drawn and disabled while there is nothing to undo, not hidden: pressing it must
          not pull the controls beside it out from under the pointer that just pressed it, which is
          the same reason the EDIT tab's `↺` disables (issue #393). Leftmost so the revert offer it
          raises appears to its right instead of under that pointer. */}
      <Button
        variant="ghost"
        onClick={onReset}
        disabled={atDefault}
        className="shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        // Spells out *why* it is unavailable, as the EDIT tab's `↺` does: a disabled control with
        // no explanation reads as a bug rather than as an answer.
        aria-label={`reset to defaults${atDefault ? ' — unavailable, already at its default' : ''}`}
      >
        <span aria-hidden="true">↺</span> defaults
      </Button>
      {/* A Button and not a Chip, alone in a row of them: every Chip announces `aria-pressed`,
          which offers a screen reader a toggle state this one-shot action does not have. GLITCH
          reaches for the same escape in the same place (`IconLabelButton` beside its Chain row).
          Ahead of the scrolling row because the toast that names it lands bottom-right, so the
          right edge is the one place it can be covered on arrival. */}
      {onRevert && (
        <Button
          variant="ghost"
          onClick={onRevert}
          className="shrink-0"
          // "revert" alone doesn't say what of, and the two acts it undoes are not one word — so
          // the label names what comes *back* instead. It still contains the visible word, so a
          // voice-control user can say what they read.
          aria-label="revert to the previous look"
        >
          {/* Punctuation the accessible name is better off without — the word carries it. */}
          <span aria-hidden="true">↺</span> revert
        </Button>
      )}
      <div className="flex-1 min-w-0 flex gap-2xs overflow-x-auto">
        {PRESETS.map((preset) => {
          const isActive = preset.id === activePresetId
          const isModified = isActive && !settingsMatch(settings, preset.settings)
          const thumbnail = thumbnails[preset.id]
          return (
            <Chip
              key={preset.id}
              selected={isActive}
              onClick={() => onSelect(preset)}
              className="shrink-0 flex-col"
              // The asterisk carries "modified" visually, but it reaches a screen reader as one
              // character of punctuation — so the accessible name spells the state out instead.
              // The thumbnail stays out of the name entirely (`alt=""`): it depicts the Preset
              // rather than saying anything the word does not.
              aria-label={isModified ? `${preset.name} (modified)` : preset.name}
            >
              {thumbnail && (
                // No `image-rendering: pixelated` here, unlike the canvas: this one is drawn *down*
                // from a larger render, and nearest-neighbour would sharpen the aliasing the
                // supersample exists to spend.
                <img
                  src={thumbnail}
                  alt=""
                  width={THUMBNAIL_WIDTH}
                  height={THUMBNAIL_HEIGHT}
                  className="rounded-xs shrink-0"
                />
              )}
              <span className="flex items-center gap-2xs">
                {preset.name}
                {isModified && (
                  <span aria-hidden="true" className="text-warning">
                    *
                  </span>
                )}
              </span>
            </Chip>
          )
        })}
      </div>
    </fieldset>
  )
}

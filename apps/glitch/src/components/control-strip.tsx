import type { Preset } from '../glitch/presets'
import PresetPicker from './preset-picker'

interface Props {
  activePresetId: string | null
  isModified: boolean
  onSelect: (preset: Preset) => void
  onRandomize: () => void
}

/**
 * The Control Strip (ADR 0020): a horizontal, bottom-anchored control surface at both breakpoints,
 * so the canvas is never occluded while a look is being browsed or applied.
 *
 * PRESETS is the only tab in this slice — EDIT and OUT land with the panels behind them, and a tab
 * is never rendered ahead of its panel. That's why the selection is static rather than state: with
 * one tab there is nothing to switch to, and a `useState` here would only be a switch nobody can
 * throw.
 */
export default function ControlStrip({ activePresetId, isModified, onSelect, onRandomize }: Props) {
  return (
    <div className="shrink-0 border-t border-base bg-bg">
      <div role="tablist" aria-label="controls" className="flex px-sm">
        <button
          type="button"
          role="tab"
          id="strip-tab-presets"
          aria-selected="true"
          aria-controls="strip-panel-presets"
          className="px-sm py-xs font-mono text-xs tracking-wide text-violet border-b-2 border-violet"
        >
          presets
        </button>
      </div>
      <div
        role="tabpanel"
        id="strip-panel-presets"
        aria-labelledby="strip-tab-presets"
        className="px-sm py-sm"
      >
        <PresetPicker
          activePresetId={activePresetId}
          isModified={isModified}
          onSelect={onSelect}
          onRandomize={onRandomize}
        />
      </div>
    </div>
  )
}

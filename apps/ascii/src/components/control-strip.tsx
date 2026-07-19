import { cn } from '@cyberdeck/deck-kit/utils'
import { useState } from 'react'
import type { Preset } from '../ascii/presets'
import type { ConversionSettings } from '../ascii/types'
import PresetPicker from './preset-picker'
import SettingsEditor from './settings-editor'

// PRESETS then EDIT — ADR 0015's hierarchy survives the new shell: a good look in one tap comes
// first, fine editing one step behind. OUT joins them when its panel exists; a tab is never
// rendered ahead of what sits behind it.
const TABS = [
  { id: 'presets', label: 'presets' },
  { id: 'edit', label: 'edit' },
] as const

type TabId = (typeof TABS)[number]['id']

interface Props {
  settings: ConversionSettings
  activePresetId: string | null
  onPresetSelect: (preset: Preset) => void
  onSettingsChange: (patch: Partial<ConversionSettings>) => void
}

/**
 * The Control Strip (ADR 0020): a horizontal, bottom-anchored control surface at both breakpoints,
 * so the canvas is never occluded while settings are browsed or tuned.
 *
 * The anatomy is GLITCH//Studio's, ported rather than redesigned — ADR 0020's rollout order makes
 * the Chain the stress case and this the easy port, and whatever lands empty-diff is what #191
 * moves into deck-kit.
 */
export default function ControlStrip({
  settings,
  activePresetId,
  onPresetSelect,
  onSettingsChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('presets')

  return (
    <div className="shrink-0 border-t border-base bg-bg">
      <div role="tablist" aria-label="controls" className="flex px-sm">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`strip-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`strip-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-sm py-xs font-mono text-xs tracking-wide border-b-2 transition-colors',
                isActive
                  ? 'text-violet border-violet'
                  : 'text-fg-muted border-transparent hover:text-fg',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Only the active panel is mounted. The alternative — hiding the others with CSS — would
          leave every tab's controls in the accessibility tree and in the tab order at once, which
          is precisely the flat surface the Strip replaced. */}
      <div
        role="tabpanel"
        id={`strip-panel-${activeTab}`}
        aria-labelledby={`strip-tab-${activeTab}`}
        className="px-sm py-sm"
      >
        {activeTab === 'presets' && (
          <PresetPicker
            settings={settings}
            activePresetId={activePresetId}
            onSelect={onPresetSelect}
          />
        )}
        {activeTab === 'edit' && <SettingsEditor settings={settings} onChange={onSettingsChange} />}
      </div>
    </div>
  )
}

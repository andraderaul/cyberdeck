import { cn } from '@cyberdeck/deck-kit/utils'
import { useState } from 'react'
import type { Chain } from '../glitch/chain'
import type { ChainActions } from '../glitch/editor-state'
import type { Preset } from '../glitch/presets'
import ChainEditor from './chain-editor'
import PresetPicker from './preset-picker'

// PRESETS then EDIT — ADR 0015's hierarchy survives the new shell: a good look in one tap comes
// first, fine editing one step behind. OUT joins them when its panel exists; a tab is never
// rendered ahead of what sits behind it.
const TABS = [
  { id: 'presets', label: 'presets' },
  { id: 'edit', label: 'edit' },
] as const

type TabId = (typeof TABS)[number]['id']

interface Props {
  chain: Chain
  activePresetId: string | null
  isModified: boolean
  onSelect: (preset: Preset) => void
  onRandomize: () => void
  actions: ChainActions
  onReroll: () => void
}

/**
 * The Control Strip (ADR 0020): a horizontal, bottom-anchored control surface at both breakpoints,
 * so the canvas is never occluded while a look is browsed, applied or edited.
 *
 * The whole program's control grammar lives here — there is no aside and no sheet behind it.
 */
export default function ControlStrip({
  chain,
  activePresetId,
  isModified,
  onSelect,
  onRandomize,
  actions,
  onReroll,
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
        {activeTab === 'presets' ? (
          <PresetPicker
            activePresetId={activePresetId}
            isModified={isModified}
            onSelect={onSelect}
            onRandomize={onRandomize}
          />
        ) : (
          <ChainEditor chain={chain} actions={actions} onReroll={onReroll} />
        )}
      </div>
    </div>
  )
}

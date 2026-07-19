import type { ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '../utils/cn'

export interface Tab<Id extends string> {
  id: Id
  label: string
}

interface Props<Id extends string> {
  tabs: readonly Tab<Id>[]
  /** Names the tablist for a screen reader — the surface it controls, in the app's own words. */
  ariaLabel: string
  children: (activeTab: Id) => ReactNode
}

/**
 * The Control Strip's shell (ADR 0020): a bottom-anchored bar of tabs over one panel.
 *
 * Shell only — it owns which tab is selected and nothing else. The tab *set* stays in each app
 * (ADR 0014's seam: vocabulary never crosses it), and the panels arrive through `children`, so a
 * program's controls are never a thing the kit knows about.
 *
 * `children` is a function rather than a `Record<Id, ReactNode>` so the inactive panels are never
 * even constructed: mounting one tab at a time is the behaviour, not an optimisation. Hiding the
 * others with CSS would leave every tab's controls in the accessibility tree and the tab order at
 * once, which is precisely the flat surface the Strip replaced.
 */
export default function TabStrip<Id extends string>({ tabs, ariaLabel, children }: Props<Id>) {
  const [activeTab, setActiveTab] = useState<Id>(tabs[0].id)

  return (
    <div className="shrink-0 border-t border-base bg-bg">
      <div role="tablist" aria-label={ariaLabel} className="flex px-sm">
        {tabs.map((tab) => {
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

      <div
        role="tabpanel"
        id={`strip-panel-${activeTab}`}
        aria-labelledby={`strip-tab-${activeTab}`}
        className="px-sm py-sm"
      >
        {children(activeTab)}
      </div>
    </div>
  )
}

import type { KeyboardEvent, ReactNode } from 'react'
import { useRef, useState } from 'react'
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Roving focus, the same shape as ThemeControl's menu: refs and imperative focus rather than a
  // second piece of state, so an arrow press never re-renders — which is what keeps the Strip from
  // constructing a panel the user has not asked for.
  //
  // Manual activation (the arrows move, Enter or Space selects) rather than automatic: a tablist
  // that selects on arrival would swap the panel under someone who is only passing through, and
  // mount its controls to do it.
  const onTabsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const count = tabs.length
    const current = tabRefs.current.indexOf(document.activeElement as HTMLButtonElement | null)
    if (current === -1) {
      return
    }
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        tabRefs.current[(current + 1) % count]?.focus()
        break
      case 'ArrowLeft':
        event.preventDefault()
        tabRefs.current[(current - 1 + count) % count]?.focus()
        break
      case 'Home':
        event.preventDefault()
        tabRefs.current[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        tabRefs.current[count - 1]?.focus()
        break
    }
  }

  return (
    <div className="shrink-0 border-t border-base bg-bg">
      <div role="tablist" aria-label={ariaLabel} onKeyDown={onTabsKeyDown} className="flex px-sm">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              type="button"
              role="tab"
              id={`strip-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`strip-panel-${tab.id}`}
              // The Strip is one tab stop; the arrows move within it.
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                // `min-w` as well as `min-h`: a short label like `out` leaves the tab 38px wide, and
                // the target has to hold in both axes, not just the one the row happens to set.
                'inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-sm font-mono text-xs tracking-wide border-b-2 transition-colors',
                isActive
                  ? 'text-accent border-accent'
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

import { TabStrip } from '@cyberdeck/deck-kit/ui'
import type { RefObject } from 'react'
import type { Chain } from '../glitch/chain'
import type { ChainActions } from '../glitch/editor-state'
import type { Preset } from '../glitch/presets'
import ChainEditor from './chain-editor'
import OutputPanel from './output-panel'
import PresetPicker from './preset-picker'

/**
 * PRESETS → EDIT → OUT, which is the session read left to right: ADR 0015's hierarchy survives the
 * new shell (a good look in one tap first, fine editing one step behind), and export is the
 * terminal action that affords a tab switch rather than sitting always-visible.
 *
 * Kept app-side even though ASCII's list is identical today: the tab set is this program's
 * vocabulary, and vocabulary never crosses the kit's seam (ADR 0014, recorded in ADR 0020).
 */
const TABS = [
  { id: 'presets', label: 'presets' },
  { id: 'edit', label: 'edit' },
  { id: 'out', label: 'out' },
] as const

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  isLive: boolean
  canRecord: boolean
  isRecording: boolean
  onStartRecording: () => void
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
 * The whole program's control grammar lives here — there is no aside, no sheet and no
 * always-visible export bar behind it. The shell is the kit's `TabStrip`; this file is the wiring
 * that says which panel each tab carries.
 */
export default function ControlStrip({
  canvasRef,
  isLive,
  canRecord,
  isRecording,
  onStartRecording,
  chain,
  activePresetId,
  isModified,
  onSelect,
  onRandomize,
  actions,
  onReroll,
}: Props) {
  return (
    <TabStrip tabs={TABS} ariaLabel="controls">
      {(activeTab) => (
        <>
          {activeTab === 'presets' && (
            <PresetPicker
              activePresetId={activePresetId}
              isModified={isModified}
              onSelect={onSelect}
              onRandomize={onRandomize}
            />
          )}
          {activeTab === 'edit' && (
            <ChainEditor chain={chain} actions={actions} onReroll={onReroll} />
          )}
          {activeTab === 'out' && (
            <OutputPanel
              canvasRef={canvasRef}
              isLive={isLive}
              canRecord={canRecord}
              isRecording={isRecording}
              onStartRecording={onStartRecording}
            />
          )}
        </>
      )}
    </TabStrip>
  )
}

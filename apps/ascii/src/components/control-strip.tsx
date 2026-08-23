import { TabStrip } from '@cyberdeck/deck-kit/ui'
import type { RefObject } from 'react'
import type { Preset } from '../ascii/presets'
import type { RenderInstruction } from '../ascii/renderer'
import type { ConversionSettings } from '../ascii/types'
import OutputPanel from './output-panel'
import PresetPicker from './preset-picker'
import SettingsEditor from './settings-editor'

/**
 * PRESETS → EDIT → OUT, which is the session read left to right: ADR 0015's hierarchy survives the
 * new shell (a good look in one tap first, fine editing one step behind), and export is the
 * terminal action that affords a tab switch rather than sitting always-visible.
 *
 * Kept app-side even though GLITCH's list is identical today: the tab set is this program's
 * vocabulary, and vocabulary never crosses the kit's seam (ADR 0014, recorded in ADR 0020).
 */
const TABS = [
  { id: 'presets', label: 'presets' },
  { id: 'edit', label: 'edit' },
  { id: 'out', label: 'out' },
] as const

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  asciiRows: string[]
  renderInstructions: RenderInstruction[]
  isLive: boolean
  canvasDimensions?: { w: number; h: number } | null
  hasAiConfig: boolean
  onAnalyze: () => void
  onConfigureAi: () => void
  canRecord?: boolean
  isRecording?: boolean
  onStartRecording?: () => void
  settings: ConversionSettings
  activePresetId: string | null
  onPresetSelect: (preset: Preset) => void
  onSettingsChange: (patch: Partial<ConversionSettings>) => void
  /** Present only while an applied suggestion still stands unedited — see `App`'s revert point. */
  onRevertSuggestion?: () => void
}

/**
 * The Control Strip (ADR 0020): a horizontal, bottom-anchored control surface at both breakpoints,
 * so the canvas is never occluded while settings are browsed or tuned.
 *
 * The whole program's control grammar lives here — there is no aside, no sheet and no
 * always-visible export bar behind it. The shell is the kit's `TabStrip`, which crossed the seam
 * once both programs ran the same one; this file is the wiring that says which panel each tab
 * carries.
 */
export default function ControlStrip({
  canvasRef,
  asciiRows,
  renderInstructions,
  isLive,
  canvasDimensions,
  hasAiConfig,
  onAnalyze,
  onConfigureAi,
  canRecord,
  isRecording,
  onStartRecording,
  settings,
  activePresetId,
  onPresetSelect,
  onSettingsChange,
  onRevertSuggestion,
}: Props) {
  return (
    <TabStrip tabs={TABS} ariaLabel="controls">
      {(activeTab) => (
        <>
          {activeTab === 'presets' && (
            <PresetPicker
              settings={settings}
              activePresetId={activePresetId}
              onSelect={onPresetSelect}
              onRevertSuggestion={onRevertSuggestion}
            />
          )}
          {activeTab === 'edit' && (
            <SettingsEditor settings={settings} onChange={onSettingsChange} />
          )}
          {activeTab === 'out' && (
            <OutputPanel
              canvasRef={canvasRef}
              asciiRows={asciiRows}
              renderInstructions={renderInstructions}
              resolution={settings.resolution}
              isLive={isLive}
              canvasDimensions={canvasDimensions}
              hasAiConfig={hasAiConfig}
              onAnalyze={onAnalyze}
              onConfigureAi={onConfigureAi}
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

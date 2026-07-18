import { MobileBottomSheet } from '@cyberdeck/deck-kit/ui'
import { useRef, useState } from 'react'
import type { Preset } from '../ascii/presets'
import type { ConversionSettings } from '../ascii/types'
import ControlPanel from './control-panel'

interface Props {
  settings: ConversionSettings
  onSettingsChange: (patch: Partial<ConversionSettings>) => void
  activePresetId?: string | null
  onPresetSelect?: (preset: Preset) => void
}

/**
 * The mobile front door to the controls: a floating trigger opens a bottom sheet holding the same
 * ControlPanel the desktop aside carries. No source/settings tabs (ADR 0015): the Source is chosen
 * from the empty state and cleared from the canvas, so the sheet is only ever the settings surface.
 */
export default function MobileControls({
  settings,
  onSettingsChange,
  activePresetId,
  onPresetSelect,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-3xl right-md z-40 sm:hidden flex items-center gap-xs bg-abyss border border-violet text-violet font-mono text-xs px-md py-sm rounded-xs"
        aria-label="controls"
      >
        ⚙ controls
      </button>

      <MobileBottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={triggerRef}>
        <ControlPanel
          settings={settings}
          onChange={onSettingsChange}
          activePresetId={activePresetId}
          onPresetSelect={onPresetSelect}
        />
      </MobileBottomSheet>
    </>
  )
}

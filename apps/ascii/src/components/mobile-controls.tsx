import { cn } from '@cyberdeck/deck-kit/utils'
import { useRef, useState } from 'react'
import type { Preset } from '../ascii/presets'
import type { ConversionSettings } from '../ascii/types'
import type { SourceMode, WebcamState } from '../hooks/use-webcam-state'
import ControlPanel from './control-panel'
import MobileBottomSheet from './mobile-bottom-sheet'
import UploadZone from './upload-zone'

type Tab = 'source' | 'settings'

interface Props {
  onImage: (img: HTMLImageElement) => void
  webcamState: WebcamState
  onSwitchMode: (next: SourceMode) => void | Promise<void>
  onSwitchCamera: () => void | Promise<void>
  isMirrored: boolean
  onMirrorToggle: () => void
  settings: ConversionSettings
  onSettingsChange: (patch: Partial<ConversionSettings>) => void
  activePresetId?: string | null
  onPresetSelect?: (preset: Preset) => void
}

export default function MobileControls({
  onImage,
  webcamState,
  onSwitchMode,
  onSwitchCamera,
  isMirrored,
  onMirrorToggle,
  settings,
  onSettingsChange,
  activePresetId,
  onPresetSelect,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('source')
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
        <div className="flex flex-col gap-md">
          <div
            role="tablist"
            aria-label="Control tabs"
            className="flex gap-xs border-b border-base pb-sm"
          >
            <button
              role="tab"
              type="button"
              id="tab-source"
              aria-controls="panel-source"
              aria-selected={activeTab === 'source'}
              onClick={() => setActiveTab('source')}
              className={cn(
                'font-mono text-xs px-sm py-2xs rounded-xs border transition-colors',
                activeTab === 'source' ? 'border-violet text-violet' : 'border-base text-fg-muted',
              )}
            >
              source
            </button>
            <button
              role="tab"
              type="button"
              id="tab-settings"
              aria-controls="panel-settings"
              aria-selected={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              className={cn(
                'font-mono text-xs px-sm py-2xs rounded-xs border transition-colors',
                activeTab === 'settings'
                  ? 'border-violet text-violet'
                  : 'border-base text-fg-muted',
              )}
            >
              settings
            </button>
          </div>

          <div
            role="tabpanel"
            id="panel-source"
            aria-labelledby="tab-source"
            hidden={activeTab !== 'source'}
          >
            <UploadZone
              onImage={onImage}
              webcamState={webcamState}
              onSwitchMode={onSwitchMode}
              onSwitchCamera={onSwitchCamera}
              isMirrored={isMirrored}
              onMirrorToggle={onMirrorToggle}
            />
          </div>

          <div
            role="tabpanel"
            id="panel-settings"
            aria-labelledby="tab-settings"
            hidden={activeTab !== 'settings'}
          >
            <ControlPanel
              settings={settings}
              onChange={onSettingsChange}
              activePresetId={activePresetId}
              onPresetSelect={onPresetSelect}
            />
          </div>
        </div>
      </MobileBottomSheet>
    </>
  )
}

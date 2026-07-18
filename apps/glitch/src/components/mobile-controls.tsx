import { MobileBottomSheet } from '@cyberdeck/deck-kit/ui'
import { useRef, useState } from 'react'
import type { Chain, EffectType, Link } from '../glitch/chain'
import type { Preset } from '../glitch/presets'
import ControlPanel from './control-panel'
import PresetPicker from './preset-picker'
import Disclosure from './ui/disclosure'

interface Props {
  chain: Chain
  activePresetId: string | null
  onSelect: (preset: Preset) => void
  onRandomize: () => void
  onLinkChange: (id: string, params: Link['params']) => void
  onReorder: (from: number, to: number) => void
  onAdd: (type: EffectType) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onReroll: () => void
}

/**
 * The mobile front door to the controls: a floating trigger opens a bottom sheet holding the same
 * stack the desktop aside carries — Presets first, the per-Effect panel folded behind `advanced`.
 * No source/settings tabs, unlike ASCII//Convert's: this app chooses its Source from the empty
 * state and clears it from the canvas, so the sheet is only ever the look's tweak surface.
 */
export default function MobileControls({
  chain,
  activePresetId,
  onSelect,
  onRandomize,
  onLinkChange,
  onReorder,
  onAdd,
  onRemove,
  onDuplicate,
  onReroll,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      {/* Floats over the canvas on mobile, so it's canvas overlay chrome (ADR 0013): it stands on an
          opaque `bg-bg` (--void), where `text-violet` clears AA — on --abyss the pair is only 4.35:1.
          A real divergence from ASCII//Convert's identical-looking trigger, whose canvas is filled.
          `src/contrast.test.ts` pins the pair. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-3xl right-md z-40 sm:hidden flex items-center gap-xs bg-bg border border-violet text-violet font-mono text-xs px-md py-sm rounded-xs"
        aria-label="controls"
      >
        ⚙ controls
      </button>

      <MobileBottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={triggerRef}>
        <div className="flex flex-col gap-lg">
          <PresetPicker
            chain={chain}
            activePresetId={activePresetId}
            onSelect={onSelect}
            onRandomize={onRandomize}
          />
          <Disclosure label="advanced">
            <ControlPanel
              chain={chain}
              onLinkChange={onLinkChange}
              onReorder={onReorder}
              onAdd={onAdd}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onReroll={onReroll}
            />
          </Disclosure>
        </div>
      </MobileBottomSheet>
    </>
  )
}

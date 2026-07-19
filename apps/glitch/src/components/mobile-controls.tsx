import { MobileBottomSheet } from '@cyberdeck/deck-kit/ui'
import { useRef, useState } from 'react'
import type { Chain } from '../glitch/chain'
import type { ChainActions } from '../glitch/editor-state'
import ControlPanel from './control-panel'
import Disclosure from './ui/disclosure'

interface Props {
  chain: Chain
  actions: ChainActions
  onReroll: () => void
}

/**
 * The mobile half of the tweak layer: a floating trigger opens a bottom sheet holding the same
 * `advanced` fold the desktop aside carries. The Presets left for the Strip's PRESETS tab
 * (ADR 0020); the sheet itself dies when the EDIT tab takes the Chain editor.
 */
export default function MobileControls({ chain, actions, onReroll }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      {/* Floats over the canvas on mobile, so it's canvas overlay chrome (ADR 0013): it stands on an
          opaque `bg-bg` (--void), where `text-violet` clears AA — on --abyss the pair is only 4.35:1.
          A real divergence from ASCII//Convert's identical-looking trigger, whose canvas is filled.
          `src/contrast.test.ts` pins the pair.
          `bottom-full` against the Strip's wrapper (app.tsx) rather than a viewport offset: the
          Strip is the thing it must clear, so it rides whatever height the Strip actually takes.
          The margin clears the export row still sitting between them — that goes when the OUT tab
          takes it (ADR 0020), and this margin goes with the trigger itself. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="absolute bottom-full right-md mb-3xl z-40 sm:hidden flex items-center gap-xs bg-bg border border-violet text-violet font-mono text-xs px-md py-sm rounded-xs"
        aria-label="controls"
      >
        ⚙ controls
      </button>

      <MobileBottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={triggerRef}>
        <Disclosure label="advanced">
          <ControlPanel chain={chain} actions={actions} onReroll={onReroll} />
        </Disclosure>
      </MobileBottomSheet>
    </>
  )
}

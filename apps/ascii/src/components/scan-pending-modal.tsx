// The one part of the AI Analysis modal that stays in the entry chunk (#357). The click that opens
// that modal is the same click that starts the provider request, so its first frame has to be
// drawable before `analysis-modal`'s chunk is on the wire — otherwise Analyze answers a click with
// nothing on screen, and a second click spends the user's own key a second time (ADR 0003).

import { Modal } from '@cyberdeck/deck-kit/ui'
import type { ReactNode } from 'react'

/** Never called: `closeable={false}` withdraws every control that would reach it. */
const NOOP = () => {}

/**
 * The dialog both halves of a scan wear. Spelled once because the halves now live in different
 * chunks, and a title or a min-height that drifted would read as the modal changing shape partway
 * through a scan.
 */
export const SCAN_MODAL: {
  title: ReactNode
  ariaLabel: string
  variant: 'cyber'
  containerClassName: string
} = {
  title: (
    <span className="text-accent font-bold tracking-wider text-xs">◈ NEURAL SCAN RESULTS</span>
  ),
  ariaLabel: 'Neural scan results',
  variant: 'cyber',
  containerClassName: 'min-h-[220px]',
}

/**
 * A scan in flight: `AnalysisModal`'s `loading` state, and the Suspense fallback standing in for
 * that modal while its chunk arrives. One component for both, so what the user sees cannot depend
 * on which of the two got there first.
 *
 * Not closeable, as the loading state has always been — there is a request in flight that nothing
 * here can cancel.
 */
export default function ScanPendingModal() {
  return (
    <Modal onClose={NOOP} closeable={false} {...SCAN_MODAL}>
      <div className="flex-1 flex flex-col items-center justify-center gap-md py-xl">
        <span className="animate-pulse text-accent text-xs tracking-wider">
          ▸ SCANNING VISUAL FEED...
        </span>
        <span className="text-fg-subtle text-xs">interfacing with AI Provider</span>
      </div>
    </Modal>
  )
}

import HeaderButton from '../ui/header-button'

interface Props {
  onApply: () => void
}

/**
 * The one thing a parked new build is allowed to do to a running session: say so (ADR 0027).
 *
 * In flow under the header rather than over the canvas — an overlay would owe itself a background
 * (ADR 0013) and would land on the user's artwork, or on the piece, to announce housekeeping. It
 * appears at most once a deploy, so the row it costs is cheap; `role="status"` rather than `alert`
 * because nothing here needs interrupting.
 *
 * Its control is a `HeaderButton` because that is what it is: chrome about the program, sitting at
 * the top edge, quiet until hovered. This bar being its second caller is what brought that shape
 * into the kit (ADR 0014).
 */
export default function UpdateBanner({ onApply }: Props) {
  return (
    <div
      role="status"
      className="shrink-0 flex items-center gap-sm border-b border-info bg-bg-elevated px-sm py-2xs sm:px-lg"
    >
      <span aria-hidden="true" className="text-info text-xs shrink-0">
        ↻
      </span>
      <span className="text-fg-muted text-xs">a new version is ready — it runs after a reload</span>
      <HeaderButton variant="accent-text" className="ml-auto shrink-0" onClick={onApply}>
        reload now
      </HeaderButton>
    </div>
  )
}

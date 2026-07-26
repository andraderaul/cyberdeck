import { formatInspection } from '../atlas/inspect'
import type { Hover } from '../hooks/use-hover'

interface Props {
  hover: Hover | null
}

/**
 * Hover inspection (#228): reveals a point's identity and value — `Ashburn, US · 340 Gbps`. A ring
 * marks the inspected node and a chip carries the reading, both offset from the pointer so they
 * don't sit under it. The chip brings its own opaque background (ADR 0013) — it floats over the
 * user's artwork. Non-interactive, so it never eats the scale gesture underneath.
 */
export default function HoverInspector({ hover }: Props) {
  if (!hover) {
    return null
  }
  return (
    <div className="absolute inset-0 pointer-events-none">
      <span
        className="absolute block rounded-pill border border-cyan"
        style={{
          left: hover.point.x,
          top: hover.point.y,
          width: 14,
          height: 14,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <span
        className="absolute font-mono text-xs px-sm py-2xs rounded-xs bg-bg border border-cyan text-cyan whitespace-nowrap"
        style={{ left: hover.x, top: hover.y, transform: 'translate(12px, -130%)' }}
      >
        {formatInspection(hover.point)}
      </span>
    </div>
  )
}

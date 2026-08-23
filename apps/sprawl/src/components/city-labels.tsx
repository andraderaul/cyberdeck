import type { CityLabel } from '../atlas/labels'

interface Props {
  labels: readonly CityLabel[]
}

/** Below this the label is too faint to earn its ink and is dropped, so labels thin out with the
 *  structure instead of cluttering a fading frame. */
const LABEL_MIN_BRIGHTNESS = 0.25

/**
 * City names on the brightest nodes (#228): orientation without a basemap. Rendered as light text
 * with a dark glow rather than a chip, so the names orient without fighting the emerging structure.
 * Opacity tracks each node's brightness, so a metro's name fades as the metro does.
 * Non-interactive — hover inspection owns the pointer.
 *
 * The ADR here is **0021, not 0013**, and an earlier version of this comment cited the wrong one.
 * ADR 0013 governs marks standing on pixels the program did not choose, and it *rejects* a glow as
 * an answer — "WCAG credits no contrast to a shadow, so the result is unauditable". These names are
 * not that case: this canvas is the program's own render of a vendored snapshot (ADR 0022), and a
 * name is positioned by the renderer at the coordinates of the node it belongs to. Giving each one
 * an opaque plate would be a second map drawn over the first, which is the piece being charged for
 * its own labels. The chips over this canvas — the reader, the outline toggle, the export controls —
 * are the other case and do carry their own opaque ground.
 */
export default function CityLabels({ labels }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {labels
        .filter((label) => label.brightness >= LABEL_MIN_BRIGHTNESS)
        .map((label) => (
          <span
            key={label.text}
            className="absolute font-mono text-[10px] tracking-wide text-fg whitespace-nowrap"
            style={{
              left: label.x,
              top: label.y,
              transform: 'translate(8px, -50%)',
              // A dark glow rather than a plate, for the reason above (ADR 0021): it lifts the name
              // off whatever the render put under it without putting a chip on every city. Not a
              // contrast guarantee, and not offered as one.
              textShadow: '0 0 4px var(--bg), 0 0 4px var(--bg)',
              opacity: 0.55 + 0.45 * label.brightness,
            }}
          >
            {label.text}
          </span>
        ))}
    </div>
  )
}

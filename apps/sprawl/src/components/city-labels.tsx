import type { CityLabel } from '../atlas/labels'

interface Props {
  labels: readonly CityLabel[]
}

/** Below this the label is too faint to earn its ink and is dropped, so labels thin out with the
 *  structure instead of cluttering a fading frame. */
const LABEL_MIN_BRIGHTNESS = 0.25

/**
 * City names on the brightest nodes (#228): orientation without a basemap. Rendered as light text
 * with a dark glow (its own contrast against the user's artwork — ADR 0013) rather than a chip, so
 * the names orient without fighting the emerging structure. Opacity tracks each node's brightness,
 * so a metro's name fades as the metro does. Non-interactive — hover inspection owns the pointer.
 */
export default function CityLabels({ labels }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {labels
        .filter((label) => label.brightness >= LABEL_MIN_BRIGHTNESS)
        .map((label) => (
          <span
            key={label.text}
            className="absolute font-mono text-[10px] tracking-wide text-ghost whitespace-nowrap"
            style={{
              left: label.x,
              top: label.y,
              transform: 'translate(8px, -50%)',
              // A dark glow is the label's own background (ADR 0013) — it holds over any brightness
              // the canvas paints beneath without an opaque chip on every city.
              textShadow: '0 0 4px var(--void), 0 0 4px var(--void)',
              opacity: 0.55 + 0.45 * label.brightness,
            }}
          >
            {label.text}
          </span>
        ))}
    </div>
  )
}

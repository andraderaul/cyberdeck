# ADR 0001 — Hidden canvas for pixel sampling

## Status

Accepted (amended in #335 — the sampling canvas must be cleared before every draw; see Consequences)

## Context

The only way to read the RGB values of an image in the browser without a server is via
`CanvasRenderingContext2D.getImageData()`. Because of this, the converter keeps a hidden `<canvas>`
of dimensions `cols × rows` — proportional to the visible canvas — where the Source Image is drawn
at a reduced scale before being sampled pixel by pixel.

The hidden canvas exists separately from the rendering canvas because the two operations have
distinct purposes: the hidden one reads data at ASCII grid resolution; the visible one renders text
at full size. Merging the two would require redrawing the image onto the visible canvas every frame,
corrupting the output.

## Decision

Keep a hidden `<canvas>` of dimensions `cols × rows`, proportional to the visible canvas, dedicated
to pixel sampling. Draw the Source Image into it at reduced scale, then read it with
`getImageData()`. This canvas stays separate from the visible rendering canvas so that reading data
at grid resolution and rendering text at full size never interfere with each other.

## Considered Alternatives

- **Server-side processing.**
  - *Rejected because:* the app is deliberately 100% client-side, with no server.
- **`FileReader` + `ImageData` directly.**
  - *Cons:* offers no straightforward resizing.
  - *Rejected because:* the hidden canvas solves reading and resizing in a single operation.

## Consequences

**Positive:**
- Reading at ASCII grid resolution and rendering text at full size stay isolated, so per-frame
  rendering never corrupts the sampled output.
- The hidden canvas resolves both reading and resizing in one operation.

**Negative:**
- A second, hidden `<canvas>` must be maintained alongside the visible rendering canvas.
- That canvas outlives a single render, and `drawImage` composites source-over: it has to be
  cleared before every sampling draw, or a Source with an alpha channel blends onto the frame
  before it and the sampled pixels start depending on how many renders came first. An opaque
  Source never shows this, so the clear is not optional and is not self-evidently needed (#335).
  The clear is a `clearRect`. `globalCompositeOperation = 'copy'` was rejected: it leaves a mode
  behind on a context the shells do not own, and under the mirror flip (ADR 0016) it would apply
  to the transformed rect rather than to the bitmap. Dropping the contents by resizing the canvas
  was rejected too — it buys a fresh bitmap on every frame of the Live Source loop (ADR 0002),
  and it is not even reliable: assigning the width a value it already has is a no-op, which is
  exactly what a Live Source does every frame.

## Related ADRs

- None.

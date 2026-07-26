# ADR 0001 — Hidden canvas for pixel sampling

## Status

Accepted

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

## Related ADRs

- None.

# ADR 0005 — Pure/impure boundary with RenderInstruction

## Status

Accepted (amended in #411 — the *boundary* is unchanged, the value crossing it is not; see
Implementation Notes)

## Context

The original `renderFrame()` mixed pure computation (deriving position and color from each ASCII
cell) with side effects (painting on the canvas). This made the colorization and positioning logic
impossible to test without a DOM.

## Decision

Split `renderFrame()` into two functions with distinct responsibilities:

- **`computeFrame(cells, settings)`** — pure, no DOM, no side effects. Takes the `AsciiCell[][]` grid
  and render settings, returns a `RenderInstruction[]` array with `{ char, x, y, color }` and the
  `asciiRows` for TXT export.
- **`paintFrame(ctx, instructions, resolution)`** — impure, receives the canvas context and executes
  the paint side effects.

`computeFrame` is directly testable with Vitest without mounting a component or mocking the DOM.
`paintFrame` sits at the system boundary — it is the only function that touches
`CanvasRenderingContext2D` for rendering. `renderFrame()` remains as a private orchestrator in the
component: it calls `convertImage()`, `computeFrame()`, and `paintFrame()` in sequence.

## Considered Alternatives

- **Keep `renderFrame` as a single function.**
  - *Rejected because:* the colorization logic cannot be tested without a DOM; computation and side
    effects are mixed without an explicit boundary.
- **Use a `Renderer` class.**
  - *Rejected because:* unnecessary OOP overhead for functions that share no state.

## Consequences

**Positive:**
- `computeFrame` is directly testable with Vitest — no component mount, no DOM mocking.
- Side effects are confined to a single boundary function, `paintFrame`, the only one touching
  `CanvasRenderingContext2D` for rendering.

**Negative:**
- Rendering a frame now flows through three functions (`convertImage`, `computeFrame`, `paintFrame`)
  orchestrated by `renderFrame()`, rather than one.

## Related ADRs

- ADR 0004 — ASCII domain module.
- ADR 0002 — the two pure stages run on a Worker, and its #411 amendment is what reshaped the value
  this ADR names.

## Implementation Notes

### Amendment (#411) — the same boundary, a different value across it

`computeFrame` no longer returns `RenderInstruction[]` and `asciiRows`. It returns a **PackedFrame**
— `{cols, rows, chars: Uint32Array, colors: Uint32Array}`, one entry per cell, row-major — and
`paintFrame(ctx, frame, resolution, fontFamily)` takes that. x and y are gone because both are
arithmetic on the index and `cols`; `asciiRows` is gone because `frameRows(frame)` derives it and
only TXT Export's click ever asks.

**Nothing this ADR decided moved.** `computeFrame` is still pure and still directly testable with no
DOM, `paintFrame` is still the only function that writes to `CanvasRenderingContext2D`, and the
orchestrator still calls the three in sequence. What changed is that the value between them is now
transferable, which is what let the Worker's return leg stop being a structured clone — the
measurement, and the reason the shape is the one it is, live in ADR 0002's #411 amendment.

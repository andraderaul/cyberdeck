# ADR 0005 — Pure/impure boundary with RenderInstruction

## Status

Accepted

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

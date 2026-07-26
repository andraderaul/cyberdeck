# ADR 0004 — ASCII domain module

## Status

Accepted

## Context

The ASCII conversion pipeline was scattered across `src/types.ts` and `src/utils/` — a semantically
generic folder that in practice held only ASCII domain logic. This made it harder to trace pipeline
dependencies, move parts of it to a Web Worker (see ADR 0002), and test units in isolation.

## Decision

Group everything under `src/ascii/`, following the same pattern as the `src/ai/` module:

```
src/ascii/
├── types.ts        — AsciiCell, Charset, CHARSET_MAPS, ConversionSettings, ColorMode
├── converter.ts    — convertImage(), getAsciiChar(), applyBrightnessContrast()
├── image-utils.ts  — resizeImage()
└── renderer.ts     — computeFrame(), paintFrame() (see ADR 0005)
```

React components stay in `src/components/` — they orchestrate the domain but are not part of it.
`app.tsx` imports from `src/ascii/` directly; this is correct per Clean Architecture's dependency
rule (UI → domain, never the reverse).

## Considered Alternatives

- **Keep in `src/utils/`.**
  - *Rejected because:* `utils/` implies generic, reusable utilities; the ASCII pipeline is specific
    domain logic.
- **A feature folder including the components.**
  - *Rejected because:* mixing UI and domain in the same module would couple the very responsibilities
    the separation is meant to isolate.

## Consequences

**Positive:**
- Pipeline dependencies are easier to trace, and units can be tested in isolation.
- Moving parts of the pipeline into a Web Worker (ADR 0002) becomes tractable.
- The layout mirrors the existing `src/ai/` module, so the structure is familiar.

**Negative:**
- Imports across the codebase had to be updated to point at `src/ascii/`.

## Related ADRs

- ADR 0002 — Webcam live feed — rAF loop on the main thread.
- ADR 0005 — Pure/impure boundary with RenderInstruction.

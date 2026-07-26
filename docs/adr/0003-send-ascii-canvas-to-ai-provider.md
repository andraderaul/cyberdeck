# ADR 0003 — Send the ASCII canvas to the AI provider instead of the source image

## Status

Accepted

## Context

The Analyze feature needs to hand an image to the AI Provider. Two candidates exist: the rendered
ASCII canvas, and the original Source Image. The original Source Image is not accessible at analysis
time without refactoring the pipeline — it was already consumed by `convertImage()` and the hidden
canvas was discarded. Accessing it would require threading the Source Image all the way down to the
Analyze call site.

Beyond the pipeline constraint, sending the ASCII canvas reinforces the feature's narrative — the AI
"sees" processed ASCII data, consistent with the cyberpunk premise of a computational system
analyzing visual feeds. Analysis quality is secondary to the entertainment intent; the AI produces
meaningful output from ASCII art regardless of Color Mode.

## Decision

The Analyze feature sends the rendered ASCII canvas (`canvas.toDataURL('image/png')`) to the AI
Provider rather than the original Source Image. This is a conscious trade-off, driven by the pipeline
constraint and reinforced by the feature's narrative intent.

## Considered Alternatives

- **Send the original Source Image instead.**
  - *Cons:* The Source Image is not accessible at analysis time — it was already consumed by
    `convertImage()` and the hidden canvas was discarded. Using it would require threading the Source
    Image all the way down to the Analyze call site.
  - *Rejected because:* The refactoring cost isn't justified, and sending the ASCII canvas also
    reinforces the narrative of an AI "seeing" processed ASCII data.

## Consequences

**Positive:**
- No pipeline refactoring required — the ASCII canvas is already available at the call site.
- Reinforces the cyberpunk narrative of a computational system analyzing visual feeds.
- The AI produces meaningful output from ASCII art regardless of Color Mode.

**Negative:**
- Analysis operates on processed ASCII data rather than the higher-fidelity source, which caps
  achievable analysis quality — acceptable because quality is secondary to the entertainment intent.

## Related ADRs

- ADR 0001 — Hidden canvas for pixel sampling.

## Questions / Future Work

If higher-fidelity analysis is needed in the future, the backlog option is to pass the Source Image
through the pipeline to `analysis-service`, or to use the hidden canvas (which holds the downsampled
pixel grid) as a neutral, color-mode-independent input.

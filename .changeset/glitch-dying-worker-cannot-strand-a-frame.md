---
'@cyberdeck/glitch': patch
---

A dying Worker can no longer strand a frame, and a render that fails reaches the ErrorBoundary again.

Both bugs are `chain-runner.ts`'s and `glitch-canvas.tsx`'s originals, found while reviewing the
same shapes in ASCII//Convert and fixed in the same pass rather than left in the file they were
copied from. The fallback path runs the Chain inside the Worker's `error` listener with both slots
already emptied, so a throw there settled nothing and left a promise nothing could ever settle — a
canvas that never paints; it is settled in a `finally` now. And a throw out of `renderGlitchFrame`
was a floating rejection nobody observed rather than the "render failed — try a different image or
adjust settings" the boundary in `app.tsx` was written to show; the canvas re-throws it from its
next render.

---
"@cyberdeck/ascii": patch
"@cyberdeck/glitch": patch
---

Extract the operational-error mechanism into `@cyberdeck/deck-kit/errors` (ADR 0014, Candidate B):
`AppError`, `createError`, `isAppError`, `normalizeError` (including the generic `unknown_error`
fallback). Each app keeps its own `Errors` catalog, now importing `createError` from the kit — the
vocabulary never crosses the seam. Internal refactor — no behavior change.

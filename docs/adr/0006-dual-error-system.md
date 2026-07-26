# ADR 0006 — Dual error system: AppError for operational errors, typed classes for AI errors

## Status

Accepted

## Context

The app has two error flows with distinct needs. AI analysis errors (`AuthError`, `QuotaError`,
`ParseError`) are thrown by adapters, caught in `app.tsx`, and routed to an interactive modal with
type-specific actions — that flow already worked and did not need to change. What was missing was
handling for operational errors (PNG Export, TXT Export, Capture, localStorage) that were failing
silently.

## Decision

Introduce `AppError` — a plain object shape with `type`, `message`, and an optional `cause` — to
cover these operational errors, alongside a custom toast system built on design system tokens.
`normalizeError` ensures any `unknown` caught at a boundary becomes an `AppError` before reaching
the toast.

The two systems coexist rather than being unified because forcing `AuthError`/`QuotaError`/`ParseError`
into `AppError` would replace `instanceof` checks with string comparisons for no real gain — the
modal already knows exactly what to do with each class, and that logic would not have become
simpler.

## Considered Alternatives

- **Migrate everything to `AppError`.**
  - *Rejected because:* the AI adapters and `app.tsx` already have a well-defined contract via typed
    classes. The migration would be refactoring on principle, not out of necessity.
- **Unify everything into toast.**
  - *Rejected because:* AI errors require specific instructions and user action (fix API key, retry).
    Toast is not the right mechanism for that.
- **Keep operational errors silent.**
  - *Rejected because:* an export failing without feedback is a broken experience.

## Consequences

**Positive:**
- Operational errors now surface through a toast instead of failing silently.
- The AI-error modal keeps its `instanceof`-based dispatch, so its type-specific action logic stays
  simple.

**Negative:**
- Two error systems coexist; a maintainer must know which flow an error belongs to — typed classes
  for AI errors, `AppError` + toast for operational errors.

## Related ADRs

- None.

# ADR 0018 — GOLEM//Console replaces the control panel with a command line

## Status

Accepted

## Context

ADR 0015 made GLITCH's interaction model canonical for the deck: a single Source entry via
`EmptyStateHero`, live controls in the canvas overlay, and a control panel with Presets in front and
tweaks behind an `advanced` disclosure.

A command line and a widget panel are two grammars competing for the same screen. If both can set a
breakpoint, one of them is decoration, and decoration that looks functional is worse than absent: the
user tries `break list` after clicking a gutter and finds two disagreeing sources of truth. GOLEM's
subject matter is an operator driving a machine, so the choice of control surface is not cosmetic — it
is the fiction.

## Decision

GOLEM//Console deliberately does not adopt the control panel. All control — `run`, `step`, `break`,
`reg`, `export` — goes through the **Console**, and every other panel (Source, registers, memory,
Terminal) is strictly read-only and never accepts a click. Giving each grammar exclusive territory
resolves the two-sources-of-truth conflict by construction rather than by synchronisation.

This still satisfies ADR 0015. The parity that ADR asks for is *of shell and pattern, not of widget* —
the CONTEXT-MAP already says so. Read at that level, GOLEM complies: the **Console is this program's
control panel**, and the register/memory panels are its canvas. A program whose subject matter is an
operator driving a machine gets its control surface from the same place the fiction does.

## Considered Alternatives

- **Adopt a widget control panel like ADR 0015 (clickable Presets/advanced disclosure, gutter
  breakpoints, step/run buttons).**
  - *Cons:* A command line and a widget panel are two grammars for the same screen; if both can set a
    breakpoint, one is decoration, and functional-looking decoration yields two disagreeing sources of
    truth.
  - *Rejected because:* Parity is of shell and pattern, not of widget — the Console *is* GOLEM's control
    panel, so a second control grammar would only compete with it.

## Consequences

**Positive:**
- The two-grammars conflict is resolved by construction: with control living only in the Console, there
  is never a second, disagreeing source of truth to keep in sync.

**Negative:**
- **Discoverability is the cost, and it must be paid explicitly.** `help` is the Console's first line on
  an empty state, and an unknown command suggests the nearest known one. Without both, the model fails
  for a first-time user.
- **The Source panel is the single exception to read-only**, and only while no Machine exists — which is
  exactly the empty state, where ADR 0015 puts the single Source entry. The exception is narrower than it
  looks: editing is not a control, it is Source entry.
- **A future parity review must not "fix" this.** GOLEM having no `advanced` disclosure and no step/run
  buttons is the decision, not an oversight.

## Related ADRs

- ADR 0015 — Cross-program UX parity — ASCII adopts GLITCH's Source model.

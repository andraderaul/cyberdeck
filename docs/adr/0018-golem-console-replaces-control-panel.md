# GOLEM//Console replaces the control panel with a command line

ADR 0015 made GLITCH's interaction model canonical for the deck: a single Source entry via
`EmptyStateHero`, live controls in the canvas overlay, and a control panel with Presets in front and
tweaks behind an `advanced` disclosure. GOLEM//Console deliberately does not adopt the control panel.
All control — `run`, `step`, `break`, `reg`, `export` — goes through the **Console**, and every other
panel (Source, registers, memory, Terminal) is strictly read-only and never accepts a click.

## Why

A command line and a widget panel are two grammars competing for the same screen. If both can set a
breakpoint, one of them is decoration, and decoration that looks functional is worse than absent: the
user tries `break list` after clicking a gutter and finds two disagreeing sources of truth. Giving each
grammar exclusive territory resolves this by construction rather than by synchronisation.

The deeper reason is that the parity ADR 0015 asks for is *of shell and pattern, not of widget* — the
CONTEXT-MAP already says so. Read at that level, GOLEM does comply: the **Console is this program's
control panel**, and the register/memory panels are its canvas. A program whose subject matter is an
operator driving a machine gets its control surface from the same place the fiction does.

## Consequences

- **Discoverability is the cost, and it must be paid explicitly.** `help` is the Console's first line
  on an empty state, and an unknown command suggests the nearest known one. Without both, the model
  fails for a first-time user.
- **The Source panel is the single exception to read-only**, and only while no Machine exists — which
  is exactly the empty state, where ADR 0015 puts the single Source entry. The exception is narrower
  than it looks: editing is not a control, it is Source entry.
- **A future parity review must not "fix" this.** GOLEM having no `advanced` disclosure and no
  step/run buttons is the decision, not an oversight.

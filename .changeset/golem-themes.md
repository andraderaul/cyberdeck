---
"@cyberdeck/golem": minor
---

GOLEM//Console gains the deck's Theme control, in the header (ADR 0024). It is the tracer for
Themes, which means it is also where two roles that had never been named got named: the Terminal's
output is a **phosphor** — the machine's own voice, not "info" — and the Cache lens's **HIT / MISS**
is a result pair rather than info and warning. `construct` therefore reads as a green-phosphor
machine rather than a green frame around a cyan screen.

The Console is still the only grammar for the machine (ADR 0018). The Theme control changes how the
deck looks, not what the machine does.

Also fixes a panel background that has never rendered: every panel carried `bg-surface`, which is
not a class — the utility is `bg-bg-surface` — so the panels have been transparent since they were
written.

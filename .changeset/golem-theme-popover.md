---
"@cyberdeck/golem": minor
---

GOLEM//Console's Theme control stops cycling and becomes a popover (ADR 0024): the header trigger
now opens a panel listing the whole roster — seven Themes, up from three — so a Theme is picked by
name rather than discovered by pressing. The pre-paint script names the full roster in order, so the
chosen Theme still applies before first paint with no flash of the default. As with ADR 0024's
original control change, GOLEM is the tracer for the popover migration.

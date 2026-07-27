---
"@cyberdeck/sprawl": patch
---

Picks up the deck-kit release that grows the Theme roster to seven and turns the picker into a
popover (ADR 0024). SPRAWL//Atlas gains nothing from it and shows no change on screen: it is excluded
from Themes by explicit decision (ADR 0021, ADR 0024), never sets the theme attribute, and the kit's
roster guard still asserts it has no pre-paint script so a future consistency pass cannot "fix" the
omission.

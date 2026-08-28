---
'@cyberdeck/ascii': minor
---

The **Live Source** is now one act away with a **Source Image** on the canvas. Reaching the camera
used to mean clearing the Source, landing back on the empty state and choosing it there — three acts
to change one input, for no reason anyone had decided: the empty state was simply the only place a
Source had ever been chosen, and the Live Source inherited that placement without anyone asking
whether a *switch* needed its own way in.

`◉ live source` sits on the canvas beside `✕ clear`, and it is homed there deliberately. Both act on
the Source, where the Control Strip is about *how* to convert rather than *what* to convert
(ADR 0020) — so the switch stays out of the tab grammar. It shows only while a Source Image is what
the canvas is converting; the Live Source's own tuning (mirror, switch camera) takes that slot on
the other side.

A camera that is missing or refused is answered the way the empty state has always answered it —
attempt it, and let the refusal arrive as a toast (ADR 0006) — so there is one rule rather than two.
What changes is what the failure leaves behind: **the loaded Source Image stays on the canvas**
instead of being cleared out from under the message explaining why the camera never opened. A
running Recording is stopped before the Source changes, exactly as clearing it already did.

Fixed along the way, and reachable before this: tearing down the Live Source left the source mode
still reading `webcam`, which made the *next* request for it a silent no-op — so `use webcam` on the
empty state did nothing at all after a Live Source had once been cleared.

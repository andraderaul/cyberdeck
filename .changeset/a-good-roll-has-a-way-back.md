---
'@cyberdeck/glitch': minor
---

A **step back** to the roll before this one, and the Seed written down in hex. Re-roll was a slot
machine with no way back: pull it fifteen times, land on something good, nudge one slider and that
arrangement was gone — no readout, no undo, and the Seed that produced it was never on screen. The
Editor now keeps the last eight arrangements the session left behind, and one control beside Re-roll
walks back through them, one press per roll. The current Seed reads under the Chain row as
`0x8f2c1a3b` — never over the canvas, where a badge would need an opaque box that lands on the
user's own result (ADR 0013).

What comes back is a **Seed**, not a snapshot. It re-runs under the look as it stands now, so moving
a slider between the roll and the step back changes the picture that reappears. That is the
deliberate shape: an entry holding chain + params + seed would be faithful and would stop being a
Seed history — it would be session undo, which covers every edit and deserves its own decision.

Only Re-roll records. The animated Seed does not: it is a Re-roll on every painted frame, and a few
seconds of it would push hundreds of entries and bury every roll the user actually asked for. Nor do
a Preset, a Randomize or an import — those three change the **look**, and the arrangement they leave
behind belonged to a look that is gone. Nothing persists across a reload: a roll is worth returning
to only while you still remember seeing it.

**The list of rolls with a thumbnail each did not ship, and the number is why.** Recognising the
arrangement is what would make a list worth having — `0x8f2 / 0x2c1 / 0x91a` is unreadable, and
clicking through hex is re-rolling from a smaller stock. Runtime was never the obstacle: the Chain
over a 96x96 sample costs 0.6–1.3 ms per preset look, so eight previews are single-digit
milliseconds, and they can run on the main thread without touching the Worker's one waiting slot.
The **entry bundle** was. GLITCH//Studio sits at 74.43 kB gzipped against a 75.00 ceiling — 570
bytes — and a bare-bones thumbnail path (a small sampling canvas, a synchronous render per Seed, a
row of previews, no loading state and no tests) measured **75.08 kB**: over the ceiling before any of
the parts a shipped version would need. Thumbnails would also have to re-render on every param
change to stay honest, since an entry is a Seed rather than a snapshot, so a frozen preview would
lie in exactly the case the feature exists for. The step back delivers the recovery without the
previews, and lands at **74.76 kB** — inside the ceiling, which was not raised.

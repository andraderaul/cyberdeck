---
'@cyberdeck/glitch': minor
---

The Chain now runs on a Worker thread. ADR 0002 chose the main thread and recorded the Web Worker as
the upgrade path; GLITCH takes it first, because its whole per-frame core is one pure function over a
currency that was already DOM-free. The look is untouched — the same Chain and the same Seed paint
the same pixels — but the eight Effects no longer compete with the interface for the same thread, so
a heavy Chain over a Live Source leaves the controls responsive instead of freezing them between
frames.

Frames move by transfer rather than by copy in both directions, and a slow Chain drops frames instead
of building a backlog behind the camera. Where a browser has no `Worker`, refuses one, or loses one
mid-session, the very same Chain runs where it always did.

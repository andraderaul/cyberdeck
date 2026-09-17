---
'@cyberdeck/deck-kit': minor
---

The press sound moves into the kit, on its own `@cyberdeck/deck-kit/sound` entry point.

It was written in ASCII//Convert at #398 because one caller is a hypothetical seam (ADR 0014), and it
crosses now that the hub, GLITCH//Studio and GOLEM//Console are callers two, three and four — the
route `UpdateBanner` took, and the reason ADR 0029 asked for the move rather than birth in the kit:
the bar is an **empty diff measured**, not predicted.

**Measured, it was empty.** `git mv` of all seven files reported R100 with zero content lines — the
mechanism, the sample, the recipe and the tests crossed byte for byte, because the `cyberdeck:sound`
key was deck-wide and unqualified from its first line. The one part that did not cross unchanged is
the mute *control*: it wore three typography constants from `apps/ascii/src/header-type.ts`, and no
other header on the deck has such a module. It now wears `HeaderButton`'s own type, exactly as the
`ThemeControl` it sits beside does — one component serving four headers cannot borrow one app's face.
Re-measured in Chromium at 320/360/375 over the built output, ASCII//Convert's header is unchanged at
372px: below `sm` the mute is glyph-only and sits on `HeaderButton`'s `min-w-[44px]` floor, so the
face it wears cannot move the row.

**`/sound` rather than a corner of `/ui`, and that is the exclusion doing work.** SPRAWL//Atlas
already imports `/ui` and `/pwa`; a `SoundControl` re-exported from the `/ui` barrel would leave the
piece one tree-shake away from a sample ADR 0021 decided it must never play. A separate specifier
makes the exclusion a fact about what the piece imports.

**The exclusion guard grew the two blind spots it had.** It scanned only `apps/sprawl/src/**/*.{ts,tsx}`,
so an inline script in `apps/sprawl/index.html` — which already carries script tags — was invisible to
it, and so was the kit installing the listener at its own module scope, which no scan of `apps/sprawl`
could ever see. It now reads every executable file under `apps/sprawl`, `index.html` included, and
holds that no kit module outside a test *calls* `installClickSound()`.

**`assetsInlineLimit` ships beside `precacheShell`**, so the rule that keeps the sample out of the
entry chunk is one definition and four references rather than four copies of one predicate.

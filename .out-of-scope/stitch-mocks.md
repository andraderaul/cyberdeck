# The Stitch mocks — what the deck refused

**Date:** 2026-09 · **Source:** two Google Stitch mocks, `stitch_ascii_terminal_command_ui` (ASCII//Convert)
and `stitch_glitch_ui` (GLITCH//Studio) · **Issue:** #391

Eight issues came out of these mocks and all eight shipped — #366, #367, #368, #369, #370, #371,
#372, #373. This file is the other half: the proposals that were looked at and turned down, so the
next person who sees the same idea sees the answer with it.

## Where the mocks came from

They were **seeded from this repo's own design skill** — `.claude/skills/ascii-convert-design/`,
whose `README.md` hands over `ice`, the accent `#b829ff`, the exact Unicode glyph set
(`◈ ◉ ◎ ● ○ ⬆ ↑ ✕ × ⚿ ▸ ⇄ ⏺ ⏹ ⚠`, never emoji), and the rule that elevation is 1px borders and a
lighter fill, never a shadow.

So they are **remixes of the deck's own visual language, not an outside aesthetic**. That is the
fact to start from if this is ever reopened: the real delta was layout and a handful of features,
never the look. Nothing below was refused for looking wrong.

## From the ASCII//Convert mock

| Refused | Why |
|---|---|
| **Split view — Source \| Output side by side** | Maintainer's call: not enough value for the cost. It is also the change that would have justified several others, which is why the rest of the list collapsed with it. |
| **Canvas corner readouts** (`SRC_IMG_01` and similar) | Second-order casualty of dropping split view — the labels name a pane that no longer exists. Best flavour-to-effort item on the original list, but only while there were two panes to tell apart. |
| **Vertical left rail** carrying LIVE / REC / SCAN | **ADR 0020:** the Control Strip is the program's single control grammar, horizontal and bottom-anchored at *both* breakpoints. A rail is a second grammar. The one real problem it exposed — Live Source sitting three acts away — was fixed inside the existing grammar instead (#366). |
| **Command bar** | No user problem behind it. Everything it would dispatch is already one tap away in the Strip. |
| **`EXPORT_TERMINAL` overlay** | **ADR 0013:** overlays own their background. ASCII//Convert is *exempt* from that opaque-background requirement — `paintFrame()` fills its canvas with `--void` before drawing, so its overlays already stand on the audited pair — and the objection here is the deck/user boundary rather than legibility: a full-canvas panel is chrome standing where the user's output goes. Export is already a Strip tab (**ADR 0020**). |
| **Bottom nav with icon-only controls** | Duplicates the Strip's tabs, and icon-only controls over the canvas collide with the `ICON_GLYPH_SIZE` rule: chrome over the canvas stays at its drawn size and buys its 44px as an overlay precisely so the picture is not charged for its own chrome. |
| **Preset badges over the artwork** | The same boundary as the `EXPORT_TERMINAL` row. |
| **The mock's palette** (`primary: '#e8b3ff'`) | A lighter accent than `ice`'s `--violet: #b829ff`. Adopting it is not a restyle — it is an **eighth Theme** under **ADR 0024**, with its own contrast guards to satisfy. |

## From the GLITCH//Studio mock

| Refused | Why |
|---|---|
| **Vertical accordion Chain editor** | The Chain is an ordered list the user reorders by dragging, and the order *is* the look (**ADR 0017**). An accordion hides it. |
| **`[SYS]` log console** | A surface with no domain behind it. **ADR 0006** already gives operational errors a mechanism; a scrolling log is decoration that would then need feeding. |
| **The mock's toast for a refused Chain import** | The app's existing refusal path is *more* careful than the mock's, not less — `chain-codec.ts` compares `CHAIN_FILE_VERSION` by exact equality and reads `type`, `params` and `bypassed`, ignoring every other key. The one place the mock is behind the app. |

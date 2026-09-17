# ASCII//Convert — visual regression baselines

Eight pictures in `__screenshots__/`, taken by `screens.spec.ts`. They exist for the break nothing
else on the deck can see: the build is green, the program boots, axe is quiet, every control holds
its 44px — and it *looks* wrong. A spacing step the preset never defined generates no class, a Theme
token resolves to nothing and the parent's colour shows through, an overlay loses the opaque ground
ADR 0013 requires it to carry.

> **These baselines have not been reviewed.**
>
> A screenshot baseline pins whatever was on screen the day it was taken, *including a bug*. The
> automation that produced them cannot tell a correct layout from an incorrect one — that is the
> entire reason this set needs a human before it is merged. Nothing here is an approval. The list
> below is a reviewer's checklist: what each picture is for, and the specific thing to look at in
> it. Approving one means having looked at that thing.

## How to look at them

```bash
npm run screens          # check the committed baselines (needs Docker)
npm run screens:update   # retake them — the only way a baseline ever changes
```

Both run the suite inside `mcr.microsoft.com/playwright:v<lockfile version>-noble` on
**`linux/arm64`**, which is exactly what the `Visual regression` CI job runs (an `ubuntu-24.04-arm`
runner, same image), and the only environment these pictures are comparable in. The reason is in
`e2e/support/screens.ts`: **the deck ships no webfont**, so every glyph here is the system monospace
of the machine that took the picture, and macOS and Linux do not draw the same one. The platform is
in each filename for that reason.

arm64 rather than the amd64 a runner defaults to, because Chromium cannot run under qemu-user — the
amd64 image on an Apple Silicon machine aborts at every browser launch. Pinning to amd64 would have
meant baselines nobody could take or look at outside CI, which for this guard is the whole point.
An x86 machine cannot check these; it skips and says so, and CI is where they are checked.

A baseline is never rewritten by a failing run — `updateSnapshots: 'none'` in `playwright.config.ts`
means a changed or missing picture fails and writes nothing. Retaking one is the explicit command
above, and it arrives in review as a diff of committed `.png`s.

One trap in `screens:update`, which is `--update-snapshots=changed`: "changed" is Playwright's own
comparison, and its default per-pixel `threshold` (0.2 in YIQ) is wide enough to swallow a *colour
move at constant geometry*. `ice`'s accent going `#b829ff → #c652ff` is under it. So after a token
re-derivation a shot with no layout change is not "changed", `screens:update` leaves the old file on
disk, and the committed picture quietly stops being a picture of what ships — `strip-edit` was
exactly that case. Retaking after a colour-only change is `npm run screens -- --update-snapshots=all`.
The default stays `changed` on purpose: `all` rewrites every file whether or not it moved, and a
handful of antialiased pixels differ run to run (five, on the `↺ defaults` control's left border),
so `all` churns bytes that `changed` correctly ignores.

## What a reviewer is looking for, everywhere

Before the per-shot list, four things that apply to all eight — these are the failures the suite
exists for, and they are what a *wrong* baseline would look like:

1. **Collapsed spacing.** The space scale is named by role (ADR 0030) — `hairline · tight · item ·
   group · stack · section` — and every size name it replaced is banned rather than merely gone. So
   `gap-tight` is a key and `gap-2xs`, `gap-3xs` and every `p-sp-*` are not, and Tailwind answers an
   undefined step by generating no class at all. The symptom is a row whose items touch, or a panel
   with no padding on one edge. Look at the gaps between the Preset chips, between the tab labels,
   and inside the settings fieldsets.
2. **A surface that isn't there.** `bg-surface` and `bg-elevated` are not the utilities —
   `bg-bg-surface` and `bg-bg-elevated` are — and the short spellings render as *transparent over an
   already-dark parent*, which is exactly what fooled everyone until ADR 0024's promotion read every
   colour class in the deck. The symptom is a panel that looks flat where it should be a step
   lighter than its ground. Look for the Strip reading as a distinct plane from the canvas above it.
3. **An overlay with no ground.** ADR 0013. ASCII//Convert's overlays carry no background *because*
   `paintFrame()` fills the canvas with `--void` first — so the thing to check is that premise:
   the letterboxed area around the art is flat near-black, not the page showing through.
4. **A Theme that half-applied.** Any violet left in a `kuang` shot is a token that did not resolve.

---

## The empty state

### `empty-state-linux.png` — the opening screen, `ice`

The one surface every visitor sees and the only one with no Source in it. It pins the three things
that are on screen before anything else exists: the header — the title and **three** controls now,
`configure ai`, the Theme control, and the sound control the kit gives every workspace it reaches —
the drop hero, and the footer, which is the only screen the footer appears on at all, because `App`
hides it the moment a Source loads.

**Look for:** the hero is two panels of the same height with the word `or` centred between them,
each panel's border complete on all four sides, and the pair centred in the field. Inside the left
one the arrow glyph, "drag & drop or click to upload" and `jpg · png · webp` are stacked with air
between them, not touching; the right one the same with `use webcam` and `live source`. The header's
rule runs the full width and the footer's sits on the bottom edge, `source code → author →` at one
end and `about` at the other. This is the reference for what `ice` is — if the accent here (the
arrow, the `configure ai` ring, the title) is not violet, nothing else in this set means anything.
The violet is the **re-derived** one, `#c652ff` rather than the `#b829ff` the deck shipped for a
year, so it reads a step brighter than it used to; the upload arrow is the cleanest place in the set
to read it.

This is also the one shot where the header is the whole subject, so it is where to check that its
three controls still fit: `configure ai`, `◐ ice` and `● sound` on one line at the right end, none
clipped and none wrapped under the rule. The sound control is the newest of the three and the one a
header that ran out of room would drop.

### `empty-state-kuang-linux.png` — the same screen, `kuang`

The Theme check with the fewest moving parts. Same DOM, same layout, a different semantic layer —
so this picture and the one above must differ **only** in colour, and every accent in it must have
moved together.

**Look for:** pixel-for-pixel the same geometry as `empty-state-linux.png` — any difference in
position or size here is a Theme leaking into layout, which a Theme is not allowed to do (ADR 0024:
a Theme varies hue and surface and nothing else). Then: no violet anywhere, the title, the upload
arrow and the `configure ai` ring all carrying the new accent rather than one of them being left
behind, and the footer's link row still readable against the new ground. The sound control is here
too and must have moved with the rest — it is kit chrome like everything else in that row.

Note that `#417` re-derived **`ice`'s** accent and no other Theme's, so this picture's accent is
unchanged from the set's first take while its `ice` counterpart's moved. The two shots parting
company in exactly that way is the expected reading, not a discrepancy.

---

## A Source under a known Preset

Both shots are the deck's committed reference plate (`scripts/glitch/reference-plate.png`, ADR 0028)
with the `Matrix Terminal` Preset applied — a named look, so the art is the same art next time. No
webcam, no Seed, no timestamp anywhere in these.

### `source-matrix-terminal-linux.png` — canvas and Strip, `ice`

The whole program in its working state: converted art on the canvas, the `clear source` overlay on
top of it, the Control Strip below with PRESETS active — the `↺ defaults` reset leading the row, and
ten chips after it each showing a real conversion.

**Look for:** the art is contained, not stretched — the fit is aspect-ratio `contain` (ADR 0010), so
the letterboxing left and right should be even, and the plate's skyline should read as a skyline.
The letterbox is flat `--void` near-black with nothing showing through it; that is ADR 0013's
premise for this program and the reason its overlays carry no background of their own. The
`live source` / `clear` pair over the top-right of the canvas is legible where it sits. Every one of
the ten Preset chips has a picture in it, not a bare name — a chip with no thumbnail means the
derivation failed silently — and the ten pictures are visibly *different from each other*, which is
the only thing that says each chip ran its own conversion rather than ten copies of one.
`Matrix Terminal` is the selected chip and reads as selected. `Truecolor`, the tenth, is now cut off
at the Strip's right edge: the row is a horizontal scroller and `↺ defaults` took the width the last
chip used to have. That is the row scrolling, not a chip overflowing its container — the check is
that the clip lands on the *edge of the scroller* and nothing paints past it.

### `source-matrix-terminal-kuang-linux.png` — the same state, `kuang`

The most load-bearing pair in the set, and the one to spend the most time on. ADR 0024's central
rule is that **a Theme reaches everything the deck drew and stops where the user's pixels begin** —
it is ADR 0013's line reused. This picture and the one above are the only test of it that exists.

**Look for:** the canvas content — the converted art itself, and the ten Preset thumbnails, which
are conversions too — must be **identical** to the `ice` shot, down to `Silkscreen`'s orange sun and
`Duotone`'s magenta. `Matrix Terminal` is green-on-black because that is what the Color Mode says,
and a Theme is not allowed to repaint it. Everything around it — header, Strip, chip borders, the
selected chip's ring, the tab underline, the `live source` / `clear` overlay — must have moved to
the new Theme. A recoloured canvas is a Theme that crossed the line; a violet chip border is a Theme
that did not reach far enough. Both are failures and they look nothing alike.

"Identical" here is meant literally and is worth checking as bytes rather than by eye. In this pair
it holds exactly: the canvas is the same pixel for pixel from the row under the header's rule to the
row above the Strip, the **only** exception being the rectangle the `live source` / `clear` overlay
occupies in the canvas's top-right — chrome drawn over the picture, which is supposed to recolour.
Across the chip row the ten thumbnails are the same pixel for pixel too, and every pixel that does
differ between the two shots is chip border, chip ground or the gap between chips. The tenth
thumbnail is clipped by the scroller in both, at the same column.

---

## The Control Strip, one shot per tab

All three are `ice` with the same Source and Preset, framed on the Strip alone — the tab row and
the panel under it, without the canvas above. Cropping to the Strip is deliberate: the Strip is
where almost every control on the deck lives (ADR 0020), and a full-page shot would let a
twelve-pixel spacing regression in a fieldset hide inside a picture that is mostly artwork.

### `strip-presets-linux.png` — the PRESETS tab

The `↺ defaults` reset, then ten chips in a scrolling row, each a thumbnail over its name.

**Look for:** even gaps between chips — this row is the densest use of the spacing scale in the
program and the first place a dropped `gap-*` would show. Every chip the same height, with the
thumbnail above the name rather than overlapping it. The selected chip (`Matrix Terminal`)
distinguishable from the other nine by more than a hair. And, as above, ten thumbnails that differ
from one another.

The row no longer ends inside the Strip, and that is the change to read rather than the regression
it would have been. `↺ defaults` takes the width at the head of the row, so `Truecolor` is clipped
mid-chip at the right edge. The scroller is doing its job — what to check is that the clip is a
*clean cut at the container's edge* with nothing painted past it, that every chip before it is whole,
and that `↺ defaults` sits on the row rather than over the first chip.

### `strip-edit-linux.png` — the EDIT tab

The tab opens on the `charset` tool, so the picture is the twelve curated Charsets grouped under
five headings (ASCII GRADIENT · UNICODE BLOCKS · WRITING SYSTEMS · SHAPES · SPECIALIZED) plus the
authored-charset field under CUSTOM, over the row of seven tool chips that switch which control the
panel is showing.

**Look for:** each Charset chip shows its *name above its sample glyphs* — a chip where the two have
collapsed onto one line, or where the sample is missing, is the tightest stack in the program
losing a spacing step. The group headings are separated from the chips under them and from each
other. `katakana` is the selected chip, because `Matrix Terminal` is the applied Preset — if the
selected chip is a different one, the shot was taken in the wrong state and the whole Source pair
above is suspect too. The CUSTOM field (`darkest → lightest` placeholder) has a visible border
against the panel: it is the one control on the deck sized purely by its padding and its line box
(`support/accepted.ts`), so it is the most likely to look wrong. And the reset `↺` at the far right
is on its own, not overlapping the CUSTOM field.

This is the one shot in the set whose **geometry did not move at all** across the accent, the space
rename and the new header control — it is a colour-only diff, every element on the same pixel it was
on. So it is the cheapest place to read the re-derived violet on its own: the `edit` tab label, its
underline, the selected `katakana` chip and the selected `charset` tool chip, with nothing else
changing around them.

### `strip-out-linux.png` — the OUT tab

The terminal actions: the AI Config banner across the top, the PNG scale toggle with the canvas
readout beside it, and the three Exports with their captions.

**Look for:** the three Export controls sit on one line, each with its caption underneath and none
of them truncated. The `png scale` toggle reads as one group of three with `1×` selected. The
readout beside it (`1280×415`) is the canvas size at this viewport — a number here is fine, a
*clock* is not: nothing in this panel may count, and if something does the baseline will flake
rather than fail. The banner's dismiss `✕` is inside the banner, not colliding with
`configure AI`.

This is the tallest shot in the set and the only one whose **height changed**: the panel is eight
pixels deeper than it was, four from the banner's own padding and two from each of the two gaps
between its blocks, which is the space rename moving those three steps from 4px to 6px. Every block
kept its 44px row and its place in the order, so read this as three rows that grew apart, never as a
row that wrapped. The two containers here that *could* have wrapped are the ones to confirm by eye:
the `png scale` toggle is one line of three chips, and the three Exports are one line of three. The
readout dropping from `1280×423` to `1280×415` is the same eight pixels seen from the canvas's side
— the Strip took them.

### `strip-out-kuang-linux.png` — the OUT tab, `kuang`

The Theme check on the busiest panel, and the one with the most accent surface in it: this tab
carries the AI controls, which is where ADR 0009's "accent as small text" cases cluster.

**Look for:** the same geometry as `strip-out-linux.png` — again, colour only, including the eight
pixels of height both gained. Then read the accented labels (`AI Analyze`, `AI Config`,
`configure AI`, `export png`, the `1×` chip's ring) against their panel and ask whether they are
legible. They used to be *known* to sit under AA-small in `ice` and to be excused for it; #417
re-derived the accent so that they no longer are, and `support/accepted.ts` was emptied of every one
of them. So this pair is now read the other way round: the `ice` shot is the one that had to improve,
and what this picture guards is that `kuang` — which never needed the change — still clears the same
bar. Note what must **not** move with the Theme: `export txt` and `export html` are `info`, not
`accent`, and they stay cyan in both shots — a `kuang` picture where all three Exports are red is a
role that got collapsed into the accent.

---

## The three tests that are not pictures

`screens.spec.ts` carries three assertions with no baseline behind them, and all three are premises
the eight pictures are only worth anything under:

- **the run is in the environment the baselines were taken in.** The suite *skips* on a machine that
  is not Linux, because that is somebody running the wrong command. It *fails* on Linux with the
  wrong architecture, because that is a misconfigured job — and a job that went green having
  compared nothing is the one outcome worse than a red one.
- **the deck still ships no webfont.** If one ever lands, every baseline above becomes a picture of a
  font that is no longer what ships, and no amount of waiting on `document.fonts.ready` would have
  said so. The test fails with instructions to retake the set in the same change.
- **the committed baselines are exactly the declared ones.** Playwright fails a picture that changed
  and says nothing about a picture nothing takes any more. A `.png` orphaned by a deleted test is a
  file that can never go red — the screenshot version of the stale acceptance `support/accepted.ts`
  refuses to carry — so the directory must hold the declared set and nothing else. The list can only
  change on purpose.

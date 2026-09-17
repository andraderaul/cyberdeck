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

## What a reviewer is looking for, everywhere

Before the per-shot list, four things that apply to all eight — these are the failures the suite
exists for, and they are what a *wrong* baseline would look like:

1. **Collapsed spacing.** `gap-3xs` and `p-sp-3xl` are not keys in the preset, and Tailwind answers
   an undefined step by generating no class at all. The symptom is a row whose items touch, or a
   panel with no padding on one edge. Look at the gaps between the Preset chips, between the tab
   labels, and inside the settings fieldsets.
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
that are on screen before anything else exists: the header (title, Theme control, AI key control),
the drop hero, and the footer — which is the only screen the footer appears on at all, because
`App` hides it the moment a Source loads.

**Look for:** the hero is two panels of the same height with the word `or` centred between them,
each panel's border complete on all four sides, and the pair centred in the field. Inside the left
one the arrow glyph, "drag & drop or click to upload" and `jpg · png · webp` are stacked with air
between them, not touching; the right one the same with `use webcam` and `live source`. The header's
rule runs the full width and the footer's sits on the bottom edge, `source code → author →` at one
end and `about` at the other. This is the reference for what `ice` is — if the accent here (the
arrow, the `configure ai` ring, the title) is not violet, nothing else in this set means anything.

### `empty-state-kuang-linux.png` — the same screen, `kuang`

The Theme check with the fewest moving parts. Same DOM, same layout, a different semantic layer —
so this picture and the one above must differ **only** in colour, and every accent in it must have
moved together.

**Look for:** pixel-for-pixel the same geometry as `empty-state-linux.png` — any difference in
position or size here is a Theme leaking into layout, which a Theme is not allowed to do (ADR 0024:
a Theme varies hue and surface and nothing else). Then: no violet anywhere, the title, the upload
arrow and the `configure ai` ring all carrying the new accent rather than one of them being left
behind, and the footer's link row still readable against the new ground.

---

## A Source under a known Preset

Both shots are the deck's committed reference plate (`scripts/glitch/reference-plate.png`, ADR 0028)
with the `Matrix Terminal` Preset applied — a named look, so the art is the same art next time. No
webcam, no Seed, no timestamp anywhere in these.

### `source-matrix-terminal-linux.png` — canvas and Strip, `ice`

The whole program in its working state: converted art on the canvas, the `clear source` overlay on
top of it, the Control Strip below with PRESETS active and ten chips each showing a real conversion.

**Look for:** the art is contained, not stretched — the fit is aspect-ratio `contain` (ADR 0010), so
the letterboxing left and right should be even, and the plate's skyline should read as a skyline.
The letterbox is flat `--void` near-black with nothing showing through it; that is ADR 0013's
premise for this program and the reason its overlays carry no background of their own. The
`live source` / `clear` pair over the top-right of the canvas is legible where it sits. Every one of
the ten Preset chips has a picture in it, not a bare name — a chip with no thumbnail means the
derivation failed silently — and the ten pictures are visibly *different from each other*, which is
the only thing that says each chip ran its own conversion rather than ten copies of one.
`Matrix Terminal` is the selected chip and reads as selected.

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

---

## The Control Strip, one shot per tab

All three are `ice` with the same Source and Preset, framed on the Strip alone — the tab row and
the panel under it, without the canvas above. Cropping to the Strip is deliberate: the Strip is
where almost every control on the deck lives (ADR 0020), and a full-page shot would let a
twelve-pixel spacing regression in a fieldset hide inside a picture that is mostly artwork.

### `strip-presets-linux.png` — the PRESETS tab

Ten chips in a scrolling row, each a thumbnail over its name.

**Look for:** even gaps between chips — this row is the densest use of the spacing scale in the
program and the first place a dropped `gap-*` would show. Every chip the same height, with the
thumbnail above the name rather than overlapping it. The selected chip (`Matrix Terminal`)
distinguishable from the other nine by more than a hair. The row ending inside the Strip rather than
spilling past its right edge. And, as above, ten thumbnails that differ from one another.

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

### `strip-out-linux.png` — the OUT tab

The terminal actions: the AI Config banner across the top, the PNG scale toggle with the canvas
readout beside it, and the three Exports with their captions.

**Look for:** the three Export controls sit on one line, each with its caption underneath and none
of them truncated. The `png scale` toggle reads as one group of three with `1×` selected. The
readout beside it (`1280×423`) is the canvas size at this viewport — a number here is fine, a
*clock* is not: nothing in this panel may count, and if something does the baseline will flake
rather than fail. The banner's dismiss `✕` is inside the banner, not colliding with
`configure AI`.

### `strip-out-kuang-linux.png` — the OUT tab, `kuang`

The Theme check on the busiest panel, and the one with the most accent surface in it: this tab
carries the AI controls, which are where ADR 0009's "accent as small text" exceptions cluster
(`support/accepted.ts` carries four accepted nodes on this exact panel).

**Look for:** the same geometry as `strip-out-linux.png` — again, colour only. Then read the
accented labels (`AI Analyze`, `AI Config`, `configure AI`, `export png`, the `1×` chip's ring)
against their panel and ask whether they are legible. They are *known* to sit under AA-small in
`ice`, which is written up in #355; what this picture guards is that `kuang` did not make them
worse, and it is the only place anyone would notice. Note what must **not** move with the Theme:
`export txt` and `export html` are `info`, not `accent`, and they stay cyan in both shots — a
`kuang` picture where all three Exports are red is a role that got collapsed into the accent.

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

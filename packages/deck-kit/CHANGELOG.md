# @cyberdeck/deck-kit

## 0.8.0

### Minor Changes

- d7f4e42: The press sound moves into the kit, on its own `@cyberdeck/deck-kit/sound` entry point.

  It was written in ASCII//Convert at #398 because one caller is a hypothetical seam (ADR 0014), and it
  crosses now that the hub, GLITCH//Studio and GOLEM//Console are callers two, three and four — the
  route `UpdateBanner` took, and the reason ADR 0029 asked for the move rather than birth in the kit:
  the bar is an **empty diff measured**, not predicted.

  **Measured, it was empty.** `git mv` of all seven files reported R100 with zero content lines — the
  mechanism, the sample, the recipe and the tests crossed byte for byte, because the `cyberdeck:sound`
  key was deck-wide and unqualified from its first line. The one part that did not cross unchanged is
  the mute _control_: it wore three typography constants from `apps/ascii/src/header-type.ts`, and no
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
  holds that no kit module outside a test _calls_ `installClickSound()`.

  **`assetsInlineLimit` ships beside `precacheShell`**, so the rule that keeps the sample out of the
  entry chunk is one definition and four references rather than four copies of one predicate.

- 42d3b96: `ice`'s accent is re-derived: `--violet` goes from `#b829ff` to `#c652ff` — the same hue and the
  same saturation, eight points brighter.

  The old value cleared AA-small on `--bg` and nowhere else (4.51:1, then 4.35:1 and 3.90:1), which
  ADR 0009 recorded and excused for two labels. Sixteen accent labels across four programs were
  sitting on lit surfaces by the time #329's guards could see them, and the survey behind #355 found
  that **all sixteen were `ice`-only**: the other six Themes already clear the floor on every ground
  they draw on. `ice`'s accent is the one that predates the Theme Contract and was never re-derived
  under it.

  It now measures 5.69 / 5.48 / 4.92 on the three surfaces, 5.21 on `--color-accent-bg` and 4.64 on
  the tightest ground it is actually drawn on — the accent ghost over `--bg-elevated`, which is why
  the value is not the bare-minimum `#c44dff` (that one lands on 4.49 there). Black on the accent, the
  one pair a brighter accent could have broken, improves too: 4.80:1 → 6.05:1. `--soft-violet` follows
  to `#df9eff`, keeping the accent-to-soft distance in the band the other six Themes sit in.

  **The Theme Contract's accent tier collapses to one.** It used to relax to WCAG 1.4.11's 3:1 off the
  base surface for one stated reason — demanding AA-small everywhere would have failed `ice` itself.
  That incumbent is gone, and what the tier bought was sixteen defects under a green guard. `--accent`
  is now held to AA-small on all three surfaces in every Theme; the roster's tightest is `ice` at
  4.92:1.

  **A third vocabulary guard.** Every colour in the Tailwind preset is `var(--token)` with no
  `<alpha-value>` placeholder, so Tailwind cannot parse it and silently drops any candidate carrying
  an alpha modifier: `bg-accent/20` emits nothing at all, and a thinned _border_ is worse, because
  Preflight has already painted one in its own grey. Seven were shipping. The guard fails the build
  with the class, the file and the line, like the hue and scale guards beside it — the deck tints with
  named tokens (`bg-accent-ghost`, `-dim`, `-soft`, and the `subtle`/`base`/`strong` border ladder),
  which are values the Contract can read, rather than with a slash.

### Patch Changes

- bf772a2: `.wav` joins the precached shell's classified extensions.

  The press sound (ADR 0029) is the first audio the deck emits, and `collectShell` refuses any file it
  cannot classify — so without this the build fails, which is the guard working rather than a bug. It is
  precached like the rest of the shell for the reason the classifier exists: the sample answers a
  gesture, and a shell installed without it would answer the first offline press with silence and
  nothing to say why.

- c80f78f: The space ruler is named by role rather than by size (ADR 0030). `--gap-*` and `--sp-*` — two
  rulers, fourteen names, six of them never used — become six: `--space-hairline`, `--space-tight`,
  `--space-item`, `--space-group`, `--space-stack`, `--space-section`, keyed into Tailwind as
  `gap-tight`, `px-item`, `py-section` and the rest. Each one names a relationship instead of a
  magnitude, so the name survives a change of value the way `text-accent` already does.

  The rename is clean; there is no alias window. The scale guard splits into two families — spacing
  and radius no longer forbid the same names, since `rounded-xs` stays real while `p-xs` is dead — and
  the spacing family bans the entire retired vocabulary, so `gap-sm` fails the build with the class,
  the file and the line rather than silently rendering nothing. `SECTION_ONLY_GAPS` and the
  `p-sp-3xl` trap it described are gone with the ruler.

  The one rule worth reading before reaching for a name: `hairline` is any measurement that sizes an
  overlay's _footprint_ over the user's picture — its inset from the canvas edge and the gaps inside
  the overlay row alike (ADR 0013, ADR 0021); `tight` is chrome measured against its own opaque
  background. That rule is what the old `xs` (4px) / `2xs` (6px) pair could never state, and closing
  that wart by construction is why the sixth role exists.

  Inside the kit, seven of the primitives' tightest classes move 4px → 6px: `HeaderButton`,
  `ThemeControl`, `ToggleGroup`, `Tooltip` and the toast stack. One of them is a wrapping row —
  `ToggleGroup`'s non-full-width layout — where the extra 2px can send a control to a new line on a
  narrow screen. Every other class in the kit is pixel-identical.

- 55c00ac: Two kit controls that measured under the 44x44 the deck holds itself to, found by #329's target
  guard and written up in #355.

  The **Theme popover's rows** drew 114x36 — `min-h-[36px]`, from before #288, which took twelve
  controls to the target and never reached inside a popover. They are a real 44px box now rather than
  a target overlay, and the rows being stacked 0px apart is the reason: a centred 44px overlay would
  reach 4px into each neighbour's, and two overlapping targets are a worse defect than one small
  target. The panel is absolutely positioned, so the 56px it grows by moves nothing else on the page.
  One fix, and it lands in all four workspaces that render the control — twenty-eight nodes.

  The **footer's `about` trigger** drew 37.4x44. #288 gave it a minimum height and never a width, so
  the width was whatever "about" happened to measure — precisely the defect #297 found in `Chip`. It
  takes `min-w-[44px]` and centres its label; `ml-auto` already held it away from the two links beside
  it, so the extra width costs the bar nothing.

## 0.7.2

### Patch Changes

- 7f2e2a1: The precached shell now classifies `.webp` as something the running program fetches, so a program
  whose interface is built out of images installs with them. The deck's first such images are
  GLITCH//Studio's Preset thumbnails: offline, a row of broken chips would be the one surface a
  casual creator is asked to choose a look from.

## 0.7.1

### Patch Changes

- 3f1a48f: `TOUCH_TARGET_OVERLAY` joins the public `/ui` surface. It was module-local while the kit's own
  Tooltip was its only caller — ADR 0014's bar is two real callers, not one — and GLITCH//Studio's
  Wipe handle is the second: a control standing alone on the user's artwork, drawing smaller than 44px
  in both axes, which is the exact shape the constant exists for. No behaviour changes; the two
  constants it sits beside are unmoved.

## 0.7.0

### Minor Changes

- 10acf75: The attribution bar becomes a kit primitive, and the hub grows one.

  ASCII//Convert and GLITCH//Studio had converged on the same footer — an empty diff but for the
  repository each links to — which is ADR 0014's bar for extraction rather than mere duplication. The
  hub made the third caller, so `Footer` moves into `deck-kit/ui`: `sourceHref` is a prop because
  ASCII//Convert's repository predates the monorepo, and `onAbout` is optional because the hub has no
  About modal to open.

  The hub's bottom edge was a single line of text; it now carries the same `source code →` and
  `author →` the programs do, at the same 44px targets. Nothing changes for ASCII//Convert or
  GLITCH//Studio — same markup, same behavior, one copy fewer.

## 0.6.0

### Minor Changes

- 5df832a: The precached shell crosses into the kit. `useAppUpdate` and `UpdateBanner` are now
  `@cyberdeck/deck-kit/pwa`, and the service worker and its fetch policy live beside them. It arrived
  in ASCII//Convert (ADR 0027) and moved here when the other three programs asked for the same thing —
  an empty diff apart from the cache prefix, which is the bar ADR 0014 sets.

  The Vite plugin that compiles a program's worker moved too, to `scripts/precache-shell.ts`, but it
  is deliberately **not** a subpath export: a `vite.config.ts` must reach it by relative path. Vite
  bundles a relative config import, but leaves a bare specifier for Node to `import` at runtime, and
  Node cannot load the `.ts` source this package ships. The package name would work only on a Node new
  enough to strip types and fail on the rest, so the export is left off on purpose. See the kit's
  README.

  `HeaderButton` rises into `@cyberdeck/deck-kit/ui` on the same move. The offer bar's one control is
  that shape, which makes the bar its second caller — the trigger ADR 0014 wrote for it.

  A program now becomes installable with a hand-written `manifest.webmanifest`, one line of Vite
  config naming its cache prefix, and the two lines that render the offer bar. The worker brings a
  third TypeScript project with it (`tsconfig.worker.json`), because `WebWorker` and `DOM` cannot share
  one — that is one such file for the deck instead of one per program.

## 0.5.2

### Patch Changes

- 0dc87b9: `Chip` holds 44px on both axes, not just height. It pays for its target in layout rather than in an
  overlay, because it stands in a scrolling row of its own kind where a centred overlay would reach
  into its neighbour's — but only `min-h` was ever spelled, and a Chip is as wide as its label. Three
  in the deck were short enough to sit under the target: ASCII//Convert's `1×` / `2×` / `4×` PNG scale
  chips at 31px, GLITCH//Studio's `VHS` Preset at 38px, and its add-effect `+` at 29px above `sm`.

  `justify-center` comes along because a stretched Chip's slack would otherwise fall entirely to one
  side of a label that no longer fills it.

## 0.5.1

### Patch Changes

- 81b8731: Icon-only controls draw their glyph at 18px, from one constant (`ICON_GLYPH_SIZE`). The 44x44 target
  landed without the mark inside it changing, so a control could be fully operable and still read as
  unpressable — an 11px glyph adrift in a 44px box. Covers the kit's tooltip trigger, modal close and
  toast dismiss, GLITCH's duplicate / remove / add and its Randomize and Re-roll below `sm`, and
  ASCII//Convert's AI-config dismiss.

  Controls over the canvas are deliberately untouched: there the backdrop is the user's artwork
  (ADR 0013) or the piece itself (ADR 0021), and growing that chrome charges the work for its own
  controls — the same reason those controls buy their target as an overlay instead of in layout.

## 0.5.0

### Minor Changes

- f79c3fe: Every control in the kit now answers a 44x44 pointer target. The modal's close button, the toast's
  dismiss and the tooltip's info trigger were all icon-only with no padding — the tooltip's was about
  7x11px, roughly a twenty-fifth of the area it should offer — and the Control Strip's tabs sat at
  ~28px despite being bottom-anchored, squarely in the thumb zone.

  The modal's close button also gains a spoken name: `✕` is punctuation, and a screen reader reading
  it out says nothing about what the control does.

  Where a control cannot pay for the target in layout, it takes it as an invisible overlay instead:
  the tooltip sits in a Slider's label row, where a real 44px box would triple the row's height and
  push the params it labels off a phone.

  `TOUCH_TARGET_HEIGHT` and `TOUCH_TARGET_ICON` are new exports for the programs that need the same
  bargain over a canvas. The first buys height without ever growing sideways, so two neighbouring
  controls in a row cannot end up claiming the same pixels — which is the failure a centred overlay
  would introduce, and the reason that variant stays private to the kit. The second adds the real
  width the first tells you to pair with, for a control that also draws narrower than the target.

  Both open with `relative` to anchor the overlay, so a control that positions _itself_ has to name
  its own `absolute` after the constant: `cn` resolves a position conflict in favour of the last one
  named, and putting it first drops the control back into the flow.

### Patch Changes

- f79c3fe: Three accessibility fixes at the level where a control is either operable or it is not.

  The Source Image drop zone hid its file input with `display: none`, which is neither focusable nor
  in the accessibility tree — and a label cannot take focus in its place. Since the drop zone is the
  deck's single Source Image entry point, that left keyboard and screen-reader users with the webcam
  as the only way in. The input is now visually hidden but reachable, and the zone shows the focus it
  receives.

  `ToggleGroup` spelled its selected option in colour and border alone, so a screen reader heard three
  buttons and no answer; each option now reports whether it is the one in force. The group also takes
  its name from a legend rather than an `aria-label`, which a fieldset is spec'd to do and screen
  readers honour more consistently.

- f79c3fe: The Control Strip's tabs now behave the way `role="tab"` promises: the Strip is a single tab stop,
  the arrows move along the row, Home and End jump to either end, and Enter or Space selects. Moving
  through the tabs deliberately does not swap the panel underneath — a tablist that selected on
  arrival would change what you are looking at while you were only passing through.

  Two things also stop talking over the interface. A toast's variant glyph is decoration, but it was
  the first thing its alert announced, so every error opened with "multiplication x". And the modal's
  click-away backdrop reached a screen reader as a full-viewport button with no name at all; it is
  pointer scenery now, with Escape still closing from the keyboard.

## 0.4.0

### Minor Changes

- 57678dc: The `Modal` primitive crosses the seam into the kit (ADR 0014): it was ASCII//Convert's local
  dialog, and GLITCH//Studio's new About modal is the second real caller, so it moves verbatim to
  `@cyberdeck/deck-kit/ui` over the already-shared `useDialog` hook. It also gains a mobile fix — the
  dialog now caps its height to the viewport and scrolls internally, so a tall modal no longer
  overflows and clips its own title on a short screen. The overlay picks up padding as part of that
  fix, so on a screen narrower than the `cyber` variant's own max-width every dialog — the API key and
  Analysis modals included — is now inset from the edge instead of running flush to it.

## 0.3.2

### Patch Changes

- 4886d40: The Theme picker's trigger gets the horizontal room its pill shape needs. It is 44px tall for the
  touch target, so the pill radius clamps to 22px, and with 4px of padding on each side a short name
  like `ice` came out roughly as wide as it was tall — a circle with a few pixels of straight edge
  rather than a pill. `px-md` gives the label room on either side, so the shape reads as intended at
  every Theme name in the roster.

## 0.3.1

### Patch Changes

- 4627ac3: The Source Image drop zone lights its border on hover, matching the webcam panel it sits beside in the empty-state hero. Until now only the drop target reacted to a drag, so the left half of the hero read as dead to the mouse while the right half answered.

## 0.3.0

### Minor Changes

- f103199: The Theme roster grows to seven and the picker becomes a popover (ADR 0024). `ice`, `construct` and
  `chiba` are joined by four drawn from the Sprawl trilogy's interior vocabulary:

  - `kuang` — Neuromancer's Kuang Grade Mark Eleven icebreaker: arterial red on near-black. The accent
    owns red, so danger vacates to hot magenta — the one palette where a role had to move to make room
    for the accent, and the tightest against the contract because of it.
  - `ougou` — Count Zero's Ougou Feray, the loa of iron and technology: a cool blued-steel field under
    a warm ember accent.
  - `solitude` — Mona Lisa Overdrive's Dog Solitude, the toxic junkyard: rust corrosion under a sickly
    chem-yellow warning.
  - `onyx` — the deck with the neon off: silver on true black, colour spent only on genuine status.

  Each new Theme is one semantic-layer block and nothing else — the tints derive and the component
  tokens point at roles — and each cleared the Theme Contract before it shipped. The contrast guard
  discovers Themes from the stylesheet, so all four are held to the full contract with no change to
  guard code.

  `ThemeControl` stops cycling and becomes a popover: the trigger opens a panel that lists the whole
  roster, marks the Theme in force, and lets a user pick one by name. It opens, moves and dismisses by
  keyboard, returns focus to the trigger on close, and carries accessible names for the panel and each
  option. The four-Theme cycling ceiling — a roster-size assertion that existed to force exactly this
  migration — is retired now that the control no longer trades discoverability for width; `ice`-first,
  default and named-once still hold in their own tests.

  The picker hook's interface changes to match: `useTheme` exposes the Theme in force, a
  `setTheme(theme)` action, and the roster itself so the popover has one source for its list. The
  `nextTheme` cycling helper is gone. Resolution of an absent or unrecognised stored value to `ice` is
  unchanged, so a retired Theme name still falls back rather than leaving an unstyled deck.

## 0.2.0

### Minor Changes

- abed3c7: The visual language becomes a set of named Themes (ADR 0024): `ice` — the look the deck shipped
  with, named for the first time — plus `construct` (green phosphor) and `chiba` (grey and
  sodium-vapour amber). All three are dark; the deck has no modes, it has Themes.

  A Theme redefines the semantic layer and nothing else. The tinted backgrounds derive from their
  source hue with `color-mix()`, and the border, card, button and input token families now point at
  roles instead of primitives, so a new look is a block of about twenty-five values.

  New: `ThemeControl` (a header control that cycles), the roster and its resolution rule at
  `@cyberdeck/deck-kit/theme`, and the roles the deck had drawn without naming — `--color-phosphor`,
  `--color-link`, `--color-hit` and `--color-miss`.

  The literal hue names — violet, cyan, hot-pink, electric, void, abyss, shadow, slate, muted, dim,
  ghost — are gone from the Tailwind preset. They were the shorter of two spellings, which is why
  half the deck kept reaching for them. Components name roles now.

  Three guards ship with it, all in the ordinary test command: a contrast guard that resolves the
  real token values and holds every Theme to a stated contract, a vocabulary guard that fails with
  the class, file and line if a retired name comes back, and a roster guard that keeps the
  TypeScript, the Theme blocks and each program's inlined pre-paint script in agreement.

  The vocabulary guard bans every primitive the stylesheet declares, derived from the stylesheet
  rather than listed by hand — a literal colour no Theme restates _is_ `ice`'s vocabulary, which is
  the definition that also catches `--white` and the two electric variants. Those never had a
  Tailwind class to lose, so a ban list written from the preset's removals walked straight past them
  while `var(--white)` pinned a rule to `ice` just as surely as `var(--violet)` would. It reads each
  program's `index.html` too, which is where a hue could be named before React exists.

  `--fg-on-accent` is new: a selection highlight is the only place the deck paints text on an opaque
  accent, and it is the one pair a Theme cannot get right by accident — whether the text wants to be
  lighter or darker depends on how bright that accent is. The contract pins it at AA-small.

  **Selected text changes in `ice`.** It was near-white on violet, which measures 3.80:1 and has never
  met the floor the rest of the palette clears. It is black on the same violet now, at 4.80:1. The
  Theme's colour is untouched; only the text standing on it moves.

## 0.1.0

### Minor Changes

- 4bd889a: The Control Strip's shell crosses into deck-kit as `TabStrip` (ADR 0020's extraction slice). With
  the Strip landed in both programs, the tablist markup, the selected-tab state and the single
  mounted panel were byte-identical — ADR 0014's "empty diff plus two real callers" met exactly. The
  tab set and the panels stay in each app: those are vocabulary and domain surface, and neither
  crosses the seam.

  `MobileBottomSheet` is removed from the kit. It lost its only two callers when the sheets died, and
  nothing on the deck references it.

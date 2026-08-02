// The sibling of `touch-target.ts`: that file sizes the box, this one sizes the mark inside it.
// Both exist because the two came apart — a control can hold the full 44x44 and still draw an 11px
// glyph in the middle of it, which is operable but does not read as pressable.
//
// Kept as a constant rather than a `text-md` spelled at each callsite for the reason `audit.ts`
// gives for its own gap: the scale guard covers spacing and borderRadius but not `text-`, which is
// `fontSize` ∪ `colors` ∪ `text-center` at once. A mistyped font step renders no class at all and
// nothing fails — the same silent failure the scale guard exists to catch, one layer over, and the
// one shape of it that guard cannot see. One constant means no program ever types a font step for a
// glyph, and `icon-glyph.test.ts` pins the step this one names to the preset.

/**
 * The size an **icon-only** control draws its glyph at: 18px, with the line box held to it.
 *
 * Icon-only is the whole condition, and it excludes two things. A *control* with a visible label
 * already has the word carrying what it does, and growing the punctuation beside it only unbalances
 * the line — so `✕ clear` and `◈ analyze` keep the text size they inherit. And a glyph that is no
 * control at all — a Toast's variant mark, a threat level, the `*` on a modified Preset — is
 * decoration beside its own text, so it takes the size of the text it decorates.
 *
 * 18px is ~41% of the 44px target, which is icon proportion rather than punctuation, and it stays
 * well under the `text-lg` / `text-3xl` that `SourceImageDropZone` and `EmptyStateHero` give a hero
 * glyph — those still outrank a control.
 *
 * `leading-none` rides along rather than being left to the caller: these glyphs sit in rows beside
 * 11px text (a Slider's label and its info trigger), and pinning the line box to the font is what
 * keeps such a row growing by the 7px of glyph and not by a multiple of it.
 *
 * **Never on a control over the canvas.** There the backdrop is the user's artwork (ADR 0013) or
 * the piece itself (ADR 0021), and `touch-target.ts` already explains why that chrome stays at its
 * drawn size and buys its target as an overlay: growing it charges the work for its own controls.
 * A bigger glyph grows the chrome, which is the same charge by another route.
 */
export const ICON_GLYPH_SIZE = 'text-md leading-none'

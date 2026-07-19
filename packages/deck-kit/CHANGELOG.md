# @cyberdeck/deck-kit

## 0.1.0

### Minor Changes

- 4bd889a: The Control Strip's shell crosses into deck-kit as `TabStrip` (ADR 0020's extraction slice). With
  the Strip landed in both programs, the tablist markup, the selected-tab state and the single
  mounted panel were byte-identical — ADR 0014's "empty diff plus two real callers" met exactly. The
  tab set and the panels stay in each app: those are vocabulary and domain surface, and neither
  crosses the seam.

  `MobileBottomSheet` is removed from the kit. It lost its only two callers when the sheets died, and
  nothing on the deck references it.

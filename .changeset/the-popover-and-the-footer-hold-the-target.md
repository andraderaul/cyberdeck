---
'@cyberdeck/deck-kit': patch
---

Two kit controls that measured under the 44x44 the deck holds itself to, found by #329's target
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

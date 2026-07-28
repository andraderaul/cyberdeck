---
'@cyberdeck/deck-kit': patch
---

The Theme picker's trigger gets the horizontal room its pill shape needs. It is 44px tall for the
touch target, so the pill radius clamps to 22px, and with 4px of padding on each side a short name
like `ice` came out roughly as wide as it was tall — a circle with a few pixels of straight edge
rather than a pill. `px-md` gives the label room on either side, so the shape reads as intended at
every Theme name in the roster.

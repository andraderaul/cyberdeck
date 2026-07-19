---
'@cyberdeck/golem': minor
---

New Console command: `load <name>` puts one of the vendored reference programs in the editor —
`hello_world`, `interruption`, `watchdog` or `fpu`. GOLEM's equivalent of the deck's presets,
expressed in the grammar this program already chose.

`load` with no argument lists what is available with a one-line summary each, and an unknown name
gets the nearest real one suggested, like any Console typo. It refuses while a Machine exists, so
running code can never change underneath you, and it asks for confirmation once before overwriting
a program you wrote yourself — the starter example and an already-loaded program are replaced
without ceremony, so `load watchdog` then `run` stays two commands from a cold start.

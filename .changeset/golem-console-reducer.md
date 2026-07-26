---
'@cyberdeck/golem': patch
---

Move the Console's control surface behind one pure reducer. The 18-arm command dispatch, its
ref-based state (the pending-load confirmation, the resume-skip PC, the cache mode) and the run
loop's per-tick decision were reachable only by driving the DOM; they now live in
`console-reducer.ts` as `reduceCommand`, `advanceOnce` and a shared `stepWithTrace`, each a pure
function over one `ConsoleModel` that returns the next model plus its lines, trace delta and typed
`Effect`s. `use-console.ts` keeps only the impurity — the model ref, the clock, the trace
accumulator, and an `runEffects` interpreter.

Behaviour is unchanged (`app.test.tsx` green), and the arms the integration tests could only reach
sideways — load confirmation, cache gating, the requireMachine guards, the resume-skip — now have
direct unit tests through the one interface.

# CLAUDE.md — GOLEM//Console

Guidance for Claude Code (claude.ai/code) when working in `apps/golem`.

This app is one program on the CYBERDECK deck — see the root `CLAUDE.md` for the monorepo
layout, the deck-wide comment convention, and the release ritual. Paths below are relative to
`apps/golem`.

Read `CONTEXT.md` for the domain glossary and `docs/ISA.md` for the encoding, the 42
instructions and the assembler syntax. `ISA.md` is the source of truth for the assembler and
the tests — do not re-derive semantics from memory.

## Status

**v1 complete** (#133, tickets #134–#146). You write assembly, `asm` it, and drive execution from
the Console while registers, memory, flags and the Terminal update beside you. All 42 instructions
execute; every vendored reference program assembles word-for-word to its `.hex` and traces
line-for-line against its `.out`.

**v2 complete** (#203, tickets #204–#211) — the whole of unit 2. Interrupts dispatch with
user-written ISRs (`isr`, `reti`, and `enai`, the assembler's only Macro); the memory-mapped
Watchdog and FPU tick one per Step and interrupt on their own; `load <name>` puts a reference
program in the editor; the DEVICES panel makes both devices watchable. All four unit-2 reference
programs are green on both oracles.

`step(machine)` returns `{ machine, events }` — a dispatch is not derivable from a state diff, so
it is reported. The trace formatter and the Console narration read that one stream.

Out of scope, and deliberately so: unit 3 (the cache), reverse execution, and video recording. Its
oracle traces are already vendored and consumer-less — see `__fixtures__/PROVENANCE.md`.

## Commands

Run from this directory (or use `--workspace @cyberdeck/golem` from the root).

```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build
npm run test       # vitest (watch)
npm run test:run   # vitest run
npx vitest run src/golem/assembler.test.ts   # run a single test file
```

Lint and format are repo-wide and run from the root: `npm run check`.

## Architecture

Single-page React/TS/Vite app. Fully client-side — no backend, no network. The core lives in
`src/golem/`, matching where the other programs put their pipelines.

**Five pure modules and one thin shell.** The same functional-core / imperative-shell seam the
other programs use, in a different currency: their core is a function over `ImageData`, ours is
`step(machine) → machine`.

- **Assembler** — `assemble(source) → Image | AssembleError[]`. The deepest module here, and the
  half that never existed in the reference material, so it is the highest-risk code in the app.
  Errors are a returned list carrying line numbers, never a thrown exception.
- **Machine** — `createMachine(image)`, `step(machine)`. Knows nothing about time, the DOM or
  formatting. That purity is what makes "program X halts with R2 = 30" a test with no timers.
- **Trace formatter** — `formatStep(before, after) → string`. Deliberately *outside* `step`, so
  the log can be diffed against the reference emulator without its format becoming part of the
  machine's semantics.
- **Command parser** — `parseCommand(input) → Command`. Pure text → typed union; the component
  only dispatches.
- **Share codec** — `encode` / `decode` over the URL fragment.
- **Clock driver** — a hook wrapping rAF, intentionally shallow. It decides how many `step` calls
  fit in a frame and nothing else. Because it always yields, an infinite loop in user code cannot
  freeze the tab and `stop` always lands.

## Rules that are easy to break

**The three states are enforced, not documented.** `Source → Image → Machine`. The editor is
writable only while no Machine exists; `asm`/`run` freeze the Source and instantiate the Machine;
`reset` destroys it and restores editing. Divergence between the displayed source and the
executing code must be impossible by construction — never fixed by synchronising two copies.

**The Console is the only control grammar (ADR 0018).** No run/step/reset buttons, no `advanced`
disclosure. Every surface other than the Source editor is read-only and never accepts a click.
`src/app.test.tsx` guards this. Discoverability is paid for explicitly instead: `help` on first
render, and did-you-mean on unknown commands.

**Terminal and Console are not synonyms.** The Terminal is diegetic — inside the machine, written
by the running program, memory-mapped at `0x0000888B`. The Console is outside it, where the
operator types. They never share a surface.

**A green diff against the oracle does not mean correct.** The fixtures exercise 7 of 11
branches; `blt`, `ble`, `bnz` and `bni` are executed by no reference program. The reference's
broken `ble` survived for exactly that reason. Those need hand-written tests — see the coverage
table in `docs/ISA.md` and `src/golem/__fixtures__/PROVENANCE.md`.

**Deck Kit is consumed, not extended.** Nothing is extracted into the kit from this app: per ADR
0011 and 0014, duplication stays as signal until a second caller proves the seam, and a program
this structurally different is the wrong place to guess at shared abstractions.

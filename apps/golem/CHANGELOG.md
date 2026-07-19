# @cyberdeck/golem

## 0.2.0

### Minor Changes

- 518ee99: Debugging at the points you care about. `break <line>` pauses a run when the machine reaches that
  line, `breaks` lists them and `unbreak` clears one or all. Breakpoints survive `reset`, since
  repeated debugging runs are the normal case.

  The locked Source becomes a listing with a gutter: the line the PC is on is marked and follows it
  through a run, a step or a pause, and breakpointed lines carry a dot. Both are read-only marks —
  a breakpoint is set with a command, never by clicking.

- 518ee99: Execution you can watch. `run` executes continuously, animated at a readable default rate so you
  see the PC descend through the code rather than a final state appear. `clock N` sets the rate and
  `clock max` runs at the frame budget's limit.

  The driver always yields to the browser between frames, so an infinite loop in user code cannot
  freeze the tab and `stop` always lands — verified in a real browser at ~600k steps/second, where
  the page still responds in a millisecond. The Clock is presentation state: its rate survives
  `reset`.

- 518ee99: With no buttons to click, discoverability is paid for explicitly. `help` is named in the
  Console's first line and prints the full command reference; `help <command>` explains one in
  detail. Up and down arrows walk Console history, which is the real rhythm of using this — `step`,
  `reg r1`, `step`.

  The example program in the editor demonstrates labels, data, a quoted string and the Terminal, so
  there is something worth guessing the syntax from before writing anything.

- 518ee99: The assembler handles the full ISA: all 42 instructions in their three encoding forms, labels
  resolved in two passes to word indices, bare data as decimal, hex or NUL-terminated strings with
  escapes, and the readable mnemonic aliases (`jmp`, `halt`, `load`) alongside the canonical names.

  Errors come back as a list carrying line numbers — undefined label named, invalid register,
  out-of-range immediate, malformed string — so a program with three typos takes one pass to fix.

  All five inherited reference programs now assemble word-for-word equal to their `.hex`.

- 518ee99: The machine executes all 42 instructions: arithmetic and logic with correct flags, word and byte
  memory addressing, the stack through `push`/`pop`, `call`/`ret`, and the memory-mapped Terminal.

  Every vendored reference program now runs step-for-step identically to the trace the reference
  emulator produced — 846 assertions over 644 executed instructions. `ble` implements `LT ∨ EQ`,
  diverging deliberately from the reference's typo, and it is covered by hand-written tests along
  with `blt`, `bnz` and `bni`, which no reference program executes.

- 518ee99: `share` produces a URL carrying your program, compressed into the fragment and copied to the
  clipboard. Opening it loads the program into the editor, unlocked and ready to run.

  Your work also survives an accidental reload. A share link takes precedence over saved work — a
  link someone sent you is an explicit request to see _their_ program.

  Everything is local: the fragment is never sent to a server even when the URL is requested, so
  the code you write never leaves your machine.

- 518ee99: Seeing what the machine did. `reg <name>` prints one register in hex and decimal; `mem <start>
[count] [words|bytes]` dumps a range as words or as bytes, so the view matches the instruction
  that wrote the region. A byte dump carries an ASCII gutter.

  The flags stop being a hex blob: a Flags panel names EQ, LT, GT, ZD, OV and IV and lights the
  ones that are set, and a Memory panel follows the machine as it runs. Everything stays read-only.

- 518ee99: The machine's Terminal is visible. A program that writes bytes to the memory-mapped Terminal
  address prints characters into a surface of its own, separate from the Console — everything the
  Console shows is the tool talking to you, everything the Terminal shows was written by your
  program.

  The starter program now prints "Hello from GOLEM", so the deck demonstrates the whole loop —
  labels, data, a string, byte addressing and the device — on first load.

- 518ee99: Getting work out of the deck. `export hex` downloads the assembled Image in the reference `.hex`
  format so it can run in another implementation of this ISA; `export trace` downloads the
  execution log so it can be diffed against a reference emulator.

  The trace formatter is a pure function kept deliberately outside `step`, which is what lets the
  log be compared against the oracle without the log's format becoming part of the machine's
  semantics. A test asserts every vendored program's trace diffs clean against its `.out`.

- 518ee99: GOLEM//Console executes its first program. Write assembly in the Source editor, `asm` it, and
  `step` through it while the register panel updates — a narrow slice of the ISA (`add`, `addi`,
  `int`) carried end to end.

  The three-state model is enforced rather than documented: the editor is writable only while no
  Machine exists, `asm` freezes the Source and instantiates one, and `reset` destroys it and gives
  editing back. The Console is the only control grammar — no buttons, and unknown commands suggest
  the nearest real one.

### Patch Changes

- 518ee99: Check breakpoints before stepping, so a breakpoint on the line the PC starts at pauses a fresh `run` instead of being silently executed through. Resuming still moves off the line it stopped on.
- 518ee99: Editing the Source clears the share fragment from the address bar, so a reload restores the newer work instead of silently reverting to the stale shared snapshot.
- 518ee99: The Console log, the Terminal and the current-line marker now follow new content instead of scrolling once on mount, and each effect waits until there is something to scroll to.
- 518ee99: GOLEM//Console now reads as part of the deck rather than a separate thing sharing its colours:
  the same header shell, border and spacing scale as ASCII//Convert and GLITCH//Studio.

  On a small screen the panels stack into one scrolling column instead of a squeezed desktop
  layout, so a shared link can be read and run on a phone. No horizontal overflow at any common
  width, and the Console input no longer autocapitalises the commands you type.

## 0.1.0

### Minor Changes

- 13ab30a: Scaffold GOLEM//Console — a Vite + React workspace on Deck Kit, with inert shells for the Source
  editor, Console, Registers, Flags, Memory and Terminal. No machine yet.

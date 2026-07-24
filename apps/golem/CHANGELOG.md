# @cyberdeck/golem

## 0.3.0

### Minor Changes

- 620bb3e: The FPU — the second Device, driven entirely by the program through memory-mapped `x`, `y`, `z`
  and `control` registers. Writing an operation to `control` starts work that costs cycles, consumed
  one per Step, and completion fires hardware interrupt 2. Faults — a zero divisor, an undefined
  operation — raise an error bit the program can read back.

  Devices are now intercepted on the machine's single memory-access path, so `ldw`, `stw`, `push` and
  `pop` all agree about them without four copies of the same check.

  `2_fpu` runs end to end, which makes all four unit-2 reference programs green — the whole of the
  unit, against the reference oracle.

- 620bb3e: ISRs are writable: `isr` and `reti` assemble and execute per the reference spec, and `enai` enters
  as the assembler's first macro — expanding to the two words the reference assembler emits, scratch
  register and all.

  The remaining software-interrupt causes land with them. A division by zero raises cause `0x01` and
  an invalid instruction cause `0x2A`, both gated on `IE`, and an invalid instruction names its PC in
  the trace. Malformed `isr`, `reti`, `int` and `enai` operands now fail at assemble time with a line
  number and a specific message.

  A breakpoint on an ISR line pauses a run inside the handler — an ISR is a line like any other, so
  debugging one needs no new grammar.

  `2_interruption` now assembles word-for-word to its `.hex` and runs trace-for-trace against its
  `.out`.

- 620bb3e: The DEVICES panel, where the invisible machinery becomes watchable: the Watchdog's counter
  descending a tick per Step beside its enable bit, and the FPU's x, y and z as decoded floats
  alongside the raw words they really are, with the in-flight operation and its remaining cycles.

  The IE flag joins the named-flags display, so "interrupts are off" is legible at a glance rather
  than something you deduce from a dispatch that never came.

  Read-only like every panel but the Source editor — and more strictly than most, since even the
  Console never writes a device register. Talking to Devices is the program's job.

- 620bb3e: A byte written to the Terminal now stays readable at its address, so a program can `ldb` back what
  it just printed. The Terminal is a device _and_ an address; the character still echoes to the
  Terminal panel exactly as before.

  Exported traces gained the reference emulator's `[TERMINAL]` section, which carries the program's
  output under the trace and only appears when the program printed something.

  With those two, `2_hello_world` — the first unit-2 reference program — assembles word-for-word to
  its `.hex` and runs trace-for-trace against its `.out`.

- 620bb3e: The Watchdog — the first Device with a clock. Its control register is memory-mapped at word
  `0x2020`, holding an enable bit and a countdown; a program arms it by writing both. The counter
  decrements once per Step, in lockstep with execution, and fires hardware interrupt 1 when it runs
  out, narrated on the Console and marked `[HARDWARE INTERRUPTION 1]` in the trace.

  `2_watchdog` now runs end to end, which makes the signature scene real: `load watchdog`, `run`, and
  watch an infinite loop lose to a countdown.

- 620bb3e: New Console command: `load <name>` puts one of the vendored reference programs in the editor —
  `hello_world`, `interruption`, `watchdog` or `fpu`. GOLEM's equivalent of the deck's presets,
  expressed in the grammar this program already chose.

  `load` with no argument lists what is available with a one-line summary each, and an unknown name
  gets the nearest real one suggested, like any Console typo. It refuses while a Machine exists, so
  running code can never change underneath you, and it asks for confirmation once before overwriting
  a program you wrote yourself — the starter example and an already-loaded program are replaced
  without ceremony, so `load watchdog` then `run` stays two commands from a cold start.

- 620bb3e: `int N` with a nonzero code now dispatches a software interrupt — the cause lands in `CR`, the
  interrupted PC in `IPC`, and the PC jumps to the software vector, gated on the `IE` flag. `int 0`
  still ends the simulation, and `halt` is still its alias.

  The Console narrates every dispatch on its own surface, naming the cause and the vector, so an
  interrupt taken mid-`run` is something you watch rather than deduce from a changed PC. Exported
  traces carry the reference emulator's `[SOFTWARE INTERRUPTION]` marker, so they stay diffable.

### Patch Changes

- 620bb3e: One hardware dispatch per Step. When the Watchdog and the FPU run out on the same Step, the
  Watchdog takes it and the FPU's interrupt stays pending, landing whole on the Step after — where
  before the second dispatch overwrote `CR`/`IPC` with the hardware-1 vector as the return address,
  losing the Watchdog's interrupt to a clobber inherited from the reference emulator.

  The DEVICES panel now shows the FPU registers' raw words in the machine's own value-dependent
  encoding, so the word beside `z = 19` is the `0x00000013` a program would actually read back.

- 620bb3e: `asm` and `run` refuse a Source that assembles to zero words — blank lines and comments produced
  an empty image without error, and `run` over it started a run that could never halt: every fetch
  of zeroed memory is an implicit nop, and no `int 0` ever arrives. The Console now answers
  `nothing to assemble — the Source has no instructions` and leaves the editor unlocked.

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

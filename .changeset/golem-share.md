---
'@cyberdeck/golem': minor
---

`share` produces a URL carrying your program, compressed into the fragment and copied to the
clipboard. Opening it loads the program into the editor, unlocked and ready to run.

Your work also survives an accidental reload. A share link takes precedence over saved work — a
link someone sent you is an explicit request to see *their* program.

Everything is local: the fragment is never sent to a server even when the URL is requested, so
the code you write never leaves your machine.

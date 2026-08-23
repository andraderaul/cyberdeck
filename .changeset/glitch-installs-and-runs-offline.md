---
'@cyberdeck/glitch': minor
---

GLITCH//Studio installs, and it runs with the network off. It always could — the Chain has only ever
been applied on your machine — but the browser was never told to keep the bytes. Now it is: a web app
manifest makes the program installable under its own mark, and a service worker precaches the whole
shell on the first visit, so the second one opens, takes an image or your webcam, and exports with no
network at all. Installed, it opens standalone on the same near-black the page paints.

A new version never takes over a session in progress. It installs quietly behind the one you are
using — a Live Source stays live, a Recording in flight is never yanked — and runs the next time you
open the program, or right away if you take the offer that appears under the header.

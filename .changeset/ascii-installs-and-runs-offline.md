---
'@cyberdeck/ascii': minor
---

ASCII//Convert installs, and it runs with the network off. It always could — nothing here fetches
anything at runtime, and the conversion has only ever happened on your machine — but the browser was
never told to keep the bytes. Now it is: a web app manifest makes the program installable under its
own mark, and a service worker precaches the whole shell on the first visit, so the second one opens
and converts with no network at all. Installed, it opens standalone on the same near-black the page
paints.

A new version never takes over a session in progress. It installs quietly behind the one you are
using — a Recording in flight is never yanked — and runs the next time you open the program, or
right away if you take the offer that appears under the header. The AI Analysis call is left alone
entirely: it is not this deploy's, so the worker never touches it, and no reply of your provider's
is ever served from a cache.

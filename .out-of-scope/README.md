# Out of scope

What the deck was offered and **refused**, and why.

A rejected enhancement leaves no trace anywhere else. It is not an ADR — most refusals decide
nothing new, they are an existing ADR being applied. It is not a `CONTEXT.md` — that describes what
the deck *is*, not what it declined to become. And a closed issue is only findable by someone who
already remembers it existed. So the reasoning evaporates, and in six months the same proposal
arrives reading as a fresh idea rather than a settled question.

This directory is where those answers go. One file per batch of refusals — a design exploration, a
mock, a round of feature requests — named for where the proposals came from.

**What belongs here:** a proposal the deck looked at and said no to, with the reason, and the ADR
named whenever the reason *is* an ADR. Those are the cheapest to lose and the most expensive to
re-litigate.

**What does not:** anything that decides something new about the deck — that is an ADR
(`docs/adr/`). Anything deferred rather than refused — that is an issue. And bare lists of "we
didn't build X": without the reason, a file here is worth no more than the closed issue it
replaces.

No template, no process. A heading, a table, and enough context that it reads cold.

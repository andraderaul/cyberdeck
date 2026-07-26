---
"@cyberdeck/sprawl": minor
---

SPRAWL//Atlas shareable link export (#230, ADR 0021 following GOLEM//Console) — the export is
*state*, not a file. A URL encodes the scale you slid to (and the basemap toggle), so the link opens
the recipient at the same point in the vertigo and they keep sliding from there. Deterministic,
because the dataset underneath is a fixed vendored snapshot (ADR 0022): the same link resolves to the
same map for everyone. The app boots from the URL and keeps the address bar synced live, so the link
is always current. A PNG of the current frame is a deliberately quiet secondary — a still for a
wallpaper — kept from becoming the reason nobody uses the link. This completes SPRAWL//Atlas v1.

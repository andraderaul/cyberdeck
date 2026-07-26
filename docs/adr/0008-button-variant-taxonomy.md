# ADR 0008 — Button variant taxonomy: the `record` variant

## Status

Accepted

## Context

The `Button` component had no variant for the "start recording" action. The `secondary` variant
(cyan, `bg-info-bg`) was used for both TXT Export and the Record button, conflating two semantically
different actions: a static export action and a live-feed initiation action.

The `record` variant introduced below is softer than `danger` — it shares the hot-pink hue but has
no background tint (`bg-transparent` vs `bg-danger-ghost`). This communicates that the action
initiates a live state without implying immediate destruction or urgency. Once recording is active,
the controls shift to `danger` (Capture, Stop), creating a coherent visual progression:
idle → initiation (`record`) → active (`danger`).

`secondary` is now exclusively the export/informational register (cyan). `record` and `danger` are
exclusively the live-feed register (hot-pink). These two groups do not overlap.

## Decision

Add a `record` variant — hot-pink, transparent background, 1px border:

```ts
record: 'border border-hot-pink bg-transparent text-hot-pink font-medium',
```

Use this variant for the `⏺ record` button in `DownloadBar`. The full variant taxonomy is now:

| Variant | Color | Semantic intent | Used for |
|---|---|---|---|
| `primary` | violet, 2px border, bg-accent-bg | Primary export action | PNG Export |
| `secondary` | cyan, 1px border, bg-info-bg | Secondary/informational action | TXT Export, AI retry |
| `danger` | hot-pink, 1px border, bg-danger-ghost | Active live / destructive | Capture, Stop recording |
| `record` | hot-pink, 1px border, bg-transparent | Live action initiation | Start recording |
| `analyze` | violet, 1px border, bg-accent-ghost | AI analysis action | Scan & analyze |
| `ghost` | base border, transparent | Neutral/utility | Camera switch |

## Considered Alternatives

- **Keep reusing `secondary` (cyan) for the Record button.**
  - *Rejected because:* it conflated a static export action with a live-feed initiation action, and
    mixed cyan (the export/informational register) into the live-feed workflow.
- **Reuse `danger` for the Record button.**
  - *Rejected because:* `danger`'s background tint (`bg-danger-ghost`) implies an active or
    destructive state; initiating recording should not carry that visual weight.

## Consequences

**Positive:**
- The Record button sits in the hot-pink register before recording starts, matching the Stop and
  Capture buttons shown during recording — the user sees the same color family throughout the
  live-feed workflow.
- Cyan (`secondary`) is now exclusively associated with export and informational actions; no
  live-feed control uses cyan.

**Negative:**
- The `danger` background tint (`bg-danger-ghost`) is now reserved for actions that are active or
  destructive (Stop, Capture during recording) — a standing constraint that must not be used for
  mere initiation.

## Related ADRs

- None.

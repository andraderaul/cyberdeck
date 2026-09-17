#!/usr/bin/env bash
#
# The visual regression suite, in the one environment its baselines mean anything in (#328).
#
# The deck ships no webfont — `--font-mono` names two families the repo does not contain, which
# ADR 0024 records — so every glyph in a baseline is the *system* monospace of the machine that took
# the picture. macOS draws Menlo and Linux draws DejaVu Sans Mono, so a baseline taken on a laptop
# is not a baseline CI can check, and no amount of waiting on `document.fonts.ready` reconciles the
# two. There is no honest version of this where local and CI compare pixels in different
# environments; there is only picking one environment and using it in both places.
#
# So: Playwright's own image, at the exact version `package-lock.json` resolves — read from the
# lockfile rather than written here, because a tag that drifts from the client is a whole class of
# confusing diff — on `linux/arm64`. The `Visual regression` job runs the same suite in the same
# image on an `ubuntu-24.04-arm` runner, so the two agree by construction rather than by hope.
#
# WHY arm64 AND NOT THE amd64 A RUNNER DEFAULTS TO. Chromium cannot run under qemu-user: the amd64
# image on an Apple Silicon machine aborts every browser launch with
# `qemu: Assertion failed: p_rcu_reader->depth != 0`. That was tried first, and pinning to amd64
# would have meant baselines nobody can take or look at outside CI — for a guard whose entire
# remedy is "open the picture and look". arm64 is native on this deck's machines and on a runner
# GitHub gives public repositories for free, so both ends are native and neither is emulated.
#
# The cost, stated rather than hidden: an x86 machine cannot take or check a baseline. It will skip
# with this script's name in the message, and CI is where the pictures get checked.
#
# Usage:
#   scripts/screens.sh                            check the committed baselines
#   scripts/screens.sh --update-snapshots=changed retake them (this is `npm run screens:update`)
set -euo pipefail

cd "$(dirname "$0")/.."

version="$(node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version")"
image="mcr.microsoft.com/playwright:v${version}-noble"

# A named volume over `/work/node_modules` so the host's tree — built for darwin-arm64, and useless
# in here — is shadowed rather than overwritten. `npm ci` every time: the install this suite runs
# against should be the lockfile's, not whatever the volume happened to keep.
exec docker run --rm --init \
  --platform linux/arm64 \
  --ipc=host \
  --volume "$PWD":/work \
  --volume cyberdeck-screens-node-modules:/work/node_modules \
  --workdir /work \
  "$image" \
  sh -c 'npm ci --no-audit --no-fund && npm run test:e2e:screens -- "$@"' screens "$@"

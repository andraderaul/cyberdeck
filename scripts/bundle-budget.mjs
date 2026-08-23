#!/usr/bin/env node
// The bundle budget's mechanism. The ceilings, and the design they encode, live in
// `bundle-budget.config.mjs` — read that header first; nothing here restates it.
//
// Runs on built output (`npm run build` first) rather than on the module graph, because gzipped
// bytes over the wire is the only number a visitor pays. Zero dependencies: `zlib` gzips, and the
// built `index.html` says which chunk is the entry. A size-limit-style package would buy a nicer
// table and a config format we already have, against the light-tooling stance (ADR 0011).
//
// Usage:
//   node scripts/bundle-budget.mjs                    check this build against the ceilings
//   node scripts/bundle-budget.mjs --root DIR         measure a build elsewhere (the base branch)
//   node scripts/bundle-budget.mjs --emit FILE        write the measurement as JSON, check nothing
//   node scripts/bundle-budget.mjs --baseline FILE    print the delta against an emitted measurement

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Matches what Vite prints at the end of its own build, so the two numbers can be read side by
// side: kB is 1000 bytes (not KiB), and the gzip level is zlib's default (not -9).
const BYTES_PER_KB = 1000

// biome-ignore lint/suspicious/noConsole: build-time CLI script — stdout is the deliberate output.
const write = (text) => console.log(text)
// biome-ignore lint/suspicious/noConsole: build-time CLI script — the failure goes to stderr.
const writeError = (text) => console.error(text)

/**
 * The ceilings are only meaningful on the Node in `.nvmrc`: zlib's deflate changed between 1.2.13
 * (Node 18) and 1.3.1 (Node 22), so the same bytes gzip to a different size. It is a fraction of a
 * percent — SPRAWL//Atlas measures 108.50 kB on 18 and 109.47 kB on 22 — but that is a fifth of its
 * headroom, spent on nothing. CI reads `.nvmrc` and is self-consistent; a developer on a system
 * Node is the one who would otherwise chase a number that never moved.
 */
function warnOnNodeMismatch() {
  let expected
  try {
    expected = readFileSync(join(REPO_ROOT, '.nvmrc'), 'utf8').trim().replace(/^v/, '')
  } catch {
    return
  }
  const expectedMajor = expected.split('.')[0]
  const runningMajor = process.versions.node.split('.')[0]
  if (expectedMajor && expectedMajor !== runningMajor) {
    writeError(
      `bundle-budget: running Node ${process.version} (zlib ${process.versions.zlib}), but the ` +
        `ceilings were measured on Node ${expectedMajor} from .nvmrc. zlib's deflate differs ` +
        'between them, so these numbers will not match the ones in bundle-budget.config.mjs.\n',
    )
  }
}

/** Gzipped kB, rounded the way the report and the ceiling comparison both read it. */
function kb(bytes) {
  return Math.round((bytes / BYTES_PER_KB) * 100) / 100
}

function gzippedBytes(path) {
  return gzipSync(readFileSync(path)).length
}

/**
 * The chunks the browser fetches before first paint: the module entry plus everything Vite
 * modulepreloads, which is exactly its set of static imports. Anything else under `assets/` is off
 * that path — reached through a dynamic `import()`, or emitted as a worker entry and fetched only
 * when its `new Worker` runs.
 */
function eagerChunkNames(html) {
  const names = new Set()
  for (const [, src] of html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)) {
    names.add(basename(src))
  }
  for (const [, href] of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)) {
    names.add(basename(href))
  }
  return names
}

function listAssets(dist) {
  const assets = join(dist, 'assets')
  try {
    return readdirSync(assets)
      .filter((name) => statSync(join(assets, name)).isFile())
      .map((name) => ({ name, path: join(assets, name) }))
  } catch {
    return []
  }
}

/**
 * One app's built output as gzipped bytes, split into `entry`, `lazy`, `css` and `other`.
 * `bundle-budget.config.mjs` is where the two-ceiling design and its rationale are recorded.
 */
function measureApp(root, app) {
  const dist = join(root, 'apps', app, 'dist')
  let html
  try {
    html = readFileSync(join(dist, 'index.html'), 'utf8')
  } catch {
    throw new Error(`no build at ${join('apps', app, 'dist')} — run \`npm run build\` first`)
  }

  const eager = eagerChunkNames(html)
  const chunks = []
  let entry = 0
  let lazy = 0
  let css = 0
  let other = 0

  for (const asset of listAssets(dist)) {
    const bytes = gzippedBytes(asset.path)

    if (asset.name.endsWith('.css')) {
      css += bytes
      continue
    }
    // Fonts, and anything else a future `import` puts through the bundler. Nothing emits one today
    // — #343's images are `public/` files, which land in dist's root, not here — but a category the
    // table omits in silence is worse than one that prints a zero, so they are reported unbudgeted
    // rather than dropped.
    if (!asset.name.endsWith('.js')) {
      other += bytes
      chunks.push({ name: asset.name, kind: 'other', bytes })
      continue
    }

    const kind = eager.has(asset.name) ? 'entry' : 'lazy'
    if (kind === 'entry') {
      entry += bytes
    } else {
      lazy += bytes
    }
    chunks.push({ name: asset.name, kind, bytes })
  }

  if (entry === 0) {
    throw new Error(`${app}: no entry chunk referenced by its index.html`)
  }

  chunks.sort((a, b) => b.bytes - a.bytes)
  return { entry, lazy, css, other, chunks }
}

/** Every `apps/*` workspace, so a new one cannot slip in without a ceiling. */
function measure(root) {
  const apps = readdirSync(join(root, 'apps'))
    .filter((name) => statSync(join(root, 'apps', name)).isDirectory())
    .sort()

  const report = {}
  for (const app of apps) {
    report[app] = measureApp(root, app)
  }
  return report
}

function signed(delta) {
  if (delta === 0) {
    return '0.00'
  }
  return `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`
}

function pad(value, width) {
  return String(value).padEnd(width)
}

function deltaCell(measuredBytes, baselineApp, key) {
  if (!baselineApp) {
    return 'new'
  }
  return signed(kb(measuredBytes) - kb(baselineApp[key]))
}

/**
 * The report a reviewer reads: measured against the ceiling, and — on a PR — against the base
 * branch, so the cost of the change under review is a number rather than an impression.
 */
function renderReport(report, budgets, baseline) {
  const columns = baseline
    ? ['app', 'entry', 'ceiling', 'Δ base', 'lazy', 'ceiling', 'Δ base', 'css']
    : ['app', 'entry', 'ceiling', 'lazy', 'ceiling', 'css']

  // The app column sizes to its contents: a workspace named longer than the header's own width would
  // otherwise run into the entry column and skew every row after it.
  const appWidth = Math.max(...Object.keys(report).map((app) => app.length), 'app'.length) + 2
  const widthOf = (index) => (index === 0 ? appWidth : 10)
  const row = (cells) =>
    cells
      .map((cell, index) => pad(cell, widthOf(index)))
      .join('')
      .trimEnd()

  const header = row(columns)
  const table = [header]

  for (const [app, measured] of Object.entries(report)) {
    const budget = budgets[app]
    const cells = [app, kb(measured.entry).toFixed(2), budget ? budget.entry.toFixed(2) : '—']
    if (baseline) {
      cells.push(deltaCell(measured.entry, baseline[app], 'entry'))
    }
    cells.push(kb(measured.lazy).toFixed(2), budget ? budget.lazy.toFixed(2) : '—')
    if (baseline) {
      cells.push(deltaCell(measured.lazy, baseline[app], 'lazy'))
    }
    cells.push(kb(measured.css).toFixed(2))
    table.push(row(cells))
  }

  // The rule spans the widest line, not the header — the header is the shortest row in the table
  // once its trailing padding is trimmed, and drawing to it under-draws the rest.
  const rule = '─'.repeat(Math.max(...table.map((line) => line.length)))
  const lines = ['BUNDLE BUDGET — gzipped, kB (1 kB = 1000 B)', '', header, rule, ...table.slice(1)]

  // Lazy chunks are reported one by one — the ceiling is on their total, but *which* chunk moved is
  // what tells a reviewer whether a deliberate split still holds.
  const sections = [
    ['lazy', 'lazily loaded, budgeted as a total and never charged to first paint'],
    ['other', 'neither JS nor CSS — reported, not budgeted'],
  ]
  for (const [app, measured] of Object.entries(report)) {
    for (const [kind, caption] of sections) {
      const matching = measured.chunks.filter((chunk) => chunk.kind === kind)
      if (matching.length === 0) {
        continue
      }
      lines.push('', `${app} — ${caption}:`)
      for (const chunk of matching) {
        lines.push(`  ${pad(chunk.name, 34)}${kb(chunk.bytes).toFixed(2)}`)
      }
    }
  }

  return lines.join('\n')
}

function findBreaches(report, budgets) {
  const breaches = []
  for (const [app, measured] of Object.entries(report)) {
    const budget = budgets[app]
    if (!budget) {
      breaches.push(
        `${app}: no ceiling in bundle-budget.config.mjs — a new workspace takes one deliberately ` +
          `(measured: entry ${kb(measured.entry).toFixed(2)} kB, lazy ${kb(measured.lazy).toFixed(2)} kB)`,
      )
      continue
    }
    for (const kind of ['entry', 'lazy']) {
      const measuredKb = kb(measured[kind])
      if (measuredKb <= budget[kind]) {
        continue
      }
      // A ceiling of zero is not an unset value — it records that the app had no chunk of this kind
      // when the budget was written. Saying so is the difference between reading this as a gate and
      // reading it as broken tooling.
      const zeroCeiling =
        budget[kind] === 0
          ? ` — ${app} shipped no ${kind} chunk when its ceiling was written, so this is its first ` +
            `one. If that split is intended, give ${kind} a real ceiling in the config`
          : ''
      breaches.push(
        `${app} ${kind}: ${measuredKb.toFixed(2)} kB gzipped against a ceiling of ` +
          `${budget[kind].toFixed(2)} kB — over by ${(measuredKb - budget[kind]).toFixed(2)} kB` +
          zeroCeiling,
      )
    }
  }
  return breaches
}

function parseArgs(argv) {
  const args = { root: REPO_ROOT, emit: null, baseline: null }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--root') {
      i += 1
      args.root = resolve(argv[i])
    } else if (flag === '--emit') {
      i += 1
      args.emit = resolve(argv[i])
    } else if (flag === '--baseline') {
      i += 1
      args.baseline = resolve(argv[i])
    } else {
      throw new Error(`unknown flag: ${flag}`)
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
warnOnNodeMismatch()
const report = measure(args.root)

if (args.emit) {
  writeFileSync(args.emit, `${JSON.stringify(report, null, 2)}\n`)
  process.exit(0)
}

let baseline = null
if (args.baseline) {
  try {
    baseline = JSON.parse(readFileSync(args.baseline, 'utf8'))
  } catch {
    // The delta is informational; a base branch that would not build must degrade to a report
    // without a delta, never to a green check that measured nothing.
    writeError(`bundle-budget: no baseline at ${args.baseline} — reporting without a delta\n`)
  }
}

const { BUNDLE_BUDGET } = await import(join(REPO_ROOT, 'bundle-budget.config.mjs'))
const rendered = renderReport(report, BUNDLE_BUDGET, baseline)
const breaches = findBreaches(report, BUNDLE_BUDGET)

write(rendered)

if (process.env.GITHUB_STEP_SUMMARY) {
  const verdict = breaches.length
    ? `**Over budget**\n\n${breaches.map((breach) => `- ${breach}`).join('\n')}`
    : '**Within budget**'
  writeFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Bundle budget\n\n\`\`\`\n${rendered}\n\`\`\`\n\n${verdict}\n`,
    { flag: 'a' },
  )
}

if (breaches.length > 0) {
  writeError(`\nOVER BUDGET\n\n${breaches.map((breach) => `  ${breach}`).join('\n')}\n`)
  writeError(
    'Either bring the chunk back under its ceiling, or raise the ceiling in ' +
      'bundle-budget.config.mjs — deliberately, in the diff, with the reason in the PR.\n',
  )
  process.exit(1)
}

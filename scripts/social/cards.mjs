// The four social cards, drawn (ADR 0005's split, applied to a build script): everything here is
// pure — data in, an HTML string out — so the artwork can be reasoned about and diffed without a
// browser anywhere near it. `scripts/social-assets.mjs` is the shell that rasterises what these
// return.
//
// One visual language, four voices. The field, the monospace, the wide-tracked wordmark and the
// lowercase caption are the same in all four; what fills the frame is each program doing its own
// job — ASCII//Convert makes a picture out of text, GLITCH//Studio breaks one, GOLEM//Console is an
// instrument panel you drive, SPRAWL//Atlas is light on a dark field.
//
// The hexes are literals rather than tokens, and that is not a lapse in the "name the role, not the
// hue" rule: a PNG has no stylesheet, no `var()` and no Theme (ADR 0024). A card is a *fixed
// rendering* of the deck's default look, `ice` — pinned here once, in one file, with the token each
// value came from named beside it. SPRAWL//Atlas' are the piece's own, which is a different claim:
// it takes no Theme at all (ADR 0021), so its cyan-on-dark is not a default, it is the work.

/** `ice`'s --void, and SPRAWL//Atlas' FIELD in `apps/sprawl/src/atlas/paint.ts`. */
export const FIELD = '#0a0a0f'

/** The `ice` palette, by the token each value is written as in `packages/deck-kit/src/tokens.css`. */
const INK = {
  surface: '#0f0f1a', // --bg-surface
  overlay: '#2a2a4a', // --bg-overlay, the deck's one border colour
  dim: '#6b6b9a', // --fg-dim
  muted: '#9898c0', // --fg-muted
  fg: '#c8c8e0', // --fg
  strong: '#eeeef8', // --fg-strong
  accent: '#b829ff', // --accent
  accentSoft: '#d888ff', // --accent-soft
  info: '#00e5ff', // --color-info / --color-phosphor
  infoSoft: '#80f4ff', // --color-info-soft
  danger: '#ff2d78', // --color-danger
}

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

// Departure Mono is referenced by name across the deck and bundled nowhere — `--font-display`
// already declares IBM Plex Mono as the face that stands in for it, so that is what the cards are
// set in. The shell refuses to render if the webfont did not load, so a card is never quietly
// rasterised in whatever monospace the generating machine happened to have.
const MONO = "'IBM Plex Mono', ui-monospace, monospace"

/** Deterministic noise. GLITCH//Studio's own model: every arrangement comes from a Seed, never from
 *  an ambient random, which is exactly what makes a regenerated card identical to the committed one. */
function seeded(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * A line of type. Every card's text goes through here so the face, the weight and the tracking are
 * decided in one place — the wordmark/caption relationship is the part that has to survive across
 * four different pictures.
 */
function text(content, { x, y, size, fill, weight = 400, tracking = 0, anchor = 'start' }) {
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="${weight}" letter-spacing="${tracking}" fill="${fill}" text-anchor="${anchor}" xml:space="preserve">${escapeText(content)}</text>`
}

/** The wordmark, set the way the deck sets it everywhere: uppercase, bold, widely tracked. */
function wordmark(name, { x, y, size, fill, tracking }) {
  return text(name, { x, y, size, fill, weight: 700, tracking })
}

function svgOpen() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">`
}

function field() {
  return `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${FIELD}" />`
}

/**
 * Which deck this program runs on, in the card's bottom-left slot.
 *
 * Two of the four cards use it. GOLEM//Console spends that slot on what the program is for
 * instead, and SPRAWL//Atlas has no slot to spend — the piece fills its frame, and a footer would
 * be chrome laid over a work (ADR 0021). A shared *helper*, not a shared *element*.
 */
function deckTag() {
  return text('CYBERDECK', {
    x: 72,
    y: CARD_HEIGHT - 46,
    size: 15,
    fill: INK.dim,
    tracking: 5,
  })
}

// ============================================================
// ASCII//Convert — a picture made out of text
// ============================================================

/**
 * ASCII//Convert's `classic` Charset with its darkest step — a blank — dropped. The program maps
 * the darkest cells to a space; the card maps them to no glyph at all, which is the same picture
 * and one less element per empty cell.
 *
 * Pinned to `CHARSET_MAPS.classic` by `apps/ascii/scripts/social-card.test.mjs`, so a Charset
 * edited in the program cannot leave the card printing a ramp the program no longer has.
 */
export const CLASSIC_CHARSET = '.:-=+*#%@'

const ASCII_GRID = { cols: 42, rows: 25, cellW: 12, cellH: 20, x: 636, y: 76 }

/**
 * A lit sphere, sampled onto the Charset. The card is not a picture *of* ASCII//Convert; it is a
 * frame of what ASCII//Convert produces, mapped through the same two axes the program maps through
 * — luminosity picks the glyph, and the glyph carries the colour of the light that made it.
 */
function asciiSphere() {
  const { cols, rows, cellW, cellH, x, y } = ASCII_GRID
  const centreX = x + (cols * cellW) / 2
  const centreY = y + (rows * cellH) / 2
  const radius = 236

  // Light from the upper left, and a view straight on — the half-vector is therefore constant.
  const light = normalise(-0.5, -0.66, 0.56)
  const half = normalise(light[0], light[1], light[2] + 1)

  const glyphs = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = x + col * cellW + cellW / 2
      const py = y + row * cellH + cellH / 2
      const dx = (px - centreX) / radius
      const dy = (py - centreY) / radius
      const outward = dx * dx + dy * dy
      if (outward > 1) {
        continue
      }
      const dz = Math.sqrt(1 - outward)
      const diffuse = Math.max(0, dx * light[0] + dy * light[1] + dz * light[2])
      const specular = Math.max(0, dx * half[0] + dy * half[1] + dz * half[2]) ** 30
      // A faint terminator rim so the dark limb still carries a glyph instead of falling out of
      // the grid — the sphere has to read as round at thumbnail size.
      const rim = 0.1 * (1 - dz) ** 2
      const luminosity = Math.min(1, 0.05 + 0.78 * diffuse + 0.95 * specular + rim)
      if (luminosity < 0.045) {
        continue
      }
      const index = Math.min(
        CLASSIC_CHARSET.length - 1,
        Math.floor(luminosity * CLASSIC_CHARSET.length),
      )
      glyphs.push(
        text(CLASSIC_CHARSET[index], {
          x: px,
          y: y + row * cellH + cellH * 0.76,
          size: 19,
          fill: specular > 0.3 ? INK.accentSoft : rampColour(luminosity),
          anchor: 'middle',
        }),
      )
    }
  }
  return glyphs.join('')
}

function normalise(x, y, z) {
  const length = Math.hypot(x, y, z)
  return [x / length, y / length, z / length]
}

/** The deck's foreground ramp, brightest to faintest — the same five steps the UI reads text on. */
function rampColour(luminosity) {
  if (luminosity < 0.18) {
    return INK.overlay
  }
  if (luminosity < 0.36) {
    return INK.dim
  }
  if (luminosity < 0.58) {
    return INK.muted
  }
  if (luminosity < 0.8) {
    return INK.fg
  }
  return INK.strong
}

function asciiCard() {
  const ramp = CLASSIC_CHARSET.split('').join(' ')
  return `${svgOpen()}
    ${field()}
    ${asciiSphere()}
    ${wordmark('ASCII//CONVERT', { x: 72, y: 262, size: 54, fill: INK.accent, tracking: 6 })}
    ${text('image → ascii art, live in the browser', { x: 72, y: 316, size: 24, fill: INK.fg })}
    ${text('charsets · edge glyphs · colour modes', { x: 72, y: 356, size: 20, fill: INK.dim })}
    ${text(ramp, { x: 72, y: 438, size: 26, fill: INK.muted, tracking: 4 })}
    ${text('webcam too. nothing leaves your machine.', { x: 72, y: 486, size: 19, fill: INK.dim })}
    ${deckTag()}
  </svg>`
}

// ============================================================
// GLITCH//Studio — the same picture, broken
// ============================================================

/** Where the Chain cuts the wordmark, and how far each slab slides. A Block Displacement, applied
 *  to the name of the program that does it. */
const GLITCH_BANDS = [0, 7, -5, 10, -3, 5, -8]
const GLITCH_SEED = 0x5eed

/** The picture region. Below it the caption sits on a clean field: chrome does not get charged for
 *  the effect (ADR 0013) — and a card whose caption is under scanlines is a card nobody can read at
 *  preview size. */
const GLITCH_PICTURE = { top: 52, height: 372 }

function glitchWordmark() {
  const baseline = 296
  const top = 214
  const height = 108
  const bandHeight = height / GLITCH_BANDS.length

  return GLITCH_BANDS.map((shift, index) => {
    const clipId = `band${index}`
    const x = 72 + shift
    // Channel Shift: the same word three times, the channels pulled apart by a constant vector.
    const channels = [
      wordmark('GLITCH//STUDIO', {
        x: x - 6,
        y: baseline - 2,
        size: 84,
        fill: INK.info,
        tracking: 5,
      }),
      wordmark('GLITCH//STUDIO', {
        x: x + 6,
        y: baseline + 2,
        size: 84,
        fill: INK.danger,
        tracking: 5,
      }),
      wordmark('GLITCH//STUDIO', { x, y: baseline, size: 84, fill: INK.strong, tracking: 5 }),
    ].join('')
    return `<clipPath id="${clipId}"><rect x="0" y="${top + index * bandHeight}" width="${CARD_WIDTH}" height="${bandHeight}" /></clipPath><g clip-path="url(#${clipId})">${channels}</g>`
  }).join('')
}

function glitchNoise() {
  const random = seeded(GLITCH_SEED)
  const grains = []
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(random() * CARD_WIDTH)
    const y = GLITCH_PICTURE.top + Math.floor(random() * GLITCH_PICTURE.height)
    const hot = random() > 0.93
    grains.push(
      `<rect x="${x}" y="${y}" width="2" height="2" fill="${hot ? INK.info : INK.strong}" opacity="${hot ? 0.22 : 0.07}" />`,
    )
  }
  return grains.join('')
}

function glitchScanlines() {
  const lines = []
  for (let y = GLITCH_PICTURE.top; y < GLITCH_PICTURE.top + GLITCH_PICTURE.height; y += 5) {
    lines.push(
      `<rect x="0" y="${y}" width="${CARD_WIDTH}" height="2" fill="${FIELD}" opacity="0.5" />`,
    )
  }
  return lines.join('')
}

function glitchCard() {
  return `${svgOpen()}
    ${field()}
    <clipPath id="picture"><rect x="0" y="${GLITCH_PICTURE.top}" width="${CARD_WIDTH}" height="${GLITCH_PICTURE.height}" /></clipPath>
    <g clip-path="url(#picture)">
      <rect x="520" y="150" width="332" height="11" fill="${INK.info}" opacity="0.4" />
      <rect x="118" y="352" width="240" height="8" fill="${INK.danger}" opacity="0.42" />
      <rect x="640" y="386" width="420" height="6" fill="${INK.accent}" opacity="0.5" />
      ${glitchWordmark()}
      ${glitchNoise()}
      ${glitchScanlines()}
    </g>
    ${text('presets first — then break it further', { x: 72, y: 486, size: 24, fill: INK.fg })}
    ${text('image or webcam · a chain of 8 effects · png + video', { x: 72, y: 526, size: 20, fill: INK.dim })}
    ${deckTag()}
  </svg>`
}

// ============================================================
// GOLEM//Console — an instrument panel you drive
// ============================================================

/** A session, in the Console's own grammar (ADR 0018): what the operator typed and what the machine
 *  answered. Prompt lines are the operator's; the rest is the machine talking back in phosphor. */
const GOLEM_SESSION = [
  { prompt: true, body: 'asm' },
  { prompt: false, body: 'assembled 42 words' },
  { prompt: true, body: 'break 0x0018' },
  { prompt: false, body: 'breakpoint set' },
  { prompt: true, body: 'clock 4' },
  { prompt: true, body: 'run' },
  { prompt: false, body: 'int 2 · fpu ready · ipc=0x0014' },
  { prompt: false, body: 'stopped at 0x0018 · 118 steps' },
  { prompt: true, body: 'reg r3' },
  { prompt: false, body: 'r3 = 0x0000002a' },
]

const GOLEM_REGISTERS = [
  ['pc', '0x00000018', false],
  ['sp', '0x00008000', false],
  ['fr', '0x00000021', false],
  ['cr', '0x00000002', false],
  ['ipc', '0x00000014', false],
  ['r1', '0x0000000c', false],
  ['r2', '0x00000005', false],
  ['r3', '0x0000002a', true],
  ['r4', '0x00008888', false],
  ['r5', '0x00000001', false],
  ['r6', '0x00000000', false],
  ['r7', '0x00000000', false],
]

/** The deck's card anatomy, and nothing else: a surface, a 1px border, a 2px radius. No shadow. */
function panel(x, y, width, height, label) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" fill="${INK.surface}" stroke="${INK.overlay}" stroke-width="1" />
    ${text(label, { x: x + 20, y: y + 32, size: 13, fill: INK.dim, tracking: 4 })}`
}

function golemConsole() {
  const lines = GOLEM_SESSION.map((line, index) => {
    const y = 236 + index * 31
    if (line.prompt) {
      return (
        text('>', { x: 96, y, size: 19, fill: INK.info, weight: 700 }) +
        text(line.body, { x: 118, y, size: 19, fill: INK.fg })
      )
    }
    return text(line.body, { x: 118, y, size: 19, fill: INK.info })
  }).join('')

  // The caret the operator is about to type into — the Console is the whole control grammar, so the
  // card has to show it waiting.
  const caret =
    text('>', {
      x: 96,
      y: 236 + GOLEM_SESSION.length * 31,
      size: 19,
      fill: INK.info,
      weight: 700,
    }) +
    `<rect x="118" y="${236 + GOLEM_SESSION.length * 31 - 15}" width="11" height="19" fill="${INK.info}" opacity="0.8" />`

  return lines + caret
}

function golemRegisters() {
  return GOLEM_REGISTERS.map(([name, value, changed], index) => {
    const column = index < 6 ? 0 : 1
    const y = 236 + (index % 6) * 29
    const x = 736 + column * 200
    return (
      text(name, { x, y, size: 17, fill: INK.dim }) +
      text(value, { x: x + 46, y, size: 17, fill: changed ? INK.accent : INK.fg })
    )
  }).join('')
}

function golemCard() {
  return `${svgOpen()}
    ${field()}
    ${wordmark('GOLEM//CONSOLE', { x: 72, y: 92, size: 46, fill: INK.accent, tracking: 6 })}
    ${text('a 32-bit fantasy computer — write assembly, then drive it', { x: 72, y: 132, size: 21, fill: INK.fg })}
    ${panel(72, 168, 616, 400, 'CONSOLE')}
    ${golemConsole()}
    ${panel(712, 168, 416, 226, 'REGISTERS')}
    ${golemRegisters()}
    ${panel(712, 418, 416, 150, 'TERMINAL')}
    ${text('mdc(1071, 462) = 21', { x: 736, y: 484, size: 18, fill: INK.info })}
    ${text('halted.', { x: 736, y: 516, size: 18, fill: INK.info })}
    ${text('watch the pc walk the code · share a program as a link', { x: 72, y: CARD_HEIGHT - 46, size: 17, fill: INK.dim })}
  </svg>`
}

// ============================================================
// SPRAWL//Atlas — light on a dark field
// ============================================================

/**
 * Where the scale window sits on the card: about two thirds of the way along the slide from
 * OVERFLOW to the coarse end. Deliberately not the first screen — that frame is honestly blown
 * white (ADR 0021) and says nothing to someone who has never seen the map. This is the frame the
 * repair arrives at, with the coasts back and Europe still one smear.
 */
export const SPRAWL_TOP_CAPACITY_MBPS = 8_000_000

/**
 * Transcribed from `apps/sprawl/src/atlas/paint.ts` and `project.ts`, values and all: a build
 * script at the repo root cannot import the app's TypeScript, and a card painted by a *different*
 * rule than the piece would be a picture of something that does not exist.
 *
 * The transcription is held to the original by `apps/sprawl/scripts/social-card.test.mjs`, not by
 * this comment — the deck's own answer to accepted cross-seam duplication is a guard, the way
 * `roster.test.ts` holds the hand-inlined pre-paint scripts to the kit's roster (ADR 0024). Change
 * the piece's paint and that test fails until the card follows.
 */
export const SPRAWL_PAINT = {
  windowDecades: 3,
  glowMinDiameter: 3,
  glowMaxDiameter: 11,
  core: 'rgba(224, 255, 255, 1)',
  halo: 'rgba(128, 244, 255, 0.65)',
  edge: 'rgba(128, 244, 255, 0)',
}

function sprawlCard(points, readerText) {
  const payload = JSON.stringify(points)
  const paint = JSON.stringify(SPRAWL_PAINT)
  return `<div style="position:relative;width:${CARD_WIDTH}px;height:${CARD_HEIGHT}px;background:${FIELD}">
    <canvas id="atlas" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" style="display:block"></canvas>
    <svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" style="position:absolute;inset:0">
      ${text('SCALE', { x: CARD_WIDTH - 64, y: 62, size: 13, fill: INK.dim, tracking: 5, anchor: 'end' })}
      ${text(readerText, { x: CARD_WIDTH - 64, y: 96, size: 24, fill: INK.infoSoft, anchor: 'end' })}
      ${wordmark('SPRAWL//ATLAS', { x: 64, y: 530, size: 46, fill: INK.strong, tracking: 6 })}
      ${text("the world's connected capacity, as light", { x: 64, y: 572, size: 22, fill: INK.infoSoft })}
    </svg>
    <script>
      (() => {
        const points = ${payload}
        const paint = ${paint}
        const canvas = document.getElementById('atlas')
        const ctx = canvas.getContext('2d')

        const sprite = document.createElement('canvas')
        sprite.width = 64
        sprite.height = 64
        const spriteCtx = sprite.getContext('2d')
        const gradient = spriteCtx.createRadialGradient(32, 32, 0, 32, 32, 32)
        gradient.addColorStop(0, paint.core)
        gradient.addColorStop(0.25, paint.halo)
        gradient.addColorStop(1, paint.edge)
        spriteCtx.fillStyle = gradient
        spriteCtx.fillRect(0, 0, 64, 64)

        ctx.fillStyle = '${FIELD}'
        ctx.fillRect(0, 0, ${CARD_WIDTH}, ${CARD_HEIGHT})
        ctx.globalCompositeOperation = 'lighter'
        for (const point of points) {
          const diameter =
            paint.glowMinDiameter +
            (paint.glowMaxDiameter - paint.glowMinDiameter) * point.brightness
          ctx.globalAlpha = point.brightness
          ctx.drawImage(sprite, point.x - diameter / 2, point.y - diameter / 2, diameter, diameter)
        }
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
        window.__cardPainted = true
      })()
    </script>
  </div>`
}

/**
 * `formatCapacity()`, transcribed from `apps/sprawl/src/atlas/scale.ts` — the reader printed on the
 * card has to say what the reader in the piece would say at the same scale, rounding branch for
 * rounding branch. Pinned across the whole magnitude range by the guard test.
 */
export function formatCapacity(mbps) {
  const gbps = mbps / 1000
  const [value, unit] = gbps >= 1000 ? [gbps / 1000, 'Tbps'] : [gbps, 'Gbps']
  const rounded =
    value >= 100
      ? Math.round(value)
      : value >= 10
        ? Math.round(value * 10) / 10
        : Number(value.toPrecision(2))
  return { value: rounded, unit }
}

/** The `1 px ≈ …` line the scale reader shows, from `formatScaleUnit()` in the same module. */
export function formatScaleUnit(topCapacity) {
  const { value, unit } = formatCapacity(topCapacity)
  return `1 px ≈ ${value} ${unit}`
}

/** `project()` and `brightnessFor()`, transcribed — see SPRAWL_PAINT on why the piece's core is
 *  copied here rather than imported. */
export function projectSprawl(points, topCapacity) {
  const lit = []
  for (const point of points) {
    if (point.capacity <= 0) {
      continue
    }
    const decadesBelow = Math.log10(topCapacity / point.capacity)
    const brightness = Math.max(0, Math.min(1, 1 - decadesBelow / SPRAWL_PAINT.windowDecades))
    if (brightness <= 0) {
      continue
    }
    lit.push({
      x: ((point.lng + 180) / 360) * CARD_WIDTH,
      y: ((90 - point.lat) / 180) * CARD_HEIGHT,
      brightness: Math.round(brightness * 1000) / 1000,
    })
  }
  return lit
}

// ============================================================
// CYBERDECK — the door, which is the roster
// ============================================================

/**
 * The four programs as the card draws them, and the fifth voice in the set: the other four are each
 * program *doing its own job*, and the hub's job is to name what the deck runs. So its card is the
 * list — the page itself, at preview size — rather than a picture of anything.
 *
 * `scripts/social/cards.mjs` cannot import `apps/deck/src/roster.ts`, so this is the same accepted
 * cross-seam duplication the pre-paint Theme scripts and SPRAWL//Atlas' transcribed paint carry,
 * held the same way: by a guard rather than by a comment (`apps/deck/scripts/social-card.test.mjs`).
 * A tagline edited on the door would otherwise leave the card advertising the old one.
 */
export const DECK_ROSTER = [
  { name: 'ASCII//CONVERT', kind: 'tool', tagline: 'image → ascii art' },
  { name: 'GLITCH//STUDIO', kind: 'tool', tagline: 'break the picture on purpose' },
  { name: 'GOLEM//CONSOLE', kind: 'tool', tagline: 'a 32-bit fantasy computer' },
  { name: 'SPRAWL//ATLAS', kind: 'piece', tagline: 'rewrite the map. increase the scale.' },
]

const DECK_ROWS = { top: 252, step: 84, left: 72, right: CARD_WIDTH - 72 }

// The rows carry no separator rules, and that is a decision the layout made rather than an
// omission: a name over its tagline already groups, and at the size a timeline renders this card a
// four-line grid of hairlines reads as noise before it reads as structure.
function deckRows() {
  return DECK_ROSTER.flatMap(({ name, kind, tagline }, index) => {
    const baseline = DECK_ROWS.top + index * DECK_ROWS.step
    return [
      wordmark(name, {
        x: DECK_ROWS.left,
        y: baseline,
        size: 34,
        fill: INK.strong,
        tracking: 3,
      }),
      // The category, in ADR 0021's own vocabulary — three tools and exactly one piece is a fact
      // about the deck, and the door is where it is legible.
      text(kind, {
        x: DECK_ROWS.right,
        y: baseline,
        size: 16,
        fill: INK.dim,
        tracking: 5,
        anchor: 'end',
      }),
      text(tagline, { x: DECK_ROWS.left, y: baseline + 27, size: 19, fill: INK.muted }),
    ]
  }).join('')
}

function deckCard() {
  return `${svgOpen()}
    ${field()}
    ${wordmark('CYBERDECK', { x: 72, y: 120, size: 78, fill: INK.accent, tracking: 6 })}
    ${text('what the deck runs', { x: 72, y: 166, size: 24, fill: INK.fg })}
    <rect x="72" y="200" width="${CARD_WIDTH - 144}" height="1" fill="${INK.overlay}" />
    ${deckRows()}
    ${text('four programs · nothing you open leaves your browser', { x: 72, y: CARD_HEIGHT - 44, size: 18, fill: INK.dim })}
  </svg>`
}

// The hub spends no slot on `deckTag()`, and not for want of room: this card's wordmark *is*
// CYBERDECK, so the tag would name the deck twice on the one surface that is nothing but the deck.

// ============================================================

/**
 * The card for one program, as the body of a page 1200x630 in size. HTML rather than a bare SVG
 * because two things need a document: the webfont, and SPRAWL//Atlas' canvas — the piece paints
 * with additive compositing, which is the whole reason a dense metro reads as one smear.
 */
export function buildCard(program, options = {}) {
  switch (program) {
    case 'ascii':
      return asciiCard()
    case 'deck':
      return deckCard()
    case 'glitch':
      return glitchCard()
    case 'golem':
      return golemCard()
    case 'sprawl':
      return sprawlCard(options.points ?? [], options.readerText ?? '')
    default:
      throw new Error(`no card is drawn for ${program}`)
  }
}

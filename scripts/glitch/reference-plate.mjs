// GLITCH//Studio's reference plate, drawn (ADR 0005's split, applied to a build script — the same
// shape `scripts/social/cards.mjs` uses): everything here is pure, no arguments in and one SVG
// string out, so the picture can be diffed and pinned without a browser anywhere near it.
// `scripts/glitch-reference-plate.mjs` is the shell that rasterises it.
//
// The plate is the fixed Source every Preset thumbnail is rendered over (ADR 0028). It is a
// *scene*, deliberately not a calibration chart: a test card would make the roster read as an
// instrument readout rather than as ten looks. Every element still earns its place by provoking one
// Effect, and the plate fails the moment one of them stops:
//
//   sky gradient          Halftone, Scanlines — they re-state continuous tone and need some
//   tower silhouettes     Block Displacement — a tear needs a hard edge to be a tear
//   the disc              Channel Shift, Chromatic Aberration — a split needs channels to separate
//   the ground grid       Wave — a bend is only legible over straight lines
//   the lit windows       Pixel Sort — a run needs luminance variation to reorder
//
// The hexes are literals rather than Theme tokens, and that is not a lapse in the "name the role,
// not the hue" rule: a PNG has no stylesheet, no `var()` and no Theme (ADR 0024). This is the same
// claim `CANVAS_BACKGROUND = '#0a0a0f'` makes in ASCII//Convert's renderer (ADR 0013) — a picture
// the program draws on owns its own colours, and it must not shift when the deck's Theme does or
// ten committed thumbnails would disagree with each other.

/** The dimensions the Chain runs at — `MAX_SAMPLE_DIM` (image-utils.ts) by the frame's long side,
 *  so the plate is never rescaled and every absolute-pixel param lands exactly where it was
 *  curated (ADR 0028). Pinned by `apps/glitch/scripts/reference-plate.test.mjs`. */
export const PLATE_WIDTH = 800
export const PLATE_HEIGHT = 500

/** Where the sky stops and the ground starts — the one horizontal edge that crosses the whole
 *  frame, which is what gives Block Displacement something to tear at every height it draws. */
const HORIZON = 322

// The sunset ramp, top to bottom. Chosen for its *luminance* travel as much as its colour: it runs
// from ~0.14 to ~0.85 on the 0..1 scale Pixel Sort thresholds on, unbroken, so every curated
// threshold from NEON RAIN's 0.25 to CORRUPTED's 0.7 cuts the sky somewhere.
//
// The bright end was pulled up once the ten Chains were measured over a first draft: at a top stop
// of 0.76 only 2.7% of the frame cleared 0.7, and CORRUPTED's sort — threshold 0.7 — found almost
// nothing to reorder. A plate is only a reference if every Effect on it has something to bite.
const SKY_STOPS = [
  { at: 0, color: '#2a1852' },
  { at: 0.32, color: '#5c2478' },
  { at: 0.62, color: '#c04a78' },
  { at: 0.78, color: '#ff7a6a' },
  { at: 0.9, color: '#ffb383' },
  { at: 1, color: '#ffe0a8' },
]

// The disc, centre out. Saturated on purpose and asymmetric across the channels — a shift of the
// red channel over this reads instantly, where the same shift over a grey disc would be invisible.
const DISC_STOPS = [
  { at: 0, color: '#fff1c4' },
  { at: 0.45, color: '#ffd166' },
  { at: 0.78, color: '#ff7a4d' },
  { at: 1, color: '#f0356e' },
]

// Off-centre on both axes, and sitting high enough that the skyline occludes its foot rather than
// its waist — the slits below are only worth drawing on the part of the disc that survives.
const DISC = { x: 556, y: 190, radius: 104 }

/** The haze the disc throws into the sky around it — the plate's one soft edge, and the largest
 *  continuous mid-to-bright field on it. Halftone and Scanlines both re-state tone, so they need
 *  somewhere the tone is not already a flat fill or a hard edge. */
const DISC_GLOW_RADIUS = 250
const DISC_GLOW_INK = '#ff9a6b'
const DISC_GLOW_OPACITY = 0.42

/**
 * The dark bands cut across the lower disc.
 *
 * Offsets are fractions of the radius and they widen downward, which is what reads as a disc
 * sinking rather than as stripes. They also break the disc's bright field into runs — without them
 * Pixel Sort would find one unbroken band the height of the disc and smear it into a flat column.
 */
const DISC_SLITS = [
  { offset: 0.02, height: 3 },
  { offset: 0.2, height: 5 },
  { offset: 0.4, height: 8 },
  { offset: 0.62, height: 12 },
  { offset: 0.86, height: 18 },
]

const SLIT_INK = '#3a1145'
const SLIT_OPACITY = 0.72

// Two depths, and the gap between them is the point: the far band sits close enough to the sky to
// keep some tone, the near band is nearly black. A tear that crosses both carries three different
// values in one row, which is what makes Block Displacement legible over a silhouette at all.
const FAR_INK = '#3a1f52'
const NEAR_INK = '#140b26'

/**
 * The skyline, hand-authored rather than drawn from the Rng.
 *
 * The scatter of lit windows is arrangement and can be rolled; the silhouette is *composition* and
 * is the part a maintainer reacts to, so it is data a reader can move a number in. Each tower is
 * `{ x, width, top }` and stands on the horizon.
 */
const FAR_TOWERS = [
  { x: 18, width: 54, top: 196 },
  { x: 84, width: 38, top: 238 },
  { x: 130, width: 66, top: 150 },
  { x: 206, width: 44, top: 214 },
  { x: 262, width: 58, top: 178 },
  { x: 330, width: 40, top: 252 },
  { x: 382, width: 72, top: 132 },
  { x: 464, width: 46, top: 222 },
  { x: 520, width: 52, top: 190 },
  { x: 584, width: 38, top: 246 },
  { x: 632, width: 64, top: 164 },
  { x: 706, width: 42, top: 228 },
  { x: 758, width: 48, top: 200 },
]

// Bleeds past both edges: a tower cut by the frame keeps the skyline from reading as a row of
// objects sitting inside the picture.
const NEAR_TOWERS = [
  { x: -10, width: 96, top: 262 },
  { x: 96, width: 74, top: 228 },
  { x: 182, width: 110, top: 282 },
  { x: 302, width: 86, top: 246 },
  { x: 398, width: 68, top: 290 },
  { x: 476, width: 102, top: 236 },
  { x: 590, width: 78, top: 272 },
  { x: 678, width: 94, top: 250 },
  { x: 782, width: 60, top: 286 },
]

/** Thin masts, on the near towers only — one-pixel verticals against a bright sky, which is the
 *  narrowest edge on the plate and the first thing a coarse Halftone cell loses. */
const MASTS = [
  { x: 133, top: 178 },
  { x: 524, top: 182 },
  { x: 722, top: 200 },
]

const MAST_WIDTH = 2

const WINDOW_CELL_WIDTH = 9
const WINDOW_CELL_HEIGHT = 13
const WINDOW_WIDTH = 4
const WINDOW_HEIGHT = 7
/** Keeps the grid off the silhouette's own edges, so a tower still reads as a hard-edged block. */
const WINDOW_INSET = 5

/** How many of the cells are lit. Curated: below ~0.2 the towers read as unoccupied and Pixel Sort
 *  finds nothing to reorder in them; above ~0.45 the grid closes up into a lit slab and the runs
 *  stop varying. */
const LIT_RATE = 0.3

// Warm first and heavily favoured — a skyline of evenly mixed colours reads as a toy. The two cool
// ones exist so the windows are not a single hue: Channel Shift over a run of identical windows
// moves the whole run together, where a mixed run fringes differently window by window.
const WINDOW_INKS = ['#ffd98a', '#ffd98a', '#ffd98a', '#8ef0ff', '#ff9ad5']

/** The far band's windows, dimmed toward the sky behind them — depth, and it also keeps the far
 *  towers from out-shouting the near ones in a luminance sort. */
const FAR_WINDOW_OPACITY = 0.55

const VANISHING_POINT_X = DISC.x

// The ground carries the sky's glow back at the horizon and falls away to near black at the
// viewer's feet. It is 36% of the frame, so a flat dark plane here is 36% of the plate that no
// luminance-driven Effect can read — the ramp is what keeps Halftone drawing dots on the ground and
// gives the vertical sorts a run to travel down.
//
// The band right under the horizon is the brightest thing on the plate that is *not* occluded by
// the skyline, and it is there on purpose: CORRUPTED sorts at a threshold of 0.7, and the sky above
// 0.7 is almost entirely behind towers. Without an unbroken bright run across the full width, that
// Preset's sort has nothing to catch anywhere in the frame.
const GROUND_STOPS = [
  { at: 0, color: '#ff9ec0' },
  { at: 0.1, color: '#c8548c' },
  { at: 0.3, color: '#7a2a6a' },
  { at: 0.62, color: '#2a1038' },
  { at: 1, color: '#0b0714' },
]

const GRID_INK = '#5cf6ff'
const GRID_OPACITY = 0.72

/** How many lines run away from the viewer, and how hard they bunch toward the horizon. The
 *  exponent is what makes the spacing read as distance rather than as a ruler. */
const DEPTH_LINE_COUNT = 13
const DEPTH_FALLOFF = 2.3

// The converging lines are laid out evenly along the bottom edge and far past both corners, then
// clipped — spacing them evenly *in the frame* would leave the fan visibly denser on the side the
// vanishing point sits nearer to.
const RAIL_SPACING = 150
const RAIL_REACH = 3000

/** The bright rule on the horizon itself: a single hard edge the full width of the frame, and the
 *  brightest continuous run on the plate. */
const HORIZON_INK = '#ffd9a0'

const HORIZON_RULE_HEIGHT = 2

/**
 * Deterministic noise — mulberry32, the same generator `apps/glitch/src/glitch/rng.ts` gives the
 * Chain, hand-copied because a build script cannot import the app's TypeScript.
 *
 * The plate is a committed file whose whole value is that it never moves: `Math.random` here would
 * mean every regeneration hands back a different picture and the diff on a committed PNG stops
 * meaning anything. Same reason the program derives every draw from a Seed and none from an
 * ambient random.
 */
function seeded(seed) {
  let state = seed | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state)
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 0x100000000
  }
}

/** The one roll of the window scatter the plate is. Any fixed number would do; this is the
 *  arrangement that landed, and moving it re-lights every window in the city. */
const PLATE_SEED = 0x5e7710

/** Two decimals is well under a pixel at this size, and it keeps a computed coordinate from
 *  printing seventeen digits of float — the SVG stays diffable. */
function round(value) {
  return Number(value.toFixed(2))
}

function gradientStops(stops) {
  return stops.map((stop) => `<stop offset="${stop.at}" stop-color="${stop.color}" />`).join('')
}

function defs() {
  return `<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${gradientStops(SKY_STOPS)}</linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">${gradientStops(GROUND_STOPS)}</linearGradient>
    <radialGradient id="disc" cx="0.5" cy="0.5" r="0.5">${gradientStops(DISC_STOPS)}</radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${DISC_GLOW_INK}" stop-opacity="${DISC_GLOW_OPACITY}" /><stop offset="1" stop-color="${DISC_GLOW_INK}" stop-opacity="0" /></radialGradient>
    <clipPath id="disc-clip"><circle cx="${DISC.x}" cy="${DISC.y}" r="${DISC.radius}" /></clipPath>
    <clipPath id="ground-clip"><rect x="0" y="${HORIZON}" width="${PLATE_WIDTH}" height="${PLATE_HEIGHT - HORIZON}" /></clipPath>
  </defs>`
}

function sky() {
  return `<rect x="0" y="0" width="${PLATE_WIDTH}" height="${HORIZON}" fill="url(#sky)" />`
}

function disc() {
  const slits = DISC_SLITS.map((slit) => {
    const y = DISC.y + slit.offset * DISC.radius
    return `<rect x="${DISC.x - DISC.radius}" y="${round(y)}" width="${DISC.radius * 2}" height="${slit.height}" fill="${SLIT_INK}" opacity="${SLIT_OPACITY}" />`
  }).join('')

  return `<circle cx="${DISC.x}" cy="${DISC.y}" r="${DISC_GLOW_RADIUS}" fill="url(#glow)" />
    <circle cx="${DISC.x}" cy="${DISC.y}" r="${DISC.radius}" fill="url(#disc)" />
    <g clip-path="url(#disc-clip)">${slits}</g>`
}

/**
 * One tower's lit cells, drawn off the shared stream.
 *
 * Draws twice per cell — lit, then which ink — in a fixed left-to-right, top-to-bottom walk, so
 * the arrangement is a function of the tower list and the Seed alone. Adding a tower re-rolls
 * every tower after it, which is the accepted cost of one stream over the whole skyline: the
 * alternative is a per-tower sub-seed, and the plate is drawn once.
 */
function windows(tower, rng, opacity) {
  const lit = []
  const right = tower.x + tower.width - WINDOW_INSET
  const bottom = HORIZON - WINDOW_INSET

  for (let y = tower.top + WINDOW_INSET; y + WINDOW_HEIGHT <= bottom; y += WINDOW_CELL_HEIGHT) {
    for (let x = tower.x + WINDOW_INSET; x + WINDOW_WIDTH <= right; x += WINDOW_CELL_WIDTH) {
      const isLit = rng() < LIT_RATE
      const ink =
        WINDOW_INKS[Math.min(Math.floor(rng() * WINDOW_INKS.length), WINDOW_INKS.length - 1)]
      if (isLit) {
        lit.push(
          `<rect x="${x}" y="${y}" width="${WINDOW_WIDTH}" height="${WINDOW_HEIGHT}" fill="${ink}" />`,
        )
      }
    }
  }

  return lit.length === 0 ? '' : `<g opacity="${opacity}">${lit.join('')}</g>`
}

function band(towers, ink, rng, windowOpacity) {
  const blocks = towers
    .map(
      (tower) =>
        `<rect x="${tower.x}" y="${tower.top}" width="${tower.width}" height="${HORIZON - tower.top}" fill="${ink}" />`,
    )
    .join('')
  const lights = towers.map((tower) => windows(tower, rng, windowOpacity)).join('')
  return blocks + lights
}

function masts() {
  return MASTS.map(
    (mast) =>
      `<rect x="${mast.x}" y="${mast.top}" width="${MAST_WIDTH}" height="${HORIZON - mast.top}" fill="${NEAR_INK}" />`,
  ).join('')
}

/**
 * The ground plane: lines converging on the vanishing point, crossed by rows whose spacing collapses
 * toward the horizon.
 *
 * Both families are dead straight, which is the only reason Wave is legible here at all — the bend
 * is measured by the eye against something it already knows is straight.
 */
function grid() {
  const depth = Math.max(1, PLATE_HEIGHT - HORIZON)

  const rows = []
  for (let step = 1; step <= DEPTH_LINE_COUNT; step++) {
    const along = step / DEPTH_LINE_COUNT
    const y = HORIZON + depth * along ** DEPTH_FALLOFF
    // The rule thickens as it nears the viewer, for the same reason the rows spread out.
    const thickness = round(1 + 1.6 * along)
    rows.push(
      `<line x1="0" y1="${round(y)}" x2="${PLATE_WIDTH}" y2="${round(y)}" stroke-width="${thickness}" />`,
    )
  }

  const rails = []
  for (
    let x = VANISHING_POINT_X - RAIL_REACH;
    x <= VANISHING_POINT_X + RAIL_REACH;
    x += RAIL_SPACING
  ) {
    rails.push(
      `<line x1="${VANISHING_POINT_X}" y1="${HORIZON}" x2="${round(x)}" y2="${PLATE_HEIGHT}" stroke-width="1.5" />`,
    )
  }

  return `<g clip-path="url(#ground-clip)">
    <rect x="0" y="${HORIZON}" width="${PLATE_WIDTH}" height="${depth}" fill="url(#ground)" />
    <g stroke="${GRID_INK}" opacity="${GRID_OPACITY}">${rails.join('')}${rows.join('')}</g>
  </g>`
}

function horizonRule() {
  return `<rect x="0" y="${HORIZON - HORIZON_RULE_HEIGHT}" width="${PLATE_WIDTH}" height="${HORIZON_RULE_HEIGHT}" fill="${HORIZON_INK}" />`
}

/**
 * The whole plate as one SVG string — pure, and pure with *no* arguments, which is deliberate:
 * there is exactly one plate, and a parameterised one would invite a second that ten committed
 * thumbnails were never rendered against.
 */
export function buildPlate() {
  const rng = seeded(PLATE_SEED)
  // Far band before near, so the near towers occlude what stands behind them. The disc goes down
  // before either: it is the farthest thing in the picture.
  const far = band(FAR_TOWERS, FAR_INK, rng, FAR_WINDOW_OPACITY)
  const near = band(NEAR_TOWERS, NEAR_INK, rng, 1)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PLATE_WIDTH}" height="${PLATE_HEIGHT}" viewBox="0 0 ${PLATE_WIDTH} ${PLATE_HEIGHT}">${defs()}${sky()}${disc()}${far}${masts()}${near}${horizonRule()}${grid()}</svg>`
}

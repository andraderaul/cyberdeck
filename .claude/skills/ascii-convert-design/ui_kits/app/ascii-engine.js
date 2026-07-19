/* eslint-disable no-undef */
// ----- Tokens & utilities --------------------------------------------------

const CHARSET_MAPS = {
  classic:   ' .:-=+*#%@',
  sharp:     ' .^!*<&%$#@',
  detailed:  ` .'\`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$`,
  ascii:     ' .,;|+=i1lt*xX0#@',
  blocks:    ' ░▒▓█',
  halfblock: ' ▄▀█',
  braille:   ' ⠁⠃⠇⡇⣇⣧⣷⣿',
  katakana:  ' ･ｦｧｱｲｴｵｸｶｷｺｻｼｽｾｿﾁﾂﾃﾄﾅﾆﾇﾉﾊﾌﾍﾎﾏﾐﾑﾒﾔﾗﾘﾙﾚﾛﾜﾝ',
  geometric: ' ·•○◇◆□■▲▼◀▶★✦',
  circles:   ' ·∘○◎●',
  box:       ' ╴─│┼╪╬█',
  binary:    ' 01',
};

const COLOR_MODES = {
  matrix:   { fixed: '#00ff66' },
  bw:       { fixed: '#e8e8f5' },
  retro:    { fixed: '#ff9c2a' },
  sepia:    { fixed: '#c89d6a' },
  neon:     { fixed: '#ff2d78' },
  original: { fixed: null },
};

const COLOR_MODE_LIST = ['matrix', 'bw', 'retro', 'sepia', 'neon', 'original'];
const CHARSET_LIST = [
  'classic', 'sharp', 'detailed', 'ascii',
  'blocks', 'halfblock', 'braille', 'katakana',
  'geometric', 'circles', 'box', 'binary',
];

// ----- ASCII conversion pipeline -------------------------------------------
// Mirrors src/ascii/converter.ts + src/ascii/renderer.ts at a smaller scale.

function getAsciiChar(luminance, charset) {
  const map = CHARSET_MAPS[charset];
  const idx = Math.min(map.length - 1, Math.max(0, Math.floor(luminance * (map.length - 1))));
  return map[idx];
}

// Sample pixel buffer (RGBA) at cols x rows, return a grid of { char, r, g, b }
function convertImage(imgData, cols, rows, settings) {
  const { brightness, contrast, charset } = settings;
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      let r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
      // Luminance (Rec. 601)
      let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      lum = (lum - 0.5) * contrast + 0.5;
      lum *= brightness;
      lum = Math.min(1, Math.max(0, lum));
      const char = getAsciiChar(lum, charset);
      row.push({ char, r, g, b });
    }
    grid.push(row);
  }
  return grid;
}

// Paint grid to a canvas at given character cell size.
function paintFrame(ctx, grid, cellW, cellH, colorMode) {
  const cols = grid[0].length;
  const rows = grid.length;
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, cols * cellW, rows * cellH);
  ctx.font = `${cellH}px "IBM Plex Mono", monospace`;
  ctx.textBaseline = 'top';
  const fixed = COLOR_MODES[colorMode].fixed;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];
      if (cell.char === ' ') continue;
      ctx.fillStyle = fixed || `rgb(${cell.r}, ${cell.g}, ${cell.b})`;
      ctx.fillText(cell.char, x * cellW, y * cellH);
    }
  }
}

// Generate a procedural placeholder source image (a face-like portrait sphere
// with a soft directional light) onto an offscreen canvas, returning ImageData.
function makeSourceImage(kind, cols, rows) {
  const c = document.createElement('canvas');
  c.width = cols; c.height = rows;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cols, rows);

  if (kind === 'portrait') {
    // Sphere with directional light (looks like a face / planet)
    const cx = cols * 0.5, cy = rows * 0.45;
    const r = Math.min(cols, rows) * 0.38;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = x - cx, dy = (y - cy) * 1.2;
        const d2 = dx*dx + dy*dy;
        if (d2 > r * r) continue;
        // light direction (-0.7, -0.7, 0.6 normalized-ish)
        const nx = dx / r, ny = dy / r;
        const nz = Math.sqrt(Math.max(0, 1 - nx*nx - ny*ny));
        let light = nx * -0.55 + ny * -0.55 + nz * 0.65;
        light = Math.max(0, Math.min(1, light * 1.05));
        const v = Math.floor(60 + light * 195);
        const tr = Math.floor(v * 1.05);
        const tg = Math.floor(v * 0.92);
        const tb = Math.floor(v * 0.78);
        ctx.fillStyle = `rgb(${Math.min(255,tr)},${tg},${tb})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // "shoulders"
    for (let y = Math.floor(rows * 0.78); y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const t = (y - rows * 0.78) / (rows * 0.22);
        const inside = Math.abs(x - cols * 0.5) < cols * (0.25 + t * 0.55);
        if (!inside) continue;
        const v = Math.floor(60 + (1 - t) * 90);
        ctx.fillStyle = `rgb(${v},${Math.floor(v*0.85)},${Math.floor(v*0.72)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (kind === 'city') {
    // Procedural cityscape silhouette
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(0, 0, cols, rows * 0.55);
    // sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, rows * 0.55);
    grad.addColorStop(0, '#0a0a1f');
    grad.addColorStop(0.6, '#3a1f4a');
    grad.addColorStop(1, '#ff6a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cols, rows * 0.55);
    // sun
    ctx.fillStyle = '#ffec4a';
    ctx.beginPath(); ctx.arc(cols * 0.7, rows * 0.42, Math.min(cols,rows)*0.08, 0, Math.PI*2); ctx.fill();
    // skyline
    let x = 0;
    while (x < cols) {
      const w = 4 + Math.floor(Math.random() * 14);
      const h = 4 + Math.floor(Math.random() * (rows * 0.4));
      ctx.fillStyle = '#101020';
      ctx.fillRect(x, rows * 0.55 - h, w, h + rows * 0.45);
      // windows
      for (let wy = rows * 0.55 - h + 3; wy < rows * 0.55 - 2; wy += 4) {
        for (let wx = x + 1; wx < x + w - 1; wx += 3) {
          if (Math.random() > 0.5) {
            ctx.fillStyle = Math.random() > 0.5 ? '#ffec4a' : '#ff6a3a';
            ctx.fillRect(wx, wy, 1, 1);
          }
        }
      }
      x += w + 1;
    }
  } else if (kind === 'cat') {
    // A blocky cat silhouette
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, cols, rows);
    const cx = cols * 0.5, cy = rows * 0.58;
    const bodyR = Math.min(cols, rows) * 0.34;
    // Body
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = (x - cx) / bodyR;
        const dy = ((y - cy) / bodyR) * 1.4;
        if (dx*dx + dy*dy < 1) {
          const lum = 220 - Math.abs(dx) * 80 - Math.abs(dy) * 40;
          ctx.fillStyle = `rgb(${lum},${Math.floor(lum*0.95)},${Math.floor(lum*0.85)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    // ears (triangles)
    const drawTri = (px, py, dir) => {
      for (let i = 0; i < 8; i++) {
        const w = 8 - i;
        ctx.fillStyle = '#dad2c2';
        ctx.fillRect(px - w + (dir*i*0.2), py + i, w*2, 1);
      }
    };
    drawTri(cx - bodyR * 0.55, cy - bodyR * 0.95, 0);
    drawTri(cx + bodyR * 0.55, cy - bodyR * 0.95, 0);
    // eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - bodyR * 0.35, cy - bodyR * 0.1, 3, 4);
    ctx.fillRect(cx + bodyR * 0.32, cy - bodyR * 0.1, 3, 4);
  }
  return ctx.getImageData(0, 0, cols, rows).data;
}

// Make the helpers available globally to the React app script
Object.assign(window, {
  CHARSET_MAPS, COLOR_MODES, COLOR_MODE_LIST, CHARSET_LIST,
  convertImage, paintFrame, makeSourceImage,
});

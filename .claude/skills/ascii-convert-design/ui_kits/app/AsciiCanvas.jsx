/* global React, convertImage, paintFrame, makeSourceImage */
// AsciiCanvas — draws the conversion result to a canvas.
// For Source Image: re-renders on settings change.
// For Live Source: a rAF loop pulls frames from a virtual webcam emulator.

function useAsciiRender(canvasRef, source, settings) {
  const sampleRef = React.useRef(null);
  const frameRef = React.useRef(0);

  React.useEffect(() => {
    if (!source) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const cellH = settings.resolution;
    const cellW = Math.max(4, Math.round(cellH * 0.55));

    // Logical cols/rows = canvas size in cells
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = rect.width;
    const targetH = rect.height;
    canvas.width = Math.floor(targetW * dpr);
    canvas.height = Math.floor(targetH * dpr);
    canvas.style.width = `${targetW}px`;
    canvas.style.height = `${targetH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.max(20, Math.floor(targetW / cellW));
    const rows = Math.max(15, Math.floor(targetH / cellH));

    function renderOnce(animTick) {
      // Build/Refresh source pixel buffer
      let pixels;
      if (source.kind === 'image') {
        pixels = makeSourceImage(source.sample, cols, rows);
      } else {
        // Live emulator: subtly animate the portrait
        pixels = makeSourceImage('portrait', cols, rows);
        // perturb with a horizontal scan offset to simulate motion
        const offset = Math.sin(animTick / 30) * 3;
        // Draw scan-line jitter onto a working canvas
        const work = document.createElement('canvas');
        work.width = cols; work.height = rows;
        const wctx = work.getContext('2d');
        const imgData = wctx.createImageData(cols, rows);
        for (let y = 0; y < rows; y++) {
          const off = Math.floor(offset + Math.sin((y + animTick / 6) * 0.3) * 2);
          for (let x = 0; x < cols; x++) {
            const sx = Math.min(cols - 1, Math.max(0, x + off));
            const si = (y * cols + sx) * 4;
            const di = (y * cols + x) * 4;
            imgData.data[di] = pixels[si];
            imgData.data[di + 1] = pixels[si + 1];
            imgData.data[di + 2] = pixels[si + 2];
            imgData.data[di + 3] = 255;
          }
        }
        pixels = imgData.data;
      }
      const grid = convertImage(pixels, cols, rows, settings);
      paintFrame(ctx, grid, cellW, cellH, settings.colorMode);
    }

    if (source.kind === 'image') {
      renderOnce(0);
      cancelAnimationFrame(frameRef.current);
    } else {
      let tick = 0;
      let last = 0;
      const loop = (now) => {
        // throttle to ~15fps
        if (now - last > 66) {
          renderOnce(tick++);
          last = now;
        }
        frameRef.current = requestAnimationFrame(loop);
      };
      frameRef.current = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(frameRef.current);
  }, [source, settings.resolution, settings.brightness, settings.contrast, settings.colorMode, settings.charset]);
}

function AsciiCanvas({ source, settings, canvasRef }) {
  useAsciiRender(canvasRef, source, settings);
  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

Object.assign(window, { AsciiCanvas });

'use strict';

const { Resvg } = require('@resvg/resvg-js');
const { PNG } = require('pngjs');

const RESVG_OPTS = Object.freeze({
  fitTo: { mode: 'original' },
  font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  shapeRendering: 2,
  textRendering: 1,
});

function svgDoc(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

// Returns a straight-alpha RGBA image of exactly width x height.
function rasterize(width, height, body) {
  const png = new Resvg(svgDoc(width, height, body), RESVG_OPTS).render().asPng();
  const img = PNG.sync.read(png);
  if (img.width !== width || img.height !== height) {
    throw new Error(`rasterize size mismatch: wanted ${width}x${height}, got ${img.width}x${img.height}`);
  }
  return { width, height, data: img.data };
}

function createImage(width, height) {
  return { width, height, data: Buffer.alloc(width * height * 4) };
}

// Plain copy: atlas sprites never overlap, so no blending is wanted.
function blit(dst, src, dx, dy) {
  if (dx < 0 || dy < 0 || dx + src.width > dst.width || dy + src.height > dst.height) {
    throw new Error(`blit out of bounds at ${dx},${dy} (${src.width}x${src.height}) into ${dst.width}x${dst.height}`);
  }
  for (let row = 0; row < src.height; row++) {
    const s = row * src.width * 4;
    src.data.copy(dst.data, ((dy + row) * dst.width + dx) * 4, s, s + src.width * 4);
  }
}

// Source-over composite of a sub-rect of src onto dst, clipped to dst bounds.
function compositeRect(dst, src, sx, sy, w, h, dx, dy) {
  for (let y = 0; y < h; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < w; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const si = ((sy + y) * src.width + (sx + x)) * 4;
      const a = src.data[si + 3] / 255;
      if (a === 0) continue;
      const di = (ty * dst.width + tx) * 4;
      const da = dst.data[di + 3] / 255;
      const oa = a + da * (1 - a);
      for (let c = 0; c < 3; c++) {
        dst.data[di + c] = Math.round((src.data[si + c] * a + dst.data[di + c] * da * (1 - a)) / oa);
      }
      dst.data[di + 3] = Math.round(oa * 255);
    }
  }
}

function encodePng(img) {
  const png = new PNG({ width: img.width, height: img.height });
  img.data.copy(png.data);
  return PNG.sync.write(png, { colorType: 6 });
}

function decodePng(buf) {
  const img = PNG.sync.read(buf);
  return { width: img.width, height: img.height, data: img.data };
}

module.exports = { rasterize, createImage, blit, compositeRect, encodePng, decodePng, svgDoc };

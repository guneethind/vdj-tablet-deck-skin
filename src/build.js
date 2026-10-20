'use strict';

// Shared build pipeline: register sprites -> pack atlas -> emit XML ->
// validate (hard gate) -> render preview -> write files + flat zip.
const fs = require('fs');
const path = require('path');
const { zipSync } = require('fflate');
const { Atlas } = require('./atlas');
const { toXml } = require('./xml');
const { validate } = require('./validate');
const { render } = require('./preview');
const { encodePng, rasterize } = require('./raster');
const { tokens } = require('./tokens');

function thumbnail(png, width, height) {
  const uri = `data:image/png;base64,${png.toString('base64')}`;
  return encodePng(rasterize(width, height, `<image href="${uri}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>`));
}

function build(skin, { outDir, zipName }) {
  const { width, height } = tokens.canvas;
  const atlas = new Atlas({ width, canvasHeight: height, gutter: tokens.gutter, maxHeight: tokens.maxSheet });
  skin.registerSprites(atlas);
  atlas.pack();
  const sheet = atlas.compose();
  const xml = toXml(skin.buildXml((id) => atlas.rect(id)));

  const report = validate(xml, {
    sheet, rects: atlas.rects, canvas: tokens.canvas, minTouch: skin.minTouch, allowUnproven: skin.allowUnproven,
  });
  if (!report.ok) {
    const err = new Error(`validation failed:\n  ${report.errors.join('\n  ')}`);
    err.report = report;
    throw err;
  }

  const skinPng = encodePng(sheet);
  const { image } = render(xml, sheet);
  const previewFull = encodePng(image);
  const previewThumb = thumbnail(previewFull, 600, 375);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'skin.xml'), xml);
  fs.writeFileSync(path.join(outDir, 'skin.png'), skinPng);
  fs.writeFileSync(path.join(outDir, 'preview.png'), previewThumb);
  fs.writeFileSync(path.join(outDir, 'render-full.png'), previewFull);
  // Flat zip (no folder inside): a nested folder causes the "No page skin" error.
  const zip = zipSync({ 'skin.xml': Buffer.from(xml), 'skin.png': skinPng, 'preview.png': previewThumb }, { level: 9 });
  const zipPath = path.join(outDir, zipName);
  fs.writeFileSync(zipPath, zip);

  return { zipPath, sheet: { width: sheet.width, height: sheet.height }, sprites: atlas.rects.size, elements: report.elements };
}

module.exports = { build };

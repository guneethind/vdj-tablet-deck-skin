'use strict';

const { rasterize, createImage, blit } = require('./raster');

// Sprite atlas. The skin background occupies (0,0,canvasW,canvasH), because
// VirtualDJ draws that region of the image as the skin background. Every other
// sprite is shelf-packed below it, separated by a transparent gutter so that
// scaled sampling never bleeds a neighbour into view.
class Atlas {
  constructor({ width, canvasHeight, gutter, maxHeight }) {
    this.width = width;
    this.canvasHeight = canvasHeight;
    this.gutter = gutter;
    this.maxHeight = maxHeight;
    this.background = null;
    this.items = new Map();
    this.rects = null;
  }

  setBackground(svgBody) {
    this.background = rasterize(this.width, this.canvasHeight, svgBody);
  }

  add(id, width, height, svgBody) {
    if (this.rects) throw new Error('atlas already packed');
    if (this.items.has(id)) throw new Error(`duplicate sprite id: ${id}`);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error(`sprite ${id} needs positive integer size, got ${width}x${height}`);
    }
    this.items.set(id, { id, width, height, image: rasterize(width, height, svgBody) });
    return id;
  }

  pack() {
    const g = this.gutter;
    const order = [...this.items.values()].sort((a, b) => b.height - a.height || b.width - a.width || (a.id < b.id ? -1 : 1));
    const rects = new Map();
    let x = 0;
    let y = this.canvasHeight + g;
    let shelf = 0;
    for (const it of order) {
      if (it.width > this.width) throw new Error(`sprite ${it.id} wider than sheet`);
      if (x + it.width > this.width) {
        x = 0;
        y += shelf + g;
        shelf = 0;
      }
      rects.set(it.id, { x, y, w: it.width, h: it.height });
      x += it.width + g;
      shelf = Math.max(shelf, it.height);
    }
    const height = y + shelf;
    if (height > this.maxHeight) throw new Error(`atlas height ${height} exceeds ${this.maxHeight}`);
    this.rects = rects;
    this.height = height;
    return this;
  }

  rect(id) {
    if (!this.rects) throw new Error('atlas not packed');
    const r = this.rects.get(id);
    if (!r) throw new Error(`unknown sprite: ${id}`);
    return r;
  }

  compose() {
    if (!this.background) throw new Error('atlas background not set');
    const sheet = createImage(this.width, this.height);
    blit(sheet, this.background, 0, 0);
    for (const it of this.items.values()) {
      const r = this.rects.get(it.id);
      blit(sheet, it.image, r.x, r.y);
    }
    return sheet;
  }
}

module.exports = { Atlas };

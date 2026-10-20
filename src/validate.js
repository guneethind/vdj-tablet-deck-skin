'use strict';

// Build gate. Parses the emitted skin XML and fails on anything that could
// misalign or break on the Remote: non-literal coordinates, elements outside
// the canvas, sprite references that do not exactly match a packed sprite,
// elements outside the proven-on-remote allowlist, undersized touch targets.
const { DOMParser } = require('@xmldom/xmldom');

const PROVEN = new Set([
  'Skin', 'copyright', 'font', 'define', 'group', 'panel', 'deck',
  'button', 'slider', 'visual', 'textzone', 'songpos', 'scratchwave', 'rhythmzone', 'cover', 'scratch',
  'pos', 'size', 'off', 'on', 'up', 'down', 'over', 'selected', 'text', 'textselected', 'icon',
  'fader', 'circle', 'mousemask', 'clipmask', 'overlay', 'background', 'cues', 'loops', 'colors',
  'rhythm', 'grid', 'cue', 'mask', 'wave', 'tooltip',
]);
const UNPROVEN_ATTRS = ['shape', 'gradient', 'color2', 'border', 'border_size', 'radius', 'backcolor'];
const SPRITE_TAGS = new Set(['off', 'on', 'up', 'down', 'over', 'selected', 'mousemask', 'clipmask', 'background']);
const INTERACTIVE = new Set(['button', 'slider', 'scratch']);
const LITERAL = /^\d+$/;

function childrenNamed(node, name) {
  const out = [];
  for (let c = node.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && c.nodeName === name) out.push(c);
  return out;
}

function geom(node) {
  const p = childrenNamed(node, 'pos')[0];
  const s = childrenNamed(node, 'size')[0];
  return p && s ? { p, s } : null;
}

function validate(xml, { sheet, rects, canvas, minTouch, allowUnproven = new Set() }) {
  const errors = [];
  const parseErrors = [];
  const doc = new DOMParser({ onError: (level, msg) => { if (level !== 'warning') parseErrors.push(msg); } })
    .parseFromString(xml, 'text/xml');
  if (parseErrors.length) return { ok: false, errors: parseErrors.map((m) => `xml: ${m}`) };

  const root = doc.documentElement;
  if (!root || root.nodeName !== 'Skin') errors.push('root element must be <Skin>');
  if (root.getAttribute('width') !== String(canvas.width) || root.getAttribute('height') !== String(canvas.height)) {
    errors.push(`Skin size must be ${canvas.width}x${canvas.height}`);
  }

  const known = new Set([...rects.values()].map((r) => `${r.x},${r.y},${r.w},${r.h}`));
  const matchSprite = (x, y, w, h) => known.has(`${x},${y},${w},${h}`);
  let count = 0;

  const walk = (node, path) => {
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      const name = c.nodeName;
      const where = `${path}/${name}[${++count}]`;
      const tag = where;
      if (!PROVEN.has(name) && !allowUnproven.has(name)) errors.push(`${tag}: <${name}> is not proven on VDJ Remote`);

      for (const a of UNPROVEN_ATTRS) {
        if (c.hasAttribute(a) && !allowUnproven.has(`@${a}`)) errors.push(`${tag}: attribute ${a} is not proven on VDJ Remote`);
      }

      if (name === 'pos' || name === 'size') {
        for (const a of ['x', 'y', 'width', 'height']) {
          if (c.hasAttribute(a) && !LITERAL.test(c.getAttribute(a))) {
            errors.push(`${tag}: ${a}="${c.getAttribute(a)}" must be a literal non-negative integer`);
          }
        }
      }

      const g = geom(c);
      if (g && name !== 'fader') {
        const x = +g.p.getAttribute('x');
        const y = +g.p.getAttribute('y');
        const w = +g.s.getAttribute('width');
        const h = +g.s.getAttribute('height');
        if (x + w > canvas.width || y + h > canvas.height) errors.push(`${tag}: rect ${x},${y} ${w}x${h} leaves the canvas`);
        if (INTERACTIVE.has(name) && Math.min(w, h) < minTouch) {
          errors.push(`${tag}: touch target ${w}x${h} below ${minTouch}px`);
        }
        for (const ic of childrenNamed(c, 'icon')) {
          if (!ic.hasAttribute('x')) continue;
          if (!matchSprite(+ic.getAttribute('x'), +ic.getAttribute('y'), +ic.getAttribute('width'), +ic.getAttribute('height'))) {
            errors.push(`${tag}: <icon> reference matches no packed sprite`);
          }
        }
        for (const st of [...SPRITE_TAGS].flatMap((t) => childrenNamed(c, t))) {
          if (!st.hasAttribute('x')) continue;
          const sx = +st.getAttribute('x');
          const sy = +st.getAttribute('y');
          if (!matchSprite(sx, sy, w, h)) errors.push(`${tag}: <${st.nodeName} x="${sx}" y="${sy}"> with ${w}x${h} matches no packed sprite`);
        }
      }

      if (name === 'fader') {
        const fs = childrenNamed(c, 'size')[0];
        const fp = childrenNamed(c, 'pos')[0];
        if (fp && fp.hasAttribute('nb')) {
          const parent = geom(c.parentNode);
          const s = +parent.s.getAttribute('width');
          const nb = +fp.getAttribute('nb');
          const nbx = +fp.getAttribute('nbx');
          if (!matchSprite(+fp.getAttribute('x'), +fp.getAttribute('y'), s * nbx, s * Math.ceil(nb / nbx))) {
            errors.push(`${tag}: filmstrip reference matches no packed sprite`);
          }
        } else if (fs && fp && !matchSprite(+fp.getAttribute('x'), +fp.getAttribute('y'), +fs.getAttribute('width'), +fs.getAttribute('height'))) {
          errors.push(`${tag}: fader cap reference matches no packed sprite`);
        }
      }
      walk(c, where);
    }
  };
  walk(root, '');

  for (const m of xml.matchAll(/constants+'([^']*)'/g)) {
    if (!/^#[0-9a-fA-F]{6}$/.test(m[1])) errors.push(`constant '${m[1]}' must be a #RRGGBB hex (colour names are not resolved on the Remote)`);
  }
  if (sheet.width > 4096 || sheet.height > 4096) errors.push(`sheet ${sheet.width}x${sheet.height} exceeds 4096`);
  return { ok: errors.length === 0, errors, elements: count };
}

module.exports = { validate };

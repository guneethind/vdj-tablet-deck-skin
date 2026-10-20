'use strict';

// Reference renderer for VDJ skins: resolves positions with VirtualDJ's rules
// and composites the default-visible state from the skin image. Used to check
// our generated skins and calibrated against the stock Remote 8 skin.
const { DOMParser } = require('@xmldom/xmldom');
const { createImage, compositeRect, rasterize } = require('./raster');

// Skin Element Positioning: a leading +/- makes a value relative to the parent
// origin; otherwise it is absolute. Math is evaluated strictly left to right.
function evalExpr(expr) {
  const tokens = String(expr).replace(/\s+/g, '').match(/\d+(?:\.\d+)?|[-+*/]/g);
  if (!tokens) throw new Error(`bad expression: ${expr}`);
  let i = 0;
  let acc;
  if (tokens[0] === '-' || tokens[0] === '+') {
    acc = 0;
  } else {
    acc = Number(tokens[0]);
    i = 1;
  }
  for (; i < tokens.length; i += 2) {
    const op = tokens[i];
    const v = Number(tokens[i + 1]);
    if (Number.isNaN(v)) throw new Error(`bad expression: ${expr}`);
    if (op === '+') acc += v;
    else if (op === '-') acc -= v;
    else if (op === '*') acc *= v;
    else if (op === '/') acc /= v;
  }
  return acc;
}

function resolveCoord(raw, origin) {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim();
  const rel = s[0] === '+' || s[0] === '-';
  return rel ? origin + evalExpr(s) : evalExpr(s);
}

const VERB_DEFAULTS = {
  eq_reset: true, effect_active: false, loop: false, automix: false, play: false, loaded: false,
  'isok mix_and_load_next': true, 'effect_select \'Slicer\'': false,
};

function evalVisibility(expr, vars) {
  if (expr === null || expr === undefined || expr === '') return true;
  const e = expr.trim();
  const q = e.indexOf('?');
  if (q > -1) {
    const colon = e.indexOf(':', q);
    const cond = evalVisibility(e.slice(0, q), vars);
    return evalVisibility(cond ? e.slice(q + 1, colon) : e.slice(colon + 1), vars);
  }
  if (e === 'true' || e === 'yes') return true;
  if (e === 'false' || e === 'no') return false;
  const m = e.match(/^var\s+'([^']+)'\s+(\S+)$/);
  if (m) return String(vars[m[1]] ?? 0) === m[2];
  const not = e.match(/^not\s+(.+)$/);
  if (not) return !evalVisibility(not[1], vars);
  if (Object.prototype.hasOwnProperty.call(VERB_DEFAULTS, e)) return VERB_DEFAULTS[e];
  return false;
}

const kids = (n) => {
  const out = [];
  for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) out.push(c);
  return out;
};

const ELEMENTS = new Set(['button', 'slider', 'visual', 'textzone', 'songpos', 'scratchwave', 'rhythmzone', 'cover', 'scratch', 'panel', 'group', 'deck']);

// Merge a <define> template into an instance: instance children of a given tag
// replace or extend the template's nth child of that tag.
function applyClass(node, defines, deck) {
  const cls = node.getAttribute && node.getAttribute('class');
  if (!cls) return { attrs: attrsOf(node), children: kids(node) };
  const cands = defines.get(cls) || [];
  const def = cands.find((d) => d.classdeck === deck) || cands.find((d) => !d.classdeck) || cands[0];
  const attrs = { ...(def ? attrsOf(def.node) : {}), ...attrsOf(node) };
  delete attrs.classdeck;
  if (!def) return { attrs, children: kids(node) };
  const tpl = kids(def.node);
  const inst = kids(node);
  const used = new Set();
  const merged = tpl.map((t) => {
    const nth = tpl.filter((x) => x.nodeName === t.nodeName).indexOf(t);
    const match = inst.filter((x) => x.nodeName === t.nodeName)[nth];
    if (!match) return t;
    used.add(match);
    return ELEMENTS.has(t.nodeName) ? mergeNodes(t, match) : match;
  });
  return { attrs, children: [...merged, ...inst.filter((x) => !used.has(x))] };
}

function mergeNodes(base, over) {
  const n = base.cloneNode(true);
  for (const [k, v] of Object.entries(attrsOf(over))) n.setAttribute(k, v);
  for (const oc of kids(over)) {
    const existing = kids(n).find((c) => c.nodeName === oc.nodeName);
    if (existing) n.replaceChild(oc.cloneNode(true), existing);
    else n.appendChild(oc.cloneNode(true));
  }
  return n;
}

function attrsOf(n) {
  const o = {};
  if (!n.attributes) return o;
  for (let i = 0; i < n.attributes.length; i++) o[n.attributes[i].name] = n.attributes[i].value;
  return o;
}

const SAMPLE = {
  '%Pbpmex': '128.14', '%bpm': '128.14', '%Ppitch': '+0.9', '%pitchrange': '±8%', '%spent': '0:01.5',
  '%left': '2:24.7', '%title': 'Track title', '%author': 'Artist', '%Plevel': '-3.0', '%loop': '4',
};

function sampleText(t) {
  if (t.format !== undefined) {
    let s = t.format.replace(/%%/g, '%');
    for (const [k, v] of Object.entries(SAMPLE)) s = s.split(k).join(v);
    return s.replace(/%[A-Za-z]+\d*/g, '').replace(/`[^`]*`/g, '…');
  }
  if (t.text !== undefined) return t.text;
  if (t.action) return `[${t.action.split(/[\s&]/)[0]}]`;
  return '';
}

const NAMED = { red: '#ff0000', orange: '#ff7f00', blue: '#0000ff', yellow: '#ffff00', green: '#00ff00', pink: '#e69696', cyan: '#00ffff', violet: '#9600ff', white: '#ffffff', black: '#000000', gray: '#7f7f7f', lightgray: '#d8d8d8' };
function colorOf(src) {
  const m = src && src.match(/constant\s+'([^']+)'(?!.*constant)/);
  const c = m ? m[1] : null;
  if (!c) return '#555555';
  return NAMED[c] || c;
}

function render(xml, sheet, { vars = {} } = {}) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;
  const W = +root.getAttribute('width');
  const H = +root.getAttribute('height');
  const out = createImage(W, H);
  compositeRect(out, sheet, 0, 0, W, H, 0, 0);
  const texts = [];
  const boxes = [];

  const defines = new Map();
  (function collect(n) {
    for (const c of kids(n)) {
      if (c.nodeName === 'define' && c.getAttribute('class')) {
        const k = c.getAttribute('class');
        if (!defines.has(k)) defines.set(k, []);
        defines.get(k).push({ classdeck: c.getAttribute('classdeck') || null, node: c });
      } else collect(c);
    }
  })(root);

  const draw = (sx, sy, w, h, dx, dy) => {
    if (w > 0 && h > 0) compositeRect(out, sheet, sx, sy, w, h, Math.round(dx), Math.round(dy));
  };

  function geometry(attrs, children, ox, oy) {
    const p = children.find((c) => c.nodeName === 'pos');
    const s = children.find((c) => c.nodeName === 'size');
    const pa = p ? attrsOf(p) : {};
    const sa = s ? attrsOf(s) : {};
    const x = resolveCoord(pa.x ?? attrs.x, ox) ?? ox;
    const y = resolveCoord(pa.y ?? attrs.y, oy) ?? oy;
    const w = evalExpr(sa.width ?? pa.width ?? attrs.width ?? 0);
    const h = evalExpr(sa.height ?? pa.height ?? attrs.height ?? 0);
    return { x, y, w, h };
  }

  function state(children, ...names) {
    for (const n of names) {
      const c = children.find((k) => k.nodeName === n && k.hasAttribute('x'));
      if (c) return { x: evalExpr(c.getAttribute('x')), y: evalExpr(c.getAttribute('y')) };
    }
    return null;
  }

  function addText(children, g) {
    const t = children.find((c) => c.nodeName === 'text');
    if (!t) return;
    const a = attrsOf(t);
    const str = sampleText(a);
    if (!str) return;
    texts.push({ ...g, str, size: +(a.size || a.fontsize || 12), color: a.color || '#ffffff', align: a.align || 'left', bold: a.weight === 'bold', dx: +(a.dx || 0) });
  }

  function walk(node, ox, oy, deck) {
    for (const raw of kids(node)) {
      const name = raw.nodeName;
      if (name === 'define' || name === 'copyright' || name === 'font') continue;
      const { attrs, children } = applyClass(raw, defines, deck);
      if (name === 'panel' && (attrs.visible === 'no' || attrs.visible === 'false')) continue;
      if (attrs.visible && !['yes', 'true', 'no', 'false'].includes(attrs.visible) && !evalVisibility(attrs.visible, vars)) continue;
      if (attrs.visibility !== undefined && !evalVisibility(attrs.visibility, vars)) continue;

      if (name === 'deck') { walk(raw, ox, oy, attrs.deck || deck); continue; }
      if (name === 'group' || name === 'panel') {
        const gx = resolveCoord(attrs.x, ox) ?? ox;
        const gy = resolveCoord(attrs.y, oy) ?? oy;
        const holder = doc.createElement('holder');
        for (const c of children) holder.appendChild(c.cloneNode(true));
        walk(holder, gx, gy, attrs.deck || deck);
        continue;
      }
      if (!ELEMENTS.has(name)) continue;
      const g = geometry(attrs, children, ox, oy);
      boxes.push({ name, ...g });

      if (name === 'button') {
        const st = state(children, 'off', 'up');
        if (st) draw(st.x, st.y, g.w, g.h, g.x, g.y);
        const ic = children.find((c) => c.nodeName === 'icon' && c.hasAttribute('x'));
        if (ic) {
          const iw = ic.hasAttribute('width') ? evalExpr(ic.getAttribute('width')) : g.w;
          const ih = ic.hasAttribute('height') ? evalExpr(ic.getAttribute('height')) : g.h;
          draw(evalExpr(ic.getAttribute('x')), evalExpr(ic.getAttribute('y')), iw, ih, g.x + (g.w - iw) / 2, g.y + (g.h - ih) / 2);
        }
        const sys = children.find((c) => c.nodeName === 'icon' && c.hasAttribute('sysicon'));
        if (sys) texts.push({ ...g, str: sys.getAttribute('sysicon').includes('play') ? '▶ ❚❚' : '■', size: Math.round(g.h * 0.4), color: '#e6e6e6', align: 'center', bold: true, dx: 0 });
        addText(children, g);
      } else if (name === 'slider') {
        const st = state(children, 'off', 'up');
        if (st) draw(st.x, st.y, g.w, g.h, g.x, g.y);
        const f = children.find((c) => c.nodeName === 'fader');
        if (f) {
          const fp = kids(f).find((c) => c.nodeName === 'pos');
          const fs = kids(f).find((c) => c.nodeName === 'size');
          if (fp && fp.hasAttribute('nb')) {
            const nb = +fp.getAttribute('nb');
            const nbx = +fp.getAttribute('nbx') || nb;
            const mid = Math.floor(nb / 2);
            draw(+fp.getAttribute('x') + (mid % nbx) * g.w, +fp.getAttribute('y') + Math.floor(mid / nbx) * g.h, g.w, g.h, g.x, g.y);
          } else if (fp && fs) {
            const fw = evalExpr(fs.getAttribute('width'));
            const fh = evalExpr(fs.getAttribute('height'));
            const horiz = attrs.orientation === 'horizontal';
            const dx = horiz ? g.x + (g.w - fw) / 2 : g.x + (g.w - fw) / 2;
            const dy = horiz ? g.y + (g.h - fh) / 2 : g.y + (g.h - fh) / 2;
            draw(evalExpr(fp.getAttribute('x')), evalExpr(fp.getAttribute('y')), fw, fh, dx, dy);
          }
        }
      } else if (name === 'visual') {
        if (attrs.type === 'color') {
          boxes.push({ name: 'fill', ...g, color: colorOf(attrs.source) });
          continue;
        }
        const off = state(children, 'off');
        if (off) draw(off.x, off.y, g.w, g.h, g.x, g.y);
        const on = state(children, 'on');
        if (on && (attrs.type === 'rotation' || attrs.type === 'circle')) draw(on.x, on.y, g.w, g.h, g.x, g.y);
      } else if (name === 'textzone') {
        addText(children, g);
      } else if (name === 'cover') {
        boxes.push({ name: 'fill', ...g, color: '#3a3f46' });
      } else if (name === 'scratchwave' || name === 'rhythmzone' || name === 'songpos') {
        boxes.push({ name: 'fill', ...g, color: name === 'songpos' ? '#123a52' : '#101418', label: name });
      }
    }
  }
  walk(root, 0, 0, null);

  // Solid fills and texts are rendered as one vector overlay, then composited.
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let svg = '';
  for (const b of boxes.filter((b) => b.name === 'fill')) {
    svg += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${b.color}"/>`;
    if (b.label) svg += `<text x="${b.x + 12}" y="${b.y + 28}" font-family="Arial" font-size="22" fill="#6a7480">${b.label}</text>`;
  }
  for (const t of texts) {
    const anchor = t.align === 'right' ? 'end' : t.align === 'left' ? 'start' : 'middle';
    const tx = t.align === 'right' ? t.x + t.w : t.align === 'left' ? t.x + t.dx : t.x + t.w / 2 + t.dx;
    svg += `<text x="${tx}" y="${t.y + t.h / 2 + t.size * 0.35}" font-family="Arial" font-size="${t.size}" font-weight="${t.bold ? 'bold' : 'normal'}" fill="${t.color}" text-anchor="${anchor}">${esc(t.str)}</text>`;
  }
  const overlay = rasterize(W, H, svg);
  compositeRect(out, overlay, 0, 0, W, H, 0, 0);
  return { image: out, boxes };
}

module.exports = { render, resolveCoord, evalExpr, evalVisibility };

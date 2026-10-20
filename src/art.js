'use strict';

// SVG generators for every sprite. Each returns an SVG body for a canvas of
// the given size; the atlas rasterizes it. Geometry is integer-based and
// derived from the requested size so components scale cleanly.
const { tokens } = require('./tokens');

const C = tokens.color;
const F = tokens.font;

function rr(x, y, w, h, r, fill, stroke, sw = 0) {
  const s = stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${s}/>`;
}

function text(x, y, size, fill, str, anchor = 'middle', weight = 'bold') {
  return `<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${str}</text>`;
}

function arcPath(cx, cy, r, a0, a1) {
  const p = (a) => {
    const t = ((a - 90) * Math.PI) / 180;
    return [(cx + r * Math.cos(t)).toFixed(2), (cy + r * Math.sin(t)).toFixed(2)];
  };
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

// Knob cap only (no pointer), used under circle-slider rings.
function knobCap(s) {
  const c = s / 2;
  return `<circle cx="${c}" cy="${c}" r="${Math.round(s * 0.34)}" fill="#0f1114" stroke="${C.controlHi}" stroke-width="3"/>`
    + `<circle cx="${c}" cy="${c}" r="${Math.round(s * 0.28)}" fill="#14161a"/>`;
}

// Pointer knob filmstrip for orientation="round": frame i shows the pointer
// at -150..+150 degrees, laid out left-to-right, top-to-bottom, no gaps.
function knobFilmstrip(s, frames, nbx) {
  const c = s / 2;
  let body = '';
  for (let i = 0; i < frames; i++) {
    const ox = (i % nbx) * s;
    const oy = Math.floor(i / nbx) * s;
    const ang = -150 + (300 * i) / (frames - 1);
    body += `<g transform="translate(${ox} ${oy})">${knobCap(s)}`
      + `<rect x="${c - 3}" y="${Math.round(c - s * 0.3)}" width="6" height="${Math.round(s * 0.17)}" rx="3" fill="#f2f2f2" transform="rotate(${ang.toFixed(2)} ${c} ${c})"/></g>`;
  }
  return body;
}

// Circle-slider ring: "off" = dark track, "on" = coloured ring. The engine
// reveals the "on" image as a sector from anglemin to the current value.
// Same construction as the proven Stems Controller sprites: a thick ring with
// flat radial ends spanning exactly anglemin..anglemax, so the engine's sector
// reveal fills it completely at both limits. A notch marks 12 o'clock (50%).
function knobRing(s, color) {
  const c = s / 2;
  const ro = s * 0.49;
  const ri = s * 0.40;
  const pt = (r, a) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${(c + r * Math.cos(t)).toFixed(2)} ${(c + r * Math.sin(t)).toFixed(2)}`;
  };
  const ring = `<path d="M${pt(ro, -150)} A${ro} ${ro} 0 1 1 ${pt(ro, 150)} L${pt(ri, 150)} A${ri} ${ri} 0 1 0 ${pt(ri, -150)} Z" fill="${color}"/>`;
  const notch = `<rect x="${c - 2}" y="${(c - ro).toFixed(2)}" width="4" height="${Math.round(ro - ri)}" fill="#ffffff" fill-opacity="0.55"/>`;
  const cap = `<circle cx="${c}" cy="${c}" r="${(ri - 3).toFixed(2)}" fill="#26282b" stroke="#c8ccd2" stroke-width="2"/>`;
  return ring + notch + cap;
}

function discBase(s) {
  const c = s / 2;
  return `<circle cx="${c}" cy="${c}" r="${c - 2}" fill="#0a0b0d" stroke="${C.controlHi}" stroke-width="4"/>`
    + `<circle cx="${c}" cy="${c}" r="${c - 18}" fill="#070809" stroke="#14161a" stroke-width="2"/>`;
}

// Needle drawn pointing up; the rotation visual spins the whole image.
function discNeedle(s, color) {
  const c = s / 2;
  const top = Math.round(s * 0.05);
  const len = Math.round(s * 0.17);
  return `<line x1="${c}" y1="${top}" x2="${c}" y2="${top + len}" stroke="${color}" stroke-width="${Math.round(s * 0.035)}" stroke-linecap="round"/>`;
}

function discRing(s, color) {
  const c = s / 2;
  return `<circle cx="${c}" cy="${c}" r="${c - 9}" fill="none" stroke="${color}" stroke-width="6"/>`;
}

// Mouse mask: opaque white disc on transparent, valid whether the engine
// keys on alpha or on white pixels.
function discMask(s) {
  const c = s / 2;
  return `<circle cx="${c}" cy="${c}" r="${c}" fill="#ffffff"/>`;
}

function faderTrack(w, h) {
  const cx = Math.round(w / 2);
  let ticks = '';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const y = Math.round(20 + ((h - 40) * i) / (n - 1));
    const long = i === Math.floor(n / 2) ? 8 : 0;
    ticks += `<line x1="${14 - long}" y1="${y}" x2="${cx - 14}" y2="${y}" stroke="#343940" stroke-width="2"/>`
      + `<line x1="${cx + 14}" y1="${y}" x2="${w - 14 + long}" y2="${y}" stroke="#343940" stroke-width="2"/>`;
  }
  return rr(1, 1, w - 2, h - 2, 8, '#0c0d0f', C.panelEdge, 2)
    + `<rect x="${cx - 2}" y="16" width="4" height="${h - 32}" fill="${C.well}"/>${ticks}`;
}

function faderCap(w, h, accent) {
  const stripe = accent ? `<rect x="4" y="${Math.round(h / 2) - 2}" width="${w - 8}" height="4" fill="${accent}"/>`
    : `<rect x="4" y="${Math.round(h / 2) - 2}" width="${w - 8}" height="4" fill="#565b63"/>`;
  return rr(1, 1, w - 2, h - 2, 4, C.capMetal, C.capEdge, 2) + stripe;
}

function hTrack(w, h) {
  const cy = Math.round(h / 2);
  return rr(1, 1, w - 2, h - 2, 12, '#0a0b0d', C.controlHi, 2)
    + `<rect x="40" y="${cy - 3}" width="${w - 80}" height="6" rx="3" fill="${C.well}"/>`
    + `<line x1="40" y1="${cy - 30}" x2="40" y2="${cy + 30}" stroke="#454a52" stroke-width="3"/>`
    + `<line x1="${Math.round(w / 2)}" y1="${cy - 22}" x2="${Math.round(w / 2)}" y2="${cy + 22}" stroke="#454a52" stroke-width="3"/>`
    + `<line x1="${w - 40}" y1="${cy - 30}" x2="${w - 40}" y2="${cy + 30}" stroke="#454a52" stroke-width="3"/>`;
}

function xfCap(w, h) {
  return rr(1, 1, w - 2, h - 2, 4, C.capMetal, C.capEdge, 2)
    + `<rect x="${Math.round(w / 2) - 2}" y="6" width="4" height="${h - 12}" fill="#565b63"/>`;
}

// Vertical VU column: segmented, green to yellow to red from bottom.
function vu(w, h, lit) {
  const seg = 10;
  const n = Math.floor(h / seg);
  let body = '';
  for (let i = 0; i < n; i++) {
    const y = h - (i + 1) * seg;
    const f = i / n;
    const col = lit ? (f > 0.88 ? '#ff3b3b' : f > 0.72 ? '#ffd23d' : '#23d18b') : '#343940';
    body += `<rect x="0" y="${y + 2}" width="${w}" height="${seg - 4}" fill="${col}"/>`;
  }
  return body;
}

function button(w, h, { fill, stroke, sw = 2, radius = 8 }) {
  return rr(Math.ceil(sw / 2), Math.ceil(sw / 2), w - sw, h - sw, radius, fill, stroke, sw);
}

function roundButton(s, { fill, stroke, sw = 4 }, icon = '') {
  const c = s / 2;
  return `<circle cx="${c}" cy="${c}" r="${c - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${icon}`;
}

const icons = {
  note: (s, col) => {
    const c = s / 2;
    return `<path d="M${c + 6} ${c - 18} v26 a9 9 0 1 1 -6 -8.5 v-17.5 l14 4 v6 z" fill="${col}"/>`;
  },
  hand: (s, col) => {
    const c = s / 2;
    return `<circle cx="${c - 4}" cy="${c - 6}" r="12" fill="none" stroke="${col}" stroke-width="4"/>`
      + `<path d="M${c - 2} ${c - 4} v18 m0 -10 h8 v10 h-8" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`;
  },
  lock: (s, col) => {
    const c = s / 2;
    return `<rect x="${c - 14}" y="${c - 2}" width="28" height="22" rx="3" fill="${col}"/>`
      + `<path d="M${c - 9} ${c - 2} v-8 a9 9 0 0 1 18 0 v8" fill="none" stroke="${col}" stroke-width="5"/>`;
  },
  s: (s, col) => text(s / 2, s / 2 + 13, 38, col, 'S'),
  phones: (w, h, col) => {
    const cx = w / 2;
    const cy = h / 2;
    return `<path d="M${cx - 18} ${cy + 12} V${cy} A18 18 0 0 1 ${cx + 18} ${cy} V${cy + 12}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`
      + `<rect x="${cx - 23}" y="${cy + 2}" width="10" height="18" rx="3" fill="${col}"/>`
      + `<rect x="${cx + 13}" y="${cy + 2}" width="10" height="18" rx="3" fill="${col}"/>`;
  },
};

module.exports = {
  rr, text, arcPath, knobCap, knobFilmstrip, knobRing, discBase, discNeedle, discRing, discMask,
  faderTrack, faderCap, hTrack, xfCap, vu, button, roundButton, icons,
};

'use strict';

// Full hardware-style skin, 2560x1600. Every coordinate is an absolute integer;
// sprite references are resolved from the packed atlas (see elements.js).
const A = require('./art');
const { tokens } = require('./tokens');
const { el } = require('./xml');
const { makeElements } = require('./elements');

const C = tokens.color;
const W = tokens.canvas.width;
const H = tokens.canvas.height;

let STAMP = 'dev';
const setStamp = (s) => { STAMP = s; };
// Steps 5 STOP button below the disc, 6 beat/phrase counters above the disc.
// v2 incremental changes: step 1 drop SLOW/QUICK, 2 longer pitch fader, 3 crossfader centre arrow, 4 drop dead dblclick.
let GRID = 'none'; // 'none' | 'overlay' (transparent rhythmzone over scratchwaves) | 'rhythm' (rhythmzone replaces scratchwaves)
const setGrid = (g) => { GRID = g; };
let STEP = 4;
const setStep = (n) => { STEP = n; };
const PH = () => 504;
const PY = () => 596;
const KNOB = 112;
const FRAMES = 61;
const NBX = 11;
const DISC = 450;
const TR = 176;
const PAD_W = 174;
const PAD_H = 148;

const lighten = (hex) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.55 + 255 * 0.45).toString(16).padStart(2, '0')).join('');

const DECKS = [
  { key: 'A', deck: 'left', info: 0, box: 16, tab: 16, body: 0, tempo: 0, color: C.deckA, dark: C.deckADark },
  { key: 'B', deck: 'right', info: 1304, box: 1384, tab: 2480, body: 1392, tempo: 2320, color: C.deckB, dark: C.deckBDark },
];

const box = (x, y, w, h, fill = '#111317', stroke = C.panelEdge, r = 10, sw = 2) => A.rr(x, y, w, h, r, fill, stroke, sw);

function background() {
  let b = `<rect width="${W}" height="${H}" fill="#050607"/>`;
  b += box(16, 16, 2528, 240, '#030304', '#2e3238');
  for (const d of DECKS) b += box(d.box, 272, 1160, 192, '#111317');
  b += box(1192, 272, 176, 192);
  b += box(16, 480, 2528, 1104, C.body, C.bodyEdge, 24, 3);
  b += box(960, 496, 640, 1072, C.panel, C.panelEdge, 16);
  for (const d of DECKS) b += box(40 + d.tempo, 512, 160, 72, '#08090a', '#383d44', 6);
  b += box(976, 596, 128, 748, '#0f1114') + box(1456, 596, 128, 748, '#0f1114') + box(1112, 596, 336, 748, '#111317');
  return b;
}

// Top waveform lanes. In 'strip' mode both lanes shrink to make room for a beat-grid strip below them.
const waves = () => (GRID === 'between'
  ? { A: { y: 20, h: 96, ph: 'ph.a' }, B: { y: 152, h: 96, ph: 'ph.b' } }
  : GRID === 'strip'
  ? { A: { y: 20, h: 96, ph: 'ph.a' }, B: { y: 120, h: 96, ph: 'ph.b' } }
  : { A: { y: 20, h: 112, ph: 'ph.a' }, B: { y: 144, h: 108, ph: 'ph.b' } });

function registerSprites(atlas) {
  atlas.setBackground(background());
  const add = (id, w, h, body) => atlas.add(id, w, h, body);
  const btn = (w, h, fill, stroke, sw = 2, radius = 8) => A.button(w, h, { fill, stroke, sw, radius });

  for (const w of Object.values(waves())) add(w.ph, 4, w.h, `<rect width="4" height="${w.h}" fill="#ffffff"/>`);
  add('cue.up', 11, 40, `<rect width="11" height="40" fill="#ffffff"/>`);
  add('cue.mask', 11, 40, `<rect width="11" height="40" fill="#ffffff"/>`);

  add('knob.cap', KNOB, KNOB, A.knobCap(KNOB));
  add('knob.strip', KNOB * NBX, KNOB * Math.ceil(FRAMES / NBX), A.knobFilmstrip(KNOB, FRAMES, NBX));
  add('mask.knob', KNOB, KNOB, A.discMask(KNOB));

  add('disc.base', DISC, DISC, A.discBase(DISC));
  add('mask.disc', DISC, DISC, A.discMask(DISC));

  if (STEP >= 6) {
    const ticks = [0, 90, 180, 270].map((deg) => '<line x1="30" y1="1" x2="30" y2="6" stroke="#4a4f56" stroke-width="2" transform="rotate(' + deg + ' 30 30)"/>').join('');
    add('bc.base', 60, 60, '<circle cx="30" cy="30" r="26" fill="#08090a" stroke="#2e3238" stroke-width="4"/>' + ticks);
    for (const k of DECKS) add(`bc.ring${k.key}`, 60, 60, `<circle cx="30" cy="30" r="26" fill="none" stroke="${k.color}" stroke-width="4"/>`);
    add('bc.slot', 34, 14, A.rr(1, 1, 32, 12, 6, '#08090a', '#383d44', 2));
    for (const k of DECKS) {
      add(`bc.lit${k.key}`, 34, 14, A.rr(0, 0, 34, 14, 7, k.color));
      add(`bc.first${k.key}`, 34, 14, A.rr(0, 0, 34, 14, 7, lighten(k.color)));
    }
  }
  if (GRID === 'strip') add('ph.s', 4, 32, '<rect width="4" height="32" fill="#ffffff"/>');
  if (GRID === 'rhythm') add('ph.r', 4, 232, '<rect width="4" height="232" fill="#ffffff"/>');
  add('pitch.track', 128, PH(), A.faderTrack(128, PH()));
  if (STEP >= 3) {
    add('ar.xf.off', 64, 64, '<polygon points="20,22 44,22 32,42" fill="#c8ccd2"/>');
    add('ar.xf.on', 64, 64, '<polygon points="20,22 44,22 32,42" fill="#ffffff"/>');
  }
  for (const [side, pts] of [['A', '26,20 26,44 6,32'], ['B', '38,20 38,44 58,32']]) {
    add(`ar.${side}.off`, 64, 64, `<polygon points="${pts}" fill="#c8ccd2"/>`);
    add(`ar.${side}.on`, 64, 64, `<polygon points="${pts}" fill="#ffffff"/>`);
  }
  add('kb.off', 64, 64, btn(64, 64, C.control, C.control, 2, 6));
  add('kb.on', 64, 64, btn(64, 64, C.controlLit, C.padOutlineLit, 2, 6));
  add('ko.off', 84, 64, btn(84, 64, '#0a0b0d', C.controlHi, 2, 6));
  add('ko.on', 84, 64, btn(84, 64, C.controlLit, C.padOutlineLit, 2, 6));
  add('rg.off', 160, 64, btn(160, 64, C.control, C.control, 2, 6));
  add('rg.on', 160, 64, btn(160, 64, C.controlLit, C.padOutlineLit, 2, 6));
  add('rs.off', 76, 64, btn(76, 64, C.control, C.control, 2, 6));
  add('rs.on', 76, 64, btn(76, 64, C.controlLit, C.padOutlineLit, 2, 6));
  add('pitch.cap', 96, 40, A.faderCap(96, 40));
  add('fader.track', 120, 340, A.faderTrack(120, 340));
  add('vu.off', 24, 340, A.vu(24, 340, false));
  add('vu.on', 24, 340, A.vu(24, 340, true));
  add('xf.track', 560, 120, A.hTrack(560, 120));
  add('xf.cap', 40, 100, A.xfCap(40, 100));

  add('pad.off', PAD_W, PAD_H, btn(PAD_W, PAD_H, '#0a0b0d', C.padOutline, 3));
  add('pad.on', PAD_W, PAD_H, btn(PAD_W, PAD_H, C.controlLit, C.padOutlineLit, 3));
  add('tab4.off', 134, 64, btn(134, 64, C.tabIdle, C.controlHi, 2, 6));
  add('tab4.on', 134, 64, btn(134, 64, C.tabActive, C.padOutlineLit, 2, 6));
  add('shift.off', 150, 64, btn(150, 64, C.control, C.controlHi, 2, 6));
  add('shift.on', 150, 64, btn(150, 64, C.controlLit, C.padOutlineLit, 2, 6));
  add('tab.off', PAD_W, 64, btn(PAD_W, 64, C.tabIdle, C.panelEdge, 2, 6));
  add('tab.on', PAD_W, 64, btn(PAD_W, 64, C.tabActive, C.tabActive, 2, 6));

  add('lq.off', 96, 96, btn(96, 96, C.control, C.controlHi, 2, 10));
  add('lc.off', 144, 96, btn(144, 96, '#08090a', C.controlHi, 2, 10));
  add('top.off', 108, 96, btn(108, 96, C.control, C.control, 2, 10));
  add('cb.off', 130, 72, btn(130, 72, C.control, C.controlHi, 2, 8));
  add('sm.off', 68, 72, btn(68, 72, C.control, C.control, 2, 6));
  add('sm.on', 68, 72, btn(68, 72, C.controlLit, C.padOutlineLit, 2, 6));
  add('load.off', 140, 72, btn(140, 72, C.control, C.control, 2, 8));
  add('load.on', 140, 72, btn(140, 72, C.controlLit, C.padOutlineLit, 2, 8));
  add('ham.off', 70, 72, btn(70, 72, C.control, C.controlHi, 2, 8) + [24, 34, 44].map((y) => `<rect x="17" y="${y + 4}" width="36" height="5" rx="2.5" fill="#c8ccd2"/>`).join(''));
  add('ham.on', 70, 72, btn(70, 72, C.controlLit, C.padOutlineLit, 2, 8) + [24, 34, 44].map((y) => `<rect x="17" y="${y + 4}" width="36" height="5" rx="2.5" fill="#ffffff"/>`).join(''));
  const crossArrows = (c) => '<g fill="none" stroke="' + c + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M18 22 h10 l16 20 h10"/><path d="M18 42 h10 l16 -20 h10"/></g>'
    + '<polygon points="54,14 66,22 54,30" fill="' + c + '"/><polygon points="54,34 66,42 54,50" fill="' + c + '"/>';
  add('am.off', 80, 64, btn(80, 64, C.control, C.controlHi, 2, 6) + '<g transform="translate(-2 0)">' + crossArrows('#c8ccd2') + '</g>');
  add('am.on', 80, 64, btn(80, 64, C.controlLit, C.padOutlineLit, 2, 6) + '<g transform="translate(-2 0)">' + crossArrows('#ffffff') + '</g>');
  add('cn2.off', 164, 64, btn(164, 64, C.control, C.controlHi, 2, 6));
  add('cn2.on', 164, 64, btn(164, 64, C.controlLit, C.padOutlineLit, 2, 6));
  add('cn.off', 80, 64, btn(80, 64, C.control, C.controlHi, 2, 6));
  add('cn.on', 80, 64, btn(80, 64, C.controlLit, C.padOutlineLit, 2, 6));
  add('pfl.off', 110, 64, btn(110, 64, C.tabIdle, C.controlHi) + A.icons.phones(110, 64, '#c8ccd2'));
  add('ob.off', 240, 96, btn(240, 96, C.control, C.controlHi, 2, 10));
  add('ob.on', 240, 96, btn(240, 96, C.controlLit, C.padOutlineLit, 2, 10));
  add('ob2.off', 120, 96, btn(120, 96, C.control, C.controlHi, 2, 10));
  add('ob2.on', 120, 96, btn(120, 96, C.controlLit, C.padOutlineLit, 2, 10));
  add('play.off', TR, TR, A.roundButton(TR, { fill: '#0c241a', stroke: C.play }));
  add('play.on', TR, TR, A.roundButton(TR, { fill: '#17543a', stroke: '#8ff0c0' }));
  add('pfl.on', 110, 64, btn(110, 64, '#15171a', C.deckA, 3) + A.icons.phones(110, 64, C.deckA));

  for (const d of DECKS) {
    const k = d.key;
    add(`disc.needle${k}`, DISC, DISC, A.discNeedle(DISC, d.color));
    add(`disc.ring${k}`, DISC, DISC, A.discRing(DISC, d.color));
    add(`sel${k}`, 64, 192, A.rr(1, 1, 62, 190, 10, '#2c3036', '#383d44', 2));
    add(`sel${k}on`, 64, 192, A.rr(1, 1, 62, 190, 10, d.color, d.color, 2));
    add(`cap${k}`, 100, 48, A.faderCap(100, 48, d.color));
    add(`lq.on${k}`, 96, 96, btn(96, 96, k === 'A' ? '#1c2a33' : '#352a18', d.color, 3, 10));
    add(`lc.on${k}`, 144, 96, btn(144, 96, '#08090a', d.color, 3, 10));
    add(`top.on${k}`, 108, 96, btn(108, 96, d.dark, d.color, 3, 10));
    add(`cb.on${k}`, 130, 72, btn(130, 72, d.dark, d.color, 3, 8));
    add(`cue.off${k}`, TR, TR, A.roundButton(TR, { fill: C.tabIdle, stroke: d.color }));
    add(`cue.on${k}`, TR, TR, A.roundButton(TR, { fill: d.dark, stroke: d.color }));
  }
}

function buildXml(R) {
  const E = makeElements(R);
  const lbl = (str, size = 26, color = C.text) => ({ text: str, size, color });

  const info = (d) => {
    const o = d.info;
    const wave = waves()[d.key];
    return el('deck', { deck: d.deck }, [
      ...(GRID === 'rhythm' ? [] : [el('scratchwave', { orientation: 'horizontal' }, [
        E.pos(24, wave.y), E.size(2512, wave.h),
        el('cue', { y: wave.y, height: wave.h }, [el('text', { dx: 10, dy: -3, size: 22 })]),
        el('overlay', {}, [E.size(4, wave.h), E.pos(1278, wave.y), E.stateImg('background', wave.ph, 4, wave.h)]),
      ])]),
      E.button({ x: d.tab, y: 272, w: 64, h: 192, action: 'masterdeck', query: 'masterdeck', off: `sel${d.key}`, on: `sel${d.key}on`,
        label: { text: d.key, size: 44, color: C.textDim, weight: 'bold' }, labelSelected: { text: d.key, size: 44, color: '#ffffff' } }),
      el('cover', {}, [E.pos(96 + o, 288), E.size(104, 104)]),
      E.textzone({ x: 216 + o, y: 284, w: 630, h: 44, size: 38, color: C.text, align: 'left', action: "loaded ? get_title : get_text 'Load a track from Library'" }),
      E.textzone({ x: 216 + o, y: 332, w: 630, h: 36, size: 30, color: C.textDim, align: 'left', action: 'get_artist' }),
      E.textzone({ x: 216 + o, y: 376, w: 520, h: 36, size: 28, color: C.textDim, align: 'left', format: '%spent  /  -%left' }),
      E.textzone({ x: 900 + o, y: 278, w: 260, h: 62, size: 56, color: d.color, align: 'right', format: '%Pbpmex' }),
      E.button({ x: 860 + o, y: 344, w: 64, h: 64, action: 'key_move -1', query: 'false', off: 'kb.off', on: 'kb.on', label: lbl('<', 36) }),
      E.button({ x: 928 + o, y: 344, w: 84, h: 64, action: 'key 0', query: 'false', off: 'ko.off', on: 'ko.on', label: { text: '%keyoffset', size: 30, color: d.color } }),
      E.button({ x: 1016 + o, y: 344, w: 64, h: 64, action: 'key_move +1', query: 'false', off: 'kb.off', on: 'kb.on', label: lbl('>', 36) }),
      E.colorStrip({ x: 1084 + o, y: 354, w: 76, h: 44, source: 'get_key_color' }),
      E.textzone({ x: 1084 + o, y: 354, w: 76, h: 44, size: 28, color: '#000000', action: 'get_key' }),
      el('songpos', { colorPlayed: '#5c626b', colorBass: '#ff5a8a', colorMed: '#7be07a', colorHigh: '#5fd0ff' }, [
        E.pos(96 + o, 412), E.size(1064, 40),
        el('cues', {}, [E.size(11, 40), E.stateImg('up', 'cue.up', 11, 40), E.stateImg('clipmask', 'cue.mask', 11, 40)]),
      ]),
    ]);
  };

  // Beat grid for the top waveforms. Only <rhythmzone> has a grid that is proven on the Remote.
  const topGrid = () => {
    if (GRID === 'none') return [];
    if (GRID === 'between') {
      // Beat-tick lane between the two waveforms: deck A ticks on the upper row, deck B on the lower, never overlapping.
      return [el('rhythmzone', { mirror: 'false', center: 1280, upsidedown: 'false', fade: 100 }, [
        E.pos(24, 120), E.size(2512, 28),
        el('colors', { deck1: '#25c2ff', deck2: '#ff2d3d', deck1_active: '#25c2ff', deck2_active: '#ff2d3d' }),
        el('rhythm', { y: 148, height: 1 }),
        el('grid', { height: 10, width: 4, maxwidth: 8 }, [el('pos', { y1: 121, y2: 135 })]),
      ])];
    }
    if (GRID === 'ticks') {
      // Full-size scratchwaves stay; this zone only contributes bright beat ticks along each lane's bottom edge.
      return [el('rhythmzone', { mirror: 'false', center: 1280, upsidedown: 'false', fade: 100 }, [
        E.pos(24, 20), E.size(2512, 232),
        el('colors', { deck1: '#9fd4f5', deck2: '#f0c987', deck1_active: '#9fd4f5', deck2_active: '#f0c987' }),
        el('rhythm', { y: 250, height: 2 }),
        el('grid', { height: 8, width: 3, maxwidth: 6 }, [el('pos', { y1: 122, y2: 242 })]),
      ])];
    }
    if (GRID === 'strip') {
      return [el('rhythmzone', { mirror: 'false', center: 1280, upsidedown: 'false', fade: 100 }, [
        E.pos(24, 220), E.size(2512, 32),
        el('colors', { deck1: '#3d5566', deck2: '#6b5a3a', deck1_active: C.deckA, deck2_active: C.deckB }),
        el('rhythm', { y: 220, height: 18 }),
        el('grid', { height: 6, width: 3, maxwidth: 6 }, [el('pos', { y1: 240, y2: 246 })]),
        el('overlay', {}, [E.size(4, 32), E.pos(1278, 220), E.stateImg('background', 'ph.s', 4, 32)]),
      ])];
    }
    const clear = GRID === 'overlay';
    const colors = clear
      ? { deck1: 'transparent', deck2: 'transparent', deck1_active: 'transparent', deck2_active: 'transparent' }
      : { deck1: '#4d6f85', deck2: '#8a7249', deck1_active: C.deckA, deck2_active: C.deckB };
    return [el('rhythmzone', { mirror: 'false', center: 1280, upsidedown: 'false', fade: 100 }, [
      E.pos(24, 20), E.size(2512, 232),
      el('colors', colors),
      el('rhythm', { y: 20, height: clear ? 232 : 200 }),
      el('grid', { height: 14, width: 4, maxwidth: 8 }, [el('pos', { y1: clear ? 118 : 224, y2: clear ? 238 : 240 })]),
      ...(clear ? [] : [el('overlay', {}, [E.size(4, 232), E.pos(1278, 20), E.stateImg('background', 'ph.r', 4, 232)])]),
    ])];
  };

  const center = el('group', {}, [
    E.textzone({ x: 1198, y: 280, w: 164, h: 24, size: 18, color: C.textDim, visibility: 'automix', action: 'get_playlist_time' }),
    E.button({ x: 1198, y: 312, w: 80, h: 64, action: 'automix', query: 'automix', off: 'am.off', on: 'am.on' }),
    E.button({ x: 1286, y: 312, w: 80, h: 64, action: 'playlist_randomize', query: 'playlist_randomize', off: 'cn.off', on: 'cn.on', label: lbl('SHUFFLE', 15) }),
    E.button({ x: 1198, y: 388, w: 164, h: 64, action: 'automix ? automix_skip : mix_and_load_next', query: 'false', off: 'cn2.off', on: 'cn2.on', label: lbl('NEXT', 22) }),
  ]);

  const padAt = (d, i) => ({ x: 216 + d.body + (i % 4) * 184, y: 1268 + Math.floor(i / 4) * 160 });
  const pad = (d, i, { action, query, name, color, size = 28, off = 'pad.off', on = 'pad.on', bar = { dx: 37, dy: 120, w: 100, h: 8 } }) => {
    const p = padAt(d, i);
    return [
      E.button({ x: p.x, y: p.y, w: PAD_W, h: PAD_H, action, query, off, on, label: lbl(name, size) }),
      E.colorStrip({ x: p.x + bar.dx, y: p.y + bar.dy, w: bar.w, h: bar.h, source: color }),
    ];
  };

  const padPanels = (d) => {
    const v = `$hw_tab_${d.key}`;
    const hot = tokens.cueColors.flatMap((c, i) => pad(d, i, {
      action: `var '$hw_shift_${d.key}' ? delete_cue ${i + 1} & set '$hw_shift_${d.key}' 0 : holding ? delete_cue ${i + 1} : hot_cue ${i + 1}`,
      query: `var '$hw_shift_${d.key}' ? hot_cue ${i + 1} ? blink : off : hot_cue ${i + 1}`, name: `Cue ${i + 1}`,
      color: `has_cue ${i + 1} ? cue_color ${i + 1} : constant '${tokens.cueHex[i]}'`,
    }));
    const stems = [
      ['Vocal', 'stem_pad Vocal', '#00FF00', 28], ['Instru', 'stem_pad Instru', '#FF7F00', 28],
      ['Bass', 'stem_pad Bass', '#FF0000', 28], ['(Acapella)', 'stem_pad Acapella', '#D8D8D8', 22],
      ['Kick', 'stem_pad Kick', '#0000FF', 28], ['HiHat', 'stem_pad HiHat', '#9600FF', 28],
      ['Stems FX', 'effect_stems off', '#FFFFFF', 26], ['(Instrum.)', 'stem_pad Instrumental', '#D8D8D8', 22],
    ].flatMap(([name, action, col, size], i) => pad(d, i, { action, name, size, color: `constant '${col}'` }));
    const slicer = Array.from({ length: 8 }, (_, i) => pad(d, i, { action: `slicer ${i + 1}`, name: String(i + 1), color: `constant '${tokens.cueHex[i]}'` })).flat();
    const jumps = [[-4, '< 1'], [4, '1 >'], [-8, '< 2'], [8, '2 >'], [-16, '< 4'], [16, '4 >'], [-32, '< 8'], [32, '8 >']];
    const bj = jumps.flatMap(([n, name], i) => pad(d, i, { action: `beatjump ${n > 0 ? '+' : ''}${n}`, name, query: 'false', color: `constant '${d.color}'` }));
    const pnl = (n, kids) => el('panel', { visibility: `var '${v}' ${n}` }, kids);
    return [pnl(0, hot), pnl(1, stems), pnl(2, slicer), pnl(3, bj)];
  };

  const tabs = (d) => {
    const v = `$hw_tab_${d.key}`;
    return ['HOTCUES', 'STEMS 2.0', 'SLICER', 'BEATJUMP'].map((name, i) => E.button({
      x: 216 + d.body + [1, 0, 2, 3][i] * 142, y: 1196, w: 134, h: 64, action: `set '${v}' ${i}`, query: `var '${v}' ${i}`,
      off: 'tab4.off', on: 'tab4.on', label: lbl(name, 20),
    })).concat([
      // SHIFT: latches the shifted pad function (hot cues: delete) for the next pad press.
      E.button({ x: 216 + d.body + 4 * 142, y: 1196, w: 150, h: 64, action: `toggle '$hw_shift_${d.key}'`, query: `var '$hw_shift_${d.key}'`, off: 'shift.off', on: 'shift.on', label: lbl('SHIFT', 22) }),
    ]);
  };

  // Shared beat/phrase counter under the headphone buttons: ring = 16-beat phrase with the beat number
  // inside (deck A left, deck B right); 4 boxes per deck = the 4 beats of the bar.
  const counters = () => {
    const out = [];
    for (const [d, x] of [[DECKS[0], 1133], [DECKS[1], 1367]]) {
      out.push(
        E.visual({ x, y: 1258, w: 60, h: 60, off: 'bc.base', deck: d.deck }),
        E.visual({ x, y: 1258, w: 60, h: 60, type: 'circle', source: 'get_beat_num 16', on: `bc.ring${d.key}`, deck: d.deck }),
        E.textzone({ x, y: 1273, w: 60, h: 32, size: 28, color: C.text, action: 'get_beat_num', deck: d.deck }),
      );
    }
    DECKS.forEach((d, row) => {
      for (let i = 1; i <= 4; i++) {
        const x = 1203 + (i - 1) * 40;
        const y = 1271 + row * 20;
        out.push(
          E.visual({ x, y, w: 34, h: 14, off: 'bc.slot' }),
          E.visual({ x, y, w: 34, h: 14, off: i === 1 ? `bc.first${d.key}` : `bc.lit${d.key}`, visibility: `get_beat_num ${i}`, deck: d.deck }),
        );
      }
    });
    return out;
  };

  const body = (d) => {
    const b = d.body;
    const t = d.tempo;
    const rowX = (i) => 224 + b + i * 122;
    const topBtn = (i, name, action, query) => E.button({ x: rowX(i), y: 512, w: 108, h: 96, action, query, off: 'top.off', on: `top.on${d.key}`, label: lbl(name, 24) });
    // Loop size control: halve / loop on-off with the length shown / double.
    const lx = rowX(2);
    const topBtns = [
      topBtn(0, 'IN', 'loop_in'), topBtn(1, 'OUT', 'loop_out'),
      E.button({ x: lx, y: 512, w: 96, h: 96, action: 'loop_half', query: 'false', off: 'lq.off', on: `lq.on${d.key}`, label: lbl('<', 44) }),
      E.button({ x: lx + 104, y: 512, w: 144, h: 96, action: 'loop', rightclick: 'temporary', query: 'loop', off: 'lc.off', on: `lc.on${d.key}`, label: { text: '%loop', size: 40, color: C.text } }),
      E.button({ x: lx + 256, y: 512, w: 96, h: 96, action: 'loop_double', query: 'false', off: 'lq.off', on: `lq.on${d.key}`, label: lbl('>', 44) }),
      topBtn(5, 'SYNC', 'sync'),
    ];
    const dx = 389 + b;
    const dd = dx - 30;
    const corner = (x, y, name, action, q) => E.button({ x, y, w: 130, h: 72, action, query: q, off: 'cb.off', on: `cb.on${d.key}`, label: lbl(name, 22) });
    return el('deck', { deck: d.deck }, [
      ...topBtns,
      E.visual({ x: dd, y: 675, w: DISC, h: DISC, off: 'disc.base' }),
      E.visual({ x: dd, y: 675, w: DISC, h: DISC, type: 'circle', source: 'get position', on: `disc.ring${d.key}`, visibility: 'songpos_warning ? blink : true' }),
      E.visual({ x: dd, y: 675, w: DISC, h: DISC, type: 'rotation', source: 'get rotation', on: `disc.needle${d.key}` }),
      el('scratch', {}, [E.pos(dd, 675), E.size(DISC, DISC), E.stateImg('mousemask', 'mask.disc', DISC, DISC)]),
      E.textzone({ x: dx + 45, y: 810, w: 300, h: 72, size: 64, color: d.color, format: '%Pbpmex' }),
      E.textzone({ x: dx + 45, y: 885, w: 120, h: 36, size: 24, color: '#c8ccd2', format: '%Ppitch%%' }),
      E.textzone({ x: dx + 225, y: 885, w: 120, h: 36, size: 24, color: '#c8ccd2', format: '%pitchrange' }),
      E.textzone({ x: dx + 82, y: 936, w: 226, h: 40, size: 30, color: '#c8ccd2', format: '%spent' }),
      E.textzone({ x: dx + 82, y: 978, w: 226, h: 42, size: 34, color: C.text, format: '%left' }),
      E.button({ x: 232 + b, y: 648, w: 130, h: 72, action: "pitch_range '6,12,18,24,30' +1 deck", query: 'false', off: 'cb.off', on: `cb.on${d.key}`, label: lbl('RANGE %pitchrange', 20) }),
      corner(806 + b, 648, 'VINYL', 'vinyl_mode', 'vinyl_mode'),
      corner(232 + b, 1080, 'KEY LOCK', 'key_lock', 'key_lock'),
      corner(806 + b, 1080, 'SLIP', 'slip_mode', 'slip_mode'),
      ...(STEP >= 5 ? [E.button({ x: 504 + b, y: 1129, w: 160, h: 64, action: 'stop_button', query: 'false', off: 'rg.off', on: 'rg.on', icon: { sysicon: 'stop_button', width: 40, height: 40 } })] : []),

      E.textzone({ x: 40 + t, y: 512, w: 160, h: 72, size: 34, color: C.text, format: '%Ppitch' }),
      ...(STEP >= 1 ? [] : [
        E.button({ x: 40 + t, y: 596, w: 76, h: 64, action: 'pitch_reset', query: 'false', off: 'rs.off', on: 'rs.on', label: lbl('SLOW', 20) }),
        E.button({ x: 124 + t, y: 596, w: 76, h: 64, action: 'pitch_zero', query: 'false', off: 'rs.off', on: 'rs.on', label: lbl('QUICK', 20) }),
      ]),
      E.linearSlider({ x: 56 + t, y: PY(), w: 128, h: PH(), action: 'pitch', orientation: 'vertical', direction: 'down', dblclick: STEP >= 4 ? undefined : 'pitch 100%', rightclick: 'temporary', track: 'pitch.track', cap: 'pitch.cap' }),
      E.button({ x: d.key === 'A' ? 184 : 2312, y: PY() + PH() / 2 - 32, w: 64, h: 64, action: 'pitch_reset', query: 'loaded ? pitch_reset ? blink : off : off', off: `ar.${d.key}.off`, on: `ar.${d.key}.on` }),
      E.button({ x: 48 + t, y: 1116, w: 68, h: 72, action: 'pitch_bend -2% 500ms', rightclick: 'pitch_bend -5% 500ms', off: 'sm.off', on: 'sm.on', label: lbl('-', 40) }),
      E.button({ x: 124 + t, y: 1116, w: 68, h: 72, action: 'pitch_bend +2% 500ms', rightclick: 'pitch_bend +5% 500ms', off: 'sm.off', on: 'sm.on', label: lbl('+', 40) }),
      E.button({ x: 32 + t, y: 1210, w: TR, h: TR, action: 'cue_button', query: 'cue_button', off: `cue.off${d.key}`, on: `cue.on${d.key}`, label: lbl('CUE', 36, '#ffffff') }),
      E.button({ x: 32 + t, y: 1398, w: TR, h: TR, action: 'play_pause', query: 'pioneer_play', off: 'play.off', on: 'play.on', icon: { sysicon: 'play_button', width: 72, height: 72 } }),

      ...tabs(d),
      ...padPanels(d),
    ]);
  };

  // Mixer: knob + label button. The label button resets the knob to its centre.
  const knob = (d, x, y, name, action) => [
    E.filmstripKnob({ x, y, s: KNOB, action, dblclick: STEP >= 4 ? undefined : `${action} 50%`, cap: 'knob.cap', strip: 'knob.strip', frames: FRAMES, nbx: NBX, mask: 'mask.knob' }),
    E.button({ x, y: y + KNOB, w: KNOB, h: 64, action: `${action} 50%`, label: { action: `${action} 50% ? get_text '${name}' : ${action} & param_cast 'percentage'`, size: 26, color: C.text } }),
  ];
  const mixerSide = (d, kx) => el('deck', { deck: d.deck }, [
    ...knob(d, kx, 600, 'HIGH', 'eq_high'),
    ...knob(d, kx, 784, 'MID', 'eq_mid'),
    ...knob(d, kx, 968, 'LOW', 'eq_low'),
    ...knob(d, kx, 1152, 'FILTER', 'filter'),
  ]);
  const channel = (d, fx, kx, vx, px) => el('deck', { deck: d.deck }, [
    ...knob(d, kx, 600, 'GAIN', 'gain'),
    E.linearSlider({ x: fx, y: 788, w: 120, h: 340, action: 'level', orientation: 'vertical', track: 'fader.track', cap: `cap${d.key}` }),
    E.visual({ x: vx, y: 788, w: 24, h: 340, type: 'linear', orientation: 'vertical', direction: 'up', source: 'get_level', off: 'vu.off', on: 'vu.on' }),
    E.button({ x: px, y: 1148, w: 110, h: 64, action: 'pfl', query: 'pfl', off: 'pfl.off', on: 'pfl.on' }),
  ]);

  const mixer = el('group', {}, [
    E.button({ x: 984, y: 512, w: 140, h: 72, action: "get_automix_song 'title' & param_equal '' ? load : playlist_load_and_keep & browser_window 'automix' & browser_scroll 'top' & browser_move 'bottom'", deck: 'left', off: 'load.off', on: 'load.on', label: lbl('LOAD A', 24) }),
    E.button({ x: 1210, y: 512, w: 140, h: 72, action: 'browser', off: 'load.off', on: 'load.on', label: lbl('BROWSE', 24) }),
    E.button({ x: 1358, y: 512, w: 70, h: 72, action: "set '$hw_ov' 4", off: 'ham.off', on: 'ham.on' }),
    E.button({ x: 1436, y: 512, w: 140, h: 72, action: "get_automix_song 'title' & param_equal '' ? load : playlist_load_and_keep & browser_window 'automix' & browser_scroll 'top' & browser_move 'bottom'", deck: 'right', off: 'load.off', on: 'load.on', label: lbl('LOAD B', 24) }),
    ...(STEP >= 6 ? counters() : []),
    mixerSide(DECKS[0], 984),
    mixerSide(DECKS[1], 1464),
    channel(DECKS[0], 1116, 1120, 1252, 1121),
    channel(DECKS[1], 1324, 1328, 1284, 1329),
    E.linearSlider({ x: 1000, y: 1410, w: 560, h: 120, action: 'crossfader', orientation: 'horizontal', rightclick: 'temporary', track: 'xf.track', cap: 'xf.cap' }),
    ...(STEP >= 3 ? [E.button({ x: 1248, y: 1346, w: 64, h: 64, action: 'crossfader 50%', query: 'false', off: 'ar.xf.off', on: 'ar.xf.on' })] : []),
  ]);

  const overlay = (n, title, kids) => el('panel', { visibility: `var '$hw_ov' ${n}` }, [
    E.colorStrip({ x: 16, y: 480, w: 2528, h: 1104, source: "constant '#0c0e10'" }),
    E.textzone({ x: 48, y: 496, w: 900, h: 72, size: 40, color: C.text, align: 'left', text: title }),
    E.button({ x: 2280, y: 496, w: 240, h: 96, action: "set '$hw_ov' 0", off: 'ob.off', on: 'ob.on', label: lbl('CLOSE', 30) }),
    ...kids,
  ]);
  const ob = (x, y, name, action, query, size = 30) => E.button({ x, y, w: 240, h: 96, action, query, off: 'ob.off', on: 'ob.on', label: lbl(name, size) });
  const ob2 = (x, y, name, action) => E.button({ x, y, w: 120, h: 96, action, off: 'ob2.off', on: 'ob2.on', label: lbl(name, 36) });

  // Up-next list from get_automix_song. The first row has no index (the next song); later rows pass 2, 3, ...
  const automixRows = () => Array.from({ length: 8 }, (_, i) => {
    const n = i + 1;
    const idx = n === 1 ? '' : ' ' + n;
    const song = '`get_automix_song "artist"' + idx + '` - `get_automix_song "title"' + idx + '`';
    return E.textzone({
      x: 72, y: 616 + i * 112, w: 2400, h: 80, size: 44, color: i === 0 ? C.text : C.textDim, align: 'left',
      visibility: n === 1 ? undefined : "get_automix_song 'title'" + idx + " & param_equal '' ? false : true",
      action: "get_text '" + n + ".   " + song + "'",
    });
  });

  const sampler = (() => {
    const pads = [];
    for (let n = 1; n <= 12; n++) {
      const x = 72 + ((n - 1) % 6) * 396;
      const y = 616 + Math.floor((n - 1) / 6) * 236;
      pads.push(
        E.colorStrip({ x, y, w: 380, h: 220, source: `sampler_pad ${n} ? constant '#727271' : constant '#2B2A29'` }),
        E.colorStrip({ x: x + 30, y: y + 188, w: 320, h: 12, source: `sampler_loaded ${n} ? get_sample_color ${n} : constant '#2B2A29'` }),
        E.textzone({ x, y: y + 40, w: 380, h: 110, size: 30, color: C.text, action: `get_sample_name ${n}` }),
        E.button({ x, y, w: 380, h: 220, action: `sampler_pad ${n}` }),
      );
    }
    return overlay(1, 'SAMPLER', [
      ...pads,
      E.textzone({ x: 72, y: 1124, w: 180, h: 60, size: 28, color: C.textDim, text: 'VOLUME' }),
      E.linearSlider({ x: 260, y: 1104, w: 560, h: 120, action: 'sampler_volume_master', orientation: 'horizontal', track: 'xf.track', cap: 'xf.cap' }),
      E.textzone({ x: 830, y: 1124, w: 140, h: 60, size: 28, color: C.text, action: "sampler_volume_master & param_cast 'percentage'" }),
      ob2(1020, 1112, '-', 'sampler_bank -1'),
      E.textzone({ x: 1150, y: 1124, w: 200, h: 72, size: 36, color: C.text, action: 'get_sampler_bank' }),
      ob2(1360, 1112, '+', 'sampler_bank +1'),
      ob(1560, 1112, 'MODE', 'sampler_mode +1'),
    ]);
  })();

  const half = (d, ox, kids) => el('deck', { deck: d.deck }, [
    E.textzone({ x: ox + 20, y: 600, w: 1160, h: 56, size: 36, color: d.color, align: 'left', text: `DECK ${d.key}` }),
    ...kids,
  ]);
  const loopPanel = overlay(2, 'LOOP', DECKS.map((d, i) => {
    const ox = i ? 1300 : 40;
    const x = (c) => ox + 20 + c * 290;
    return half(d, ox, [
      ob(x(0), 676, '1/8', 'loop_roll 0.125'), ob(x(1), 676, '1/4', 'loop_roll 0.25'), ob(x(2), 676, '1/2', 'loop_roll 0.5'), ob(x(3), 676, '1', 'loop_roll 1'),
      ob(x(0), 816, 'IN', 'loop_in'), ob(x(1), 816, 'OUT', 'loop_out'), ob(x(2), 816, 'LOOP', 'loop', 'loop'), ob(x(3), 816, '1/2X', 'loop_half'),
      ob(x(0), 956, '2X', 'loop_double'), ob(x(1), 956, '4 BEAT', 'loop 4'), ob(x(2), 956, '8 BEAT', 'loop 8'), ob(x(3), 956, '16 BEAT', 'loop 16'),
    ]);
  }));

  const fxPanel = overlay(3, 'EFFECTS', DECKS.map((d, i) => {
    const ox = i ? 1300 : 40;
    return half(d, ox, [
      ob(ox + 20, 676, 'FX ON', 'effect_active', 'effect_active'),
      E.textzone({ x: ox + 280, y: 676, w: 500, h: 96, size: 30, color: C.text, action: 'get_effect_name & param_uppercase' }),
      ob2(ox + 800, 676, '<', 'effect_select -1'), ob2(ox + 940, 676, '>', 'effect_select +1'),
      E.linearSlider({ x: ox + 20, y: 816, w: 560, h: 120, action: 'effect_slider 1', orientation: 'horizontal', visibility: 'effect_has_slider 1', track: 'xf.track', cap: 'xf.cap' }),
      E.textzone({ x: ox + 600, y: 836, w: 560, h: 80, size: 28, color: C.text, align: 'left', visibility: 'effect_has_slider 1', action: "get_text '`get_effect_slider_name 1 & param_uppercase` - `get_effect_slider_text 1`'" }),
      E.linearSlider({ x: ox + 20, y: 976, w: 560, h: 120, action: 'effect_slider 2', orientation: 'horizontal', visibility: 'effect_has_slider 2', track: 'xf.track', cap: 'xf.cap' }),
      E.textzone({ x: ox + 600, y: 996, w: 560, h: 80, size: 28, color: C.text, align: 'left', visibility: 'effect_has_slider 2', action: "get_text '`get_effect_slider_name 2 & param_uppercase` - `get_effect_slider_text 2`'" }),
    ]);
  }));

  return el('Skin', {
    name: 'HW Controller Remote', version: 8, width: W, height: H, nbdecks: 2,
    author: 'hw-skin build', comment: 'Hardware-style 2560x1600 remote skin', preview: 'preview.png',
  }, [
    el('font', { name: tokens.font }),
    ...DECKS.map(info),
    ...topGrid(),
    center,
    el('panel', { visibility: "var '$hw_ov' 0" }, [...DECKS.map(body), mixer,
      E.textzone({ x: 1000, y: 1548, w: 560, h: 24, size: 18, color: C.textDim, text: STAMP })]),
    sampler, loopPanel, fxPanel,
    overlay(4, 'MENU', [
      ob(72, 616, 'SAMPLER', "set '$hw_ov' 1", 'false'),
      ob(344, 616, 'LOOP', "set '$hw_ov' 2", 'false'),
      ob(616, 616, 'EFFECTS', "set '$hw_ov' 3", 'false'),
      ob(888, 616, 'AUTOMIX LIST', "set '$hw_ov' 5", 'false', 26),
    ]),
    overlay(5, 'AUTOMIX QUEUE', automixRows()),
  ]);
}

module.exports = {
  setStep,
  setGrid,
  setStamp,
  registerSprites,
  buildXml,
  allowUnproven: new Set([]),
  minTouch: 64,
};

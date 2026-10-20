'use strict';

// Builders for VDJ skin elements. All positions are absolute integers and
// every graphic reference is resolved from the packed atlas via R(id), so a
// sprite coordinate can never drift from the art that was packed.
const { el } = require('./xml');

function int(n, what) {
  if (!Number.isInteger(n)) throw new Error(`${what} must be an integer, got ${n}`);
  return n;
}

const pos = (x, y) => el('pos', { x: int(x, 'pos.x'), y: int(y, 'pos.y') });
const size = (w, h) => el('size', { width: int(w, 'size.width'), height: int(h, 'size.height') });

function makeElements(R) {
  const img = (tag, id) => {
    const r = R(id);
    return el(tag, { x: r.x, y: r.y });
  };

  // State sprites must be exactly the element size; enforce at build time.
  const stateImg = (tag, id, w, h) => {
    const r = R(id);
    if (r.w !== w || r.h !== h) throw new Error(`sprite ${id} is ${r.w}x${r.h}, element needs ${w}x${h}`);
    return el(tag, { x: r.x, y: r.y });
  };

  // The Remote ignores text="..."; static strings must use format="..." (as the stock skin does).
  function text({ text: literal, ...attrs }) {
    return el('text', { weight: 'bold', align: 'center', ...attrs, format: literal !== undefined ? literal : attrs.format });
  }

  function button({ x, y, w, h, action, query, dblclick, rightclick, visibility, off, on, label, labelSelected, icon, deck }) {
    return el('button', { action, query, dblclick, rightclick, visibility, deck }, [
      pos(x, y), size(w, h),
      off && stateImg('off', off, w, h),
      on && stateImg('on', on, w, h),
      label && text(label),
      labelSelected && el('textselected', { weight: 'bold', align: 'center', size: labelSelected.size, color: labelSelected.color, format: labelSelected.text }),
      icon && el('icon', icon),
    ]);
  }

  function textzone({ x, y, w, h, visibility, deck, ...t }) {
    return el('textzone', { visibility, deck }, [pos(x, y), size(w, h), text(t)]);
  }

  function visual({ x, y, w, h, type, source, orientation, direction, visibility, deck, off, on }) {
    return el('visual', { type, source, orientation, direction, visibility, deck }, [
      pos(x, y), size(w, h),
      off && stateImg('off', off, w, h),
      on && stateImg('on', on, w, h),
    ]);
  }

  function colorStrip({ x, y, w, h, source, visibility, deck }) {
    return el('visual', { type: 'color', source, visibility, deck }, [pos(x, y), size(w, h)]);
  }

  // Linear fader: <fader><pos> is the cap's sprite coordinate, as in the stock skin.
  function linearSlider({ x, y, w, h, action, orientation, direction, dblclick, rightclick, visibility, deck, track, cap }) {
    const c = R(cap);
    return el('slider', { action, orientation, direction, dblclick, rightclick, visibility, deck }, [
      pos(x, y), size(w, h),
      stateImg('off', track, w, h),
      stateImg('on', track, w, h),
      el('fader', {}, [size(c.w, c.h), el('pos', { x: c.x, y: c.y })]),
    ]);
  }

  // Proven remote knob (Stems Controller pattern): circle slider with ring sprites.
  function circleKnob({ x, y, s, action, dblclick, frommiddle, deck, off, on, mask }) {
    return el('slider', { orientation: 'circle', relative: 'no', action, frommiddle: frommiddle ? 'true' : undefined, dblclick, deck }, [
      pos(x, y),
      el('circle', { direction: 'cw', anglemin: -150, anglemax: 150 }),
      size(s, s),
      stateImg('on', on, s, s),
      stateImg('off', off, s, s),
      stateImg('mousemask', mask, s, s),
    ]);
  }

  // Pointer knob: round slider whose fader is a frame filmstrip.
  function filmstripKnob({ x, y, s, action, dblclick, deck, cap, strip, frames, nbx, mask }) {
    const r = R(strip);
    if (r.w !== s * nbx || r.h !== s * Math.ceil(frames / nbx)) throw new Error(`filmstrip ${strip} geometry mismatch`);
    return el('slider', { orientation: 'round', relative: 'no', action, dblclick, deck }, [
      pos(x, y), size(s, s),
      stateImg('off', cap, s, s),
      el('fader', { move: 'vert' }, [el('pos', { x: r.x, y: r.y, nb: frames, nbx })]),
      stateImg('mousemask', mask, s, s),
    ]);
  }

  return { pos, size, img, stateImg, text, button, textzone, visual, colorStrip, linearSlider, circleKnob, filmstripKnob };
}

module.exports = { makeElements, pos, size };

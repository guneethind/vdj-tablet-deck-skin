'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { unzipSync } = require('fflate');
const { build } = require('../src/build');
const skin = require('../src/skin');
const { render } = require('../src/preview');
const { decodePng } = require('../src/raster');

skin.setStep(6);
skin.setGrid('between');

function buildTo(name) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'hwskin-'));
  const r = build(skin, { outDir: out, zipName: name });
  return { out, r, xml: fs.readFileSync(path.join(out, 'skin.xml'), 'utf8') };
}

test('full skin builds, validates, and ships a flat zip', () => {
  const { r } = buildTo('T.zip');
  assert.ok(r.sheet.height <= 4096 && r.sheet.width === 2560);
  const names = Object.keys(unzipSync(fs.readFileSync(r.zipPath))).sort();
  assert.deepEqual(names, ['preview.png', 'skin.png', 'skin.xml']);
});

test('key controls resolve to the designed absolute positions', () => {
  const { out, xml } = buildTo('T.zip');
  const sheet = decodePng(fs.readFileSync(path.join(out, 'skin.png')));
  const { boxes } = render(xml, sheet);
  const has = (name, x, y, w, h) => boxes.some((b) => b.name === name && b.x === x && b.y === y && b.w === w && b.h === h);
  assert.ok(has('visual', 359, 675, 450, 450), 'deck A disc');
  assert.ok(has('visual', 1751, 675, 450, 450), 'deck B disc');
  assert.ok(has('button', 232, 1080, 130, 72), 'deck A key lock corner');
  assert.ok(has('button', 2198, 1080, 130, 72), 'deck B slip corner');
  assert.ok(has('songpos', 96, 412, 1064, 40), 'deck A songpos');
  assert.ok(has('songpos', 1400, 412, 1064, 40), 'deck B songpos');
  assert.ok(has('button', 2480, 272, 64, 192), 'deck B tab sits right of its info strip');
  assert.ok(has('button', 16, 272, 64, 192), 'deck A tab sits left of its info strip');
  assert.ok(has('slider', 1000, 1410, 560, 120), 'crossfader');
});

test('no coordinate uses relative or math syntax', () => {
  const { xml } = buildTo('T.zip');
  assert.equal(/\s(x|y|width|height)="[^"]*[+\-*/][^"]*"/.test(xml.replace(/<(scratchwave|cue|text|grid)[^>]*>/g, '')), false);
});

test('colours are hex only and key controls are wired', () => {
  const { xml } = buildTo('T.zip');
  for (const m of xml.matchAll(/constant\s+'([^']*)'/g)) assert.match(m[1], /^#[0-9a-fA-F]{6}$/);
  const jumps = [...xml.matchAll(/<button action="beatjump [^"]*"([^>]*)>/g)];
  assert.equal(jumps.length, 16);
  for (const j of jumps) assert.match(j[1], /query="false"/);
  assert.equal((xml.match(/action="pitch_reset"/g) || []).length, 2);
  assert.equal((xml.match(/action="key_move [+-]1"/g) || []).length, 4);
  assert.equal((xml.match(/action="key 0"/g) || []).length, 2);
  assert.equal((xml.match(/action="stop_button"/g) || []).length, 2);
  assert.equal((xml.match(/action="toggle '\$hw_shift_[AB]'"/g) || []).length, 2);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evalExpr, resolveCoord, evalVisibility, render } = require('../src/preview');

test('math is evaluated left to right without precedence (wiki example)', () => {
  assert.equal(evalExpr('100/2+10'), 60);
  assert.equal(evalExpr('10+100/2'), 55);
  assert.equal(evalExpr('136-24'), 112);
});

test('only +/- prefixed values are relative to the parent origin', () => {
  assert.equal(resolveCoord('270', 243), 270);
  assert.equal(resolveCoord('+42+90', 0), 132);
  assert.equal(resolveCoord('-38', 920), 882);
  assert.equal(resolveCoord('+24-321', 920), 623);
});

test('visibility evaluator handles var compares and ternaries', () => {
  assert.equal(evalVisibility("var '$t' 0", {}), true);
  assert.equal(evalVisibility("var '$t' 1", {}), false);
  assert.equal(evalVisibility('eq_reset ? false : true', {}), false);
  assert.equal(evalVisibility('automix ? false : true', {}), true);
});

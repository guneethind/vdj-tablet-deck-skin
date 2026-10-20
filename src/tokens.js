'use strict';

// Design tokens shared by sprite art and XML text styling.
// Deck colours reuse the stock Remote 8 skin hexes; cue colours use VDJ's
// predefined colour names where one exists (Skin Default Colors wiki).
const tokens = Object.freeze({
  canvas: { width: 2560, height: 1600 },
  font: 'Arial',
  color: Object.freeze({
    body: '#0b0c0e',
    bodyEdge: '#2e3238',
    panel: '#111317',
    panelEdge: '#2e3238',
    well: '#030304',
    control: '#1c1f24',
    controlHi: '#3a3f46',
    controlLit: '#2a2e34',
    tabActive: '#2d3238',
    tabIdle: '#0c0d0f',
    padOutline: '#3a3f46',
    padOutlineLit: '#c9ced6',
    text: '#e8eaed',
    textDim: '#8b9098',
    capMetal: '#bfc3c8',
    capEdge: '#8a9098',
    deckA: '#7fb0d0',
    deckADark: '#1c2a33',
    deckB: '#d0a768',
    deckBDark: '#352a18',
    play: '#3fbf86',
  }),
  // Default hot cue order: red, orange, blue, yellow, green, pink, cyan, violet.
  cueColors: Object.freeze(['red', 'orange', 'blue', 'yellow', 'green', 'pink', 'cyan', 'violet']),
  cueHex: Object.freeze(['#ff0000', '#ff7f00', '#0000ff', '#ffff00', '#00ff00', '#e69696', '#00ffff', '#9600ff']),
  stemColors: Object.freeze({
    Vocal: 'green', Instru: 'orange', Bass: 'red', Acapella: 'lightgray',
    Kick: 'blue', HiHat: 'violet', StemsFX: 'white', Instrumental: 'lightgray',
  }),
  gutter: 4,
  maxSheet: 4096,
});

module.exports = { tokens };

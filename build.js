'use strict';

// Builds "VDJ Tablet Deck Skin <version>.zip" into ./dist and optionally installs it
// into the local VirtualDJ Skins and RemoteSkins folders (--install).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { build } = require('./src/build');
const skin = require('./src/skin');

const VERSION = require('./package.json').version;
const d = new Date();
const p2 = (n) => String(n).padStart(2, '0');
skin.setStep(6);
skin.setGrid('between');
skin.setStamp(`Version ${VERSION} | Build ${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`);

const out = path.join(__dirname, 'dist');
const name = `VDJ Tablet Deck Skin v${VERSION}.zip`;
const r = build(skin, { outDir: out, zipName: name });
console.log(`ok: ${r.elements} nodes, ${r.sprites} sprites, sheet ${r.sheet.width}x${r.sheet.height}`);
console.log(`zip: ${r.zipPath}`);

if (process.argv.includes('--install')) {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  for (const sub of ['Skins', 'RemoteSkins']) {
    const dir = path.join(base, 'VirtualDJ', sub);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(r.zipPath, path.join(dir, name));
    console.log(`installed -> ${dir}`);
  }
}

'use strict';

// Minimal deterministic XML writer. Attribute values are fully escaped so the
// output is well-formed XML (VDJ accepts &amp; in scripts, as the installed
// Stems Controller remote skin demonstrates).
function esc(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function el(name, attrs = {}, children = []) {
  const flat = (Array.isArray(children) ? children : [children]).flat(Infinity).filter(Boolean);
  for (const c of flat) {
    if (!c || typeof c.name !== 'string' || typeof c.attrs !== 'object') {
      throw new Error(`<${name}> has an invalid child: ${JSON.stringify(c)}`);
    }
  }
  return { name, attrs, children: flat };
}

function render(node, depth = 0) {
  const pad = '\t'.repeat(depth);
  const attrs = Object.entries(node.attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');
  const kids = node.children.filter(Boolean);
  if (!kids.length) return `${pad}<${node.name}${attrs}/>`;
  return `${pad}<${node.name}${attrs}>\n${kids.map((c) => render(c, depth + 1)).join('\n')}\n${pad}</${node.name}>`;
}

// No XML prolog: every proven VDJ skin starts directly with <Skin>.
function toXml(root) {
  return `${render(root)}\n`;
}

module.exports = { el, toXml, esc };

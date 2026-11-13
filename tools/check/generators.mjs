// Reports plumbing the song generators copy instead of importing from tools/arranger/lib.mjs:
//   npm run check:generators
// It lists three things, each with its file and line:
//   - a generator declaring a function under the name of a lib.mjs export (a different function
//     with the same name confuses readers; rename it, or import lib's),
//   - a generator function that is a copy of a lib.mjs function (import lib's instead),
//   - the same helper in two or more generators (move it into lib.mjs if it is plumbing; if it is
//     a musical choice that two songs share on purpose, add it to ALIKE below with the reason).
// Copies are compared after removing comments and formatting and renaming parameters, so a
// renamed copy is still found; a helper rewritten another way is not. A one-line setting that
// only calls a lib.mjs function (each song's `nm` spelling, a `vel` cap) is not a copy.
// It is a report, like the clash count in check:songs: it always exits 0 and never blocks a deploy.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAst } from 'vite';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'arranger');

// Helpers that look the same in several songs on purpose: musical choices, not plumbing.
// Each entry lists every `file:name` in the group and says why it stays.
const ALIKE = [
  [['club.mjs:bassNote', 'ivory-and-ash.mjs:bassNote'], 'each song picks its own bass register'],
  [['sunliner.mjs:stabBar', 'velvet-freeway.mjs:stabBar'], 'each song keeps its own stab pattern'],
  [['sunliner.mjs:answered', 'velvet-freeway.mjs:hookBar'], 'each song keeps its own hook shape'],
];

// Top-level functions in a module: `function f() {}` and `const f = (...) => ...` / `function`.
function functionsOf(file) {
  const text = readFileSync(join(DIR, file), 'utf8');
  const program = parseAst(text);
  const lineOf = (offset) => text.slice(0, offset).split('\n').length;
  const found = [];
  const exported = new Set();
  const imported = new Set();
  for (const node of program.body) {
    if (node.type === 'ImportDeclaration' && node.source.value === './lib.mjs') {
      for (const spec of node.specifiers) imported.add(spec.local.name);
    }
    const isExport = node.type === 'ExportNamedDeclaration';
    const decl = isExport ? node.declaration : node;
    if (!decl) continue;
    if (decl.type === 'FunctionDeclaration' && decl.id) {
      found.push({ name: decl.id.name, fn: decl });
      if (isExport) exported.add(decl.id.name);
    }
    if (decl.type === 'VariableDeclaration') {
      for (const d of decl.declarations) {
        if (d.id.type !== 'Identifier') continue;
        if (isExport) exported.add(d.id.name);
        if (d.init && (d.init.type === 'ArrowFunctionExpression' || d.init.type === 'FunctionExpression')) {
          found.push({ name: d.id.name, fn: d.init });
        }
      }
    }
  }
  const fns = found.map(({ name, fn }) => ({
    file,
    name,
    line: lineOf(fn.start),
    body: shape(fn),
    binding: isBinding(fn, imported),
  }));
  return { fns, exported };
}

// The function's syntax tree without positions, with parameters renamed p0, p1, ..., so comments,
// formatting and parameter names don't matter; `x => expr` and `x => { return expr; }` match.
function shape(fn) {
  let body = fn.body;
  if (body.type === 'BlockStatement' && body.body.length === 1 && body.body[0].type === 'ReturnStatement') {
    body = body.body[0].argument ?? body;
  }
  const renames = new Map();
  fn.params.forEach((p, i) => {
    const id = p.type === 'AssignmentPattern' ? p.left : p;
    if (id.type === 'Identifier') renames.set(id.name, `p${i}`);
  });
  const params = fn.params.map((p) => (p.type === 'AssignmentPattern' ? canonical(p.right, renames) : '_'));
  return JSON.stringify([params, canonical(body, renames)]);
}

function canonical(node, renames) {
  if (Array.isArray(node)) return node.map((n) => canonical(n, renames));
  if (!node || typeof node !== 'object') return node;
  if (node.type === 'Identifier' && renames.has(node.name)) return { type: 'Identifier', name: renames.get(node.name) };
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'start' || key === 'end' || key === 'range' || key === 'loc') continue;
    out[key] = canonical(value, renames);
  }
  return out;
}

// A one-line setting: the body is a single call to something imported from lib.mjs.
function isBinding(fn, imported) {
  const body = fn.body;
  return body.type === 'CallExpression' && body.callee.type === 'Identifier' && imported.has(body.callee.name);
}

const lib = functionsOf('lib.mjs');
const libExports = lib.exported;
const libByShape = new Map(lib.fns.map((f) => [f.body, f.name]));

const files = readdirSync(DIR).filter((f) => f.endsWith('.mjs') && f !== 'lib.mjs').sort();
const sameName = [];
const copies = [];
const byShape = new Map();
for (const file of files) {
  for (const f of functionsOf(file).fns) {
    if (libExports.has(f.name)) sameName.push(`${f.file}:${f.line}  ${f.name} has the name of a lib.mjs export; rename it, or import lib's`);
    else if (libByShape.has(f.body)) copies.push(`${f.file}:${f.line}  ${f.name} copies lib.mjs ${libByShape.get(f.body)}; import ${libByShape.get(f.body)} instead`);
    else if (!f.binding) {
      if (!byShape.has(f.body)) byShape.set(f.body, []);
      byShape.get(f.body).push(f);
    }
  }
}

const shared = [];
for (const group of byShape.values()) {
  if (new Set(group.map((f) => f.file)).size < 2) continue;
  const keys = group.map((f) => `${f.file}:${f.name}`);
  if (ALIKE.some(([members]) => keys.every((k) => members.includes(k)))) continue;
  shared.push(`${group.map((f) => `${f.file}:${f.line} ${f.name}`).join(', ')}`);
}

const section = (title, lines) => {
  if (!lines.length) return;
  console.log(`\n${title}`);
  for (const line of lines) console.log(`  ${line}`);
};
console.log(`Checked ${files.length} generator scripts against lib.mjs (${libExports.size} exports).`);
section('Same name as a lib.mjs export:', sameName);
section('Copies of a lib.mjs function:', copies);
section('The same helper in more than one generator (move plumbing into lib.mjs; list a shared musical choice in ALIKE):', shared);
const total = sameName.length + copies.length + shared.length;
console.log(total ? `\n${total} to fix or explain. This is a report; it does not fail.` : '\nNo copies found.');

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from './parse.js';

const kit = process.argv[2];
if (!kit) throw new Error('Usage: node verify.mjs /absolute/path/to/kit');
const cases = JSON.parse(readFileSync(resolve(kit, 'practice/input/cases.json'), 'utf8'));
const expected = JSON.parse(readFileSync(resolve(kit, 'practice/reference/expected.json'), 'utf8'));
const { marked } = await import(pathToFileURL(resolve(kit, 'baselines/vendor/marked/marked.esm.js')));
const mismatches = [];
for (let i = 0; i < cases.length; i++) {
  const actual = parse(cases[i].markdown);
  const wanted = expected.cases[i].html;
  if (actual !== wanted) {
    let at = 0;
    while (actual[at] === wanted[at] && at < actual.length) at++;
    mismatches.push({ id: cases[i].id, at, actual: actual.slice(at, at + 100), expected: wanted.slice(at, at + 100) });
  }
}
console.log(JSON.stringify({ passed: cases.length - mismatches.length, total: cases.length, mismatches }, null, 2));
if (mismatches.length) process.exitCode = 1;

// Fixed adversarial fragments exercise combinations absent from the practice
// examples. This data is generated at test time and is never used by parse.
const fragments = ['alpha', '*b*', '**c**', '_d_', '~e~', '`f`', '[g](https://example.org)', '\\*', '<i>h</i>', '\n', '  \n', '&amp;', '&#0;', 'a@b.org', '[x][r]', '\t', '> q\n', '- a\n', '~~', 'www.example.org', '<code>', '</code>'];
let state = 74117;
const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
let fuzzPassed = 0;
for (let i = 0; i < 3000; i++) {
  let source = '';
  const count = 1 + random() % 20;
  for (let j = 0; j < count; j++) source += fragments[random() % fragments.length] + (random() & 1 ? ' ' : '');
  if (i % 3 === 0) source += '\n\n[r]: /target "title"\n';
  const actual = parse(source);
  const wanted = marked.parse(source);
  if (actual !== wanted) {
    console.error(JSON.stringify({ fuzzCase: i, source, actual, expected: wanted }));
    process.exitCode = 1;
    break;
  }
  fuzzPassed++;
}
console.log(JSON.stringify({ fuzzPassed, fuzzTotal: 3000 }));

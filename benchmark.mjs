import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const kit = process.argv[2];
if (!kit) throw new Error('Usage: node benchmark.mjs /absolute/path/to/kit [worker entry|baseline]');
if (process.argv[3] === 'worker') {
  const target = process.argv[4] === 'entry' ? resolve('parse.js') : resolve(kit, 'baselines/vendor/marked/marked.esm.js');
  const module = await import(pathToFileURL(target));
  const render = module.parse;
  const cases = JSON.parse(readFileSync(resolve(kit, 'practice/input/cases.json'), 'utf8'));
  const expected = JSON.parse(readFileSync(resolve(kit, 'practice/reference/expected.json'), 'utf8')).cases;
  const before = process.cpuUsage();
  const start = performance.now();
  const html = cases.map(item => render(item.markdown));
  const serialized = JSON.stringify(html);
  const wallMs = performance.now() - start;
  const cpu = process.cpuUsage(before);
  const passed = html.reduce((sum, item, index) => sum + Number(item === expected[index].html), 0);
  console.log(JSON.stringify({ cpuMs: (cpu.user + cpu.system) / 1000, wallMs, passed, total: cases.length, bytes: Buffer.byteLength(serialized) }));
  if (passed !== cases.length) process.exitCode = 1;
} else {
  const results = { entry: [], baseline: [] };
  for (let round = 0; round < 7; round++) {
    const order = round % 2 ? ['baseline', 'entry'] : ['entry', 'baseline'];
    for (const target of order) {
      const child = spawnSync(process.execPath, [new URL(import.meta.url).pathname, kit, 'worker', target], { encoding: 'utf8' });
      if (child.status !== 0) throw new Error(child.stderr + child.stdout);
      results[target].push(JSON.parse(child.stdout));
    }
  }
  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const entryCpuMs = median(results.entry.map(row => row.cpuMs));
  const baselineCpuMs = median(results.baseline.map(row => row.cpuMs));
  console.log(JSON.stringify({ entryCpuMs, baselineCpuMs, speedup: baselineCpuMs / entryCpuMs, results }, null, 2));
}

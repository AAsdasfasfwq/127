#!/usr/bin/env node
// QA sweep for a time range: renders every --step seconds, reports scene errors, timeline
// gaps, slow frames and blank/flat frames.
//   node tools/check.js --from 138.2 --to 302.25 --sections s2 [--step 0.5]
'use strict';
const path = require('path');
const { startServer, launch, openFilm, parseArgs } = require('./lib');
(async () => {
  const a = parseArgs(process.argv);
  const root = path.resolve(__dirname, '..');
  const from = parseFloat(a.from || 0), to = parseFloat(a.to || 1030.3), step = parseFloat(a.step || 0.5);
  const { server, url } = await startServer(root);
  const br = await launch({ chrome: a.chrome });
  const page = await openFilm(br, url, { sections: a.sections, dev: a.dev });
  const tl = await page.evaluate(() => window.__timeline());
  const gaps = tl.gaps.filter(([g0, g1]) => g1 > from && g0 < to);
  console.log(`scenes in range: ${tl.scenes.filter((s) => s.end > from && s.start < to).length}, overlays: ${tl.overlays.filter((s) => s.end > from && s.start < to).length}`);
  if (gaps.length) console.log('GAPS (no base scene):', JSON.stringify(gaps)); else console.log('no timeline gaps ✓');
  const slow = [], flat = [];
  let total = 0, n = 0, worst = 0;
  for (let t = from; t < to; t += step) {
    const t0 = Date.now();
    await page.evaluate((tt) => window.__seek(tt), t);
    const dt = Date.now() - t0;
    total += dt; n++; worst = Math.max(worst, dt);
    if (dt > 400) slow.push(`${t.toFixed(2)}s:${dt}ms`);
    const v = await page.evaluate(() => {
      const c = document.getElementById('out');
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, 1920, 1080).data;
      let s = 0, s2 = 0, k = 0;
      for (let i = 0; i < d.length; i += 4 * 997) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; s += l; s2 += l * l; k++; }
      const m = s / k; return Math.sqrt(Math.max(0, s2 / k - m * m));
    });
    if (v < 3) flat.push(t.toFixed(2));
  }
  const errs = await page.evaluate(() => window.__errors.slice(0, 30));
  console.log(`frames checked: ${n}, avg ${(total / n).toFixed(0)} ms, worst ${worst} ms`);
  if (slow.length) console.log('SLOW (>400ms):', slow.slice(0, 40).join(' '));
  if (flat.length) console.log('FLAT/BLANK frames (very low contrast):', flat.slice(0, 40).join(' '));
  if (errs.length) console.log('ERRORS:\n' + errs.join('\n')); else console.log('no scene errors ✓');
  if (page.__errs.length) console.log('page errors:', page.__errs.slice(0, 10).join('\n'));
  await br.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });

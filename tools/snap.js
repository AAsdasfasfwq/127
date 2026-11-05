#!/usr/bin/env node
// QA stills.  Examples:
//   node tools/snap.js --times 12,14.5,20 --out /tmp/shots            (full-res JPGs)
//   node tools/snap.js --range 138.2:160:0.5 --sheet /tmp/s2a.jpg      (contact sheet)
//   node tools/snap.js --range 0:30:1 --sections s1 --sheet sheet.jpg --cols 6 --thumb 480
//   add --bench to print per-frame render time, --png for lossless.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { startServer, launch, openFilm, parseArgs } = require('./lib');

(async () => {
  const a = parseArgs(process.argv);
  const root = path.resolve(__dirname, '..');
  let times = [];
  if (a.times) times = String(a.times).split(',').map(Number);
  if (a.range) {
    const [s, e, st] = String(a.range).split(':').map(Number);
    for (let t = s; t <= e + 1e-9; t += st || 1) times.push(+t.toFixed(4));
  }
  if (!times.length) { console.log('give --times or --range'); process.exit(1); }
  const outDir = path.resolve(a.out || path.join(root, 'out', 'snaps'));
  fs.mkdirSync(outDir, { recursive: true });
  const { server, url } = await startServer(root);
  const br = await launch({ chrome: a.chrome, gpu: !!a.gpu });
  const page = await openFilm(br, url, { sections: a.sections, dev: a.dev });
  const files = [];
  let total = 0;
  for (const t of times) {
    const t0 = Date.now();
    const nErr = await page.evaluate((tt) => window.__seek(tt), t);
    const dt = Date.now() - t0;
    total += dt;
    const data = await page.evaluate((png) => (png ? window.__framePNG() : window.__frameJPEG(0.92)), !!a.png);
    const buf = Buffer.from(data.split(',')[1], 'base64');
    const f = path.join(outDir, `f_${t.toFixed(2).padStart(8, '0')}.${a.png ? 'png' : 'jpg'}`);
    fs.writeFileSync(f, buf);
    files.push(f);
    if (a.bench) console.log(`t=${t.toFixed(2)}  ${dt} ms`);
    if (nErr) {
      const errs = await page.evaluate(() => window.__errors.slice(-3));
      console.log(`ERRORS at t=${t}:\n` + errs.join('\n'));
    }
  }
  console.log(`${files.length} frames → ${outDir}  (avg render ${(total / files.length).toFixed(0)} ms)`);
  if (a.sheet) {
    const cols = parseInt(a.cols || Math.min(6, files.length), 10);
    const thumb = parseInt(a.thumb || 384, 10);
    const rows = Math.ceil(files.length / cols);
    const list = path.join(outDir, '_list.txt');
    fs.writeFileSync(list, files.map((f) => `file '${f}'\nduration 1`).join('\n'));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `scale=${thumb}:-1,drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=1:fontcolor=white@0,tile=${cols}x${rows}:padding=4:color=0x111111`,
      '-frames:v', '1', path.resolve(a.sheet)]);
    // label overlay (times) via a second pass for readability
    console.log('sheet → ' + path.resolve(a.sheet) + `  (${cols}x${rows}, order: ${times.join(', ')})`);
  }
  await br.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });

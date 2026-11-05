#!/usr/bin/env node
// Render the music+sfx stem for a time range and measure it (agents can't listen —
// they check levels). Also writes a preview mix with the voice-over.
//   node tools/audio.js --from 138.2 --to 302.25 --out /tmp/s2.wav [--sections s2] [--mix]
// Prints: peak dBFS, integrated loudness (LUFS) of stem and of stem-vs-VO ratio.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { startServer, launch, openFilm, parseArgs } = require('./lib');

function wavHeader(len, sr, ch) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + len, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(sr, 24);
  h.writeUInt32LE(sr * ch * 2, 28); h.writeUInt16LE(ch * 2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(len, 40);
  return h;
}
function loud(file, extra = []) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...extra, '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  return (r.stderr || '') + (r.stdout || '');
}
function summary(txt) {
  const I = /I:\s+(-?[\d.]+) LUFS/.exec(txt.slice(txt.lastIndexOf('Summary')));
  const P = /Peak:\s+(-?[\d.]+) dBFS/.exec(txt.slice(txt.lastIndexOf('Summary')));
  return { I: I ? +I[1] : null, peak: P ? +P[1] : null };
}

(async () => {
  const a = parseArgs(process.argv);
  const root = path.resolve(__dirname, '..');
  const from = parseFloat(a.from || 0), to = parseFloat(a.to || from + 60);
  const out = path.resolve(a.out || path.join(root, 'out', 'audio_preview.wav'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { server, url } = await startServer(root);
  const br = await launch({ chrome: a.chrome });
  const page = await openFilm(br, url, { sections: a.sections, dev: a.dev });
  const WIN = 60;
  const i0 = Math.floor(from / WIN), i1 = Math.floor((to - 1e-6) / WIN);
  const parts = [];
  let sr = 48000, ch = 2;
  for (let i = i0; i <= i1; i++) {
    const r = await page.evaluate((k) => window.__renderAudioWindow(k), i);
    sr = r.sampleRate; ch = r.channels;
    parts.push(Buffer.from(r.pcm16, 'base64'));
    process.stdout.write(`window ${i} [${r.start}-${r.end}] events=${r.events}\n`);
  }
  const pcm = Buffer.concat(parts);
  const full = out.replace(/\.wav$/, '') + '_full.wav';
  fs.writeFileSync(full, Buffer.concat([wavHeader(pcm.length, sr, ch), pcm]));
  const off = from - i0 * WIN;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(off), '-t', String(to - from), '-i', full, out]);
  fs.unlinkSync(full);
  const st = summary(loud(out));
  console.log(`stem  → ${out}\n  integrated ${st.I} LUFS, true peak ${st.peak} dBFS`);
  const vo = path.join(root, 'assets', 'voiceover.mp3');
  const vtxt = loud(vo, ['-ss', String(from), '-t', String(to - from)]);
  const vs = summary(vtxt);
  console.log(`voice-over same range: ${vs.I} LUFS → stem sits ${(vs.I - st.I).toFixed(1)} LU under the voice (aim 10–16 LU; music beds can be 8 in pauses)`);
  if (a.mix) {
    const mix = out.replace(/\.wav$/, '_mix.wav');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(from), '-t', String(to - from), '-i', vo, '-i', out,
      '-filter_complex', '[0:a]aresample=48000[v];[1:a]volume=0.92[b];[v][b]amix=inputs=2:normalize=0[m]', '-map', '[m]', mix]);
    console.log('mix   → ' + mix);
  }
  await br.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });

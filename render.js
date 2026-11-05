#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// render.js — renders the film to MP4 with Puppeteer + ffmpeg.
//
//   npm install                 (installs puppeteer + its Chrome)
//   node render.js              → out/127_final.mp4  (1920×1080, 30 fps, voice + score)
//
// Options
//   --out out/127_final.mp4   output file
//   --workers 4               parallel browsers (each renders a contiguous chunk)
//   --from 0 --to 1030.3      render a time range (seconds) — quick previews
//   --sections s3             only load these sections (faster for partial renders)
//   --crf 16 --preset medium  x264 quality / speed
//   --png                     lossless frame transfer (slower) instead of JPEG q=0.95
//   --gpu                     use the real GPU for WebGL (default: SwiftShader, safest)
//   --no-audio                skip the music/sfx render + mux (video only)
//   --audio-only              only render out/tmp/fx_music.wav and mux with existing video
//   --resume                  reuse finished chunks in out/tmp
//   --chrome /path/to/chrome  custom browser (or env CHROME_PATH)
// Determinism: every frame is a pure function of time, so chunks can render in any
// order on any number of workers and concatenate seamlessly.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { startServer, launch, openFilm, parseArgs } = require('./tools/lib');

const ROOT = __dirname;
const FPS = 30;
const DURATION = 1030.3;
const VO = path.join(ROOT, 'assets', 'voiceover.mp3');

function ffmpegOk() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch (_) { return false; }
}
const fmtT = (s) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };

function writeWav(file, pcmChunks, sampleRate, channels) {
  const dataLen = pcmChunks.reduce((n, b) => n + b.length, 0);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + dataLen, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * channels * 2, 28); h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(dataLen, 40);
  const fd = fs.openSync(file, 'w');
  fs.writeSync(fd, h);
  for (const b of pcmChunks) fs.writeSync(fd, b);
  fs.closeSync(fd);
}

async function renderAudio(br, url, tmp, a, from, to) {
  const page = await openFilm(br, url, { sections: a.sections });
  const n = await page.evaluate(() => window.__audioWindows);
  const evs = await page.evaluate(() => window.__audioEvents);
  const WIN = 60;
  const i0 = Math.floor(from / WIN), i1 = Math.min(n - 1, Math.floor((to - 1e-6) / WIN));
  console.log(`♪ rendering music + sfx: windows ${i0 + 1}–${i1 + 1} of ${n}, ${evs} events`);
  const chunks = [];
  let sr = 48000, ch = 2, peak = 0;
  for (let i = i0; i <= i1; i++) {
    const t0 = Date.now();
    const r = await page.evaluate((k) => window.__renderAudioWindow(k), i);
    sr = r.sampleRate; ch = r.channels; peak = Math.max(peak, r.peak);
    chunks.push(Buffer.from(r.pcm16, 'base64'));
    console.log(`♪ window ${i + 1}/${n}  [${r.start.toFixed(0)}–${r.end.toFixed(0)} s]  ${r.events} events  ${(Date.now() - t0) / 1000}s`);
  }
  const wav = path.join(tmp, 'fx_music.wav');
  writeWav(wav, chunks, sr, ch);
  fs.writeFileSync(wav + '.start', String(i0 * WIN));
  console.log(`♪ ${wav}  (peak ${(20 * Math.log10(peak || 1e-9)).toFixed(1)} dBFS)`);
  await page.close();
  return wav;
}

async function renderChunk(br, url, a, k, f0, f1, tmp, progress) {
  const file = path.join(tmp, `chunk_${String(k).padStart(3, '0')}_${f0}_${f1}.mp4`);
  const done = file + '.done';
  if (a.resume && fs.existsSync(done)) { progress(k, f1 - f0, true); return file; }
  const page = await openFilm(br, url, { sections: a.sections, log: false });
  const codec = a.png ? 'png' : 'mjpeg';
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', codec, '-i', '-',
    '-c:v', 'libx264', '-preset', a.preset || 'medium', '-crf', String(a.crf || 16), '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  let ffErr = null;
  ff.stdin.on('error', (e) => { ffErr = e; });
  const closed = new Promise((res) => ff.on('close', res));
  for (let f = f0; f < f1; f++) {
    const t = f / FPS;
    await page.evaluate((tt) => window.__seek(tt), t);
    const data = await page.evaluate((png) => (png ? window.__framePNG() : window.__frameJPEG(0.95)), !!a.png);
    const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    if (ffErr) throw ffErr;
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    progress(k, 1);
  }
  ff.stdin.end();
  const code = await closed;
  if (code !== 0) throw new Error(`ffmpeg exited with code ${code} for chunk ${k}`);
  const errs = await page.evaluate(() => window.__errors.slice(0, 10));
  if (errs.length) console.warn(`\n[chunk ${k}] scene errors:\n` + errs.join('\n'));
  await page.close();
  fs.writeFileSync(done, 'ok');
  return file;
}

(async () => {
  const a = parseArgs(process.argv);
  if (!ffmpegOk()) { console.error('ffmpeg not found in PATH — install it first (https://ffmpeg.org).'); process.exit(1); }
  const outFile = path.resolve(a.out || path.join(ROOT, 'out', '127_final.mp4'));
  const tmp = path.join(path.dirname(outFile), 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const from = Math.max(0, parseFloat(a.from || 0));
  const to = Math.min(DURATION, parseFloat(a.to || DURATION));
  const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
  const workers = Math.max(1, parseInt(a.workers || 4, 10));
  const { server, url } = await startServer(ROOT);
  console.log(`● 127 — rendering ${fmtT(from)} → ${fmtT(to)}  (${f1 - f0} frames, ${workers} workers)`);

  let wav = path.join(tmp, 'fx_music.wav');
  if (!a['no-audio'] && (!a.resume || !fs.existsSync(wav))) {
    const br = await launch({ chrome: a.chrome, gpu: !!a.gpu });
    wav = await renderAudio(br, url, tmp, a, from, to);
    await br.close();
  }
  const video = path.join(tmp, 'video.mp4');
  if (!a['audio-only']) {
    const total = f1 - f0;
    const per = Math.ceil(total / workers);
    let doneFrames = 0, lastPrint = 0;
    const tStart = Date.now();
    const progress = (k, n) => {
      doneFrames += n;
      if (Date.now() - lastPrint < 1000 && doneFrames < total) return;
      lastPrint = Date.now();
      const el = (Date.now() - tStart) / 1000;
      const fps = doneFrames / Math.max(0.001, el);
      process.stdout.write(`\r▶ ${doneFrames}/${total} frames  ${(100 * doneFrames / total).toFixed(1)}%  ${fps.toFixed(2)} fps  ETA ${fmtT((total - doneFrames) / Math.max(0.01, fps))}   `);
    };
    const jobs = [];
    for (let k = 0; k < workers; k++) {
      const s = f0 + k * per, e = Math.min(f1, s + per);
      if (s >= e) continue;
      jobs.push((async () => {
        const br = await launch({ chrome: a.chrome, gpu: !!a.gpu });
        try { return await renderChunk(br, url, a, k, s, e, tmp, progress); } finally { await br.close(); }
      })());
    }
    const files = await Promise.all(jobs);
    process.stdout.write('\n');
    const list = path.join(tmp, 'chunks.txt');
    fs.writeFileSync(list, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video], { stdio: 'inherit' });
    console.log(`▶ video → ${video}`);
  }
  // mux: voice-over on top, music/sfx stem underneath, loudness-normalised for YouTube
  const dur = (f1 - f0) / FPS;
  const args = ['-v', 'error', '-y', '-i', video, '-ss', String(from), '-t', String(dur), '-i', VO];
  let filter;
  if (!a['no-audio'] && fs.existsSync(wav)) {
    const wavStart = fs.existsSync(wav + '.start') ? parseFloat(fs.readFileSync(wav + '.start', 'utf8')) : 0;
    args.push('-ss', String(Math.max(0, from - wavStart)), '-t', String(dur), '-i', wav);
    filter = '[1:a]aresample=48000,aformat=channel_layouts=stereo,apad[vo];[2:a]aresample=48000,volume=0.92[bg];' +
      '[vo][bg]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.97:level=false,loudnorm=I=-14:TP=-1.5:LRA=11[a]';
  } else {
    filter = '[1:a]aresample=48000,apad,loudnorm=I=-14:TP=-1.5:LRA=11[a]';
  }
  args.push('-filter_complex', filter, '-map', '0:v', '-map', '[a]', '-t', String(dur), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', outFile);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  console.log(`✔ done → ${outFile}`);
  server.close();
})().catch((e) => { console.error('\n✖ ' + (e && e.stack || e)); process.exit(1); });

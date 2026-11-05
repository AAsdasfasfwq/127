// ─────────────────────────────────────────────────────────────────────────────
// main.js — boot: fonts → script timings → sections → expose the render API.
//   window.__ready              Promise, resolves when everything is loaded
//   window.__seek(t)            render frame at time t (s) into #out
//   window.__frameJPEG(q)       current frame as data URL (render.js uses this)
//   window.__renderAudioWindow(i) / window.__audioWindows   offline music+sfx mix
//   window.__timeline()         timeline QA report, window.__errors
// URL params: ?render (hide UI) · ?t=SECONDS (start time) · ?sections=s1,s2 (load subset)
// ─────────────────────────────────────────────────────────────────────────────
import { setOutput, renderFrame, DURATION, FPS, SECTIONS, errors, timelineReport, TOTAL_FRAMES } from './core/engine.js';
import { FONT_LOADS, F } from './core/text.js';
import * as audio from './core/audio.js';

const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const out = document.getElementById('out');
setOutput(out);
if (RENDER) document.body.classList.add('render');

async function loadFonts() {
  const jobs = [];
  for (const [fam, weights, italic] of FONT_LOADS) {
    for (const w of weights) {
      jobs.push(document.fonts.load(`${w} 48px ${F[fam]}`));
      if (italic) jobs.push(document.fonts.load(`italic ${w} 48px ${F[fam]}`));
    }
  }
  await Promise.all(jobs);
  await document.fonts.ready;
}

async function boot() {
  await loadFonts();
  const script = await (await fetch('./assets/script.json')).json();
  const words = script.segments.flatMap((s) => s.words || []).filter((w) => w.start < 1027.6);
  audio.setSpeech(words);
  window.__words = words;
  window.__segments = script.segments;
  const only = params.get('sections');
  const mod = await import('./sections/index.js');
  await mod.load(only ? only.split(',') : null);
  const dev = params.get('dev'); // e.g. ?dev=dev/rig_test.js&sections=none → scratch playgrounds
  if (dev) await import('./' + dev);

  window.__DURATION = DURATION;
  window.__FPS = FPS;
  window.__TOTAL_FRAMES = TOTAL_FRAMES;
  window.__errors = errors;
  window.__timeline = timelineReport;
  window.__seek = async (t) => { await renderFrame(t); return errors.length; };
  window.__frameJPEG = (q = 0.95) => out.toDataURL('image/jpeg', q);
  window.__framePNG = () => out.toDataURL('image/png');
  window.__audioWindows = audio.windowCount();
  window.__audioEvents = audio.eventCount();
  window.__renderAudioWindow = (i) => audio.renderWindow(i);
  const t0 = parseFloat(params.get('t') || '0') || 0;
  await renderFrame(t0);
  if (!RENDER) setupUI(t0);
  return true;
}
window.__ready = boot().catch((e) => { console.error(e); window.__bootError = String(e && e.stack || e); throw e; });

// ── preview UI (not used when rendering) ────────────────────────────────────
function setupUI(t0) {
  const stage = document.getElementById('stage');
  const wrap = document.getElementById('wrap');
  const fit = () => {
    const r = wrap.getBoundingClientRect();
    const s = Math.min(r.width / 1920, r.height / 1080);
    stage.style.transform = `translate(${r.left + (r.width - 1920 * s) / 2}px, ${r.top + (r.height - 1080 * s) / 2}px) scale(${s})`;
  };
  addEventListener('resize', fit); fit();
  const bar = document.getElementById('bar'), head = document.getElementById('head');
  const tc = document.getElementById('tc'), secEl = document.getElementById('sec'), errEl = document.getElementById('err');
  const vo = document.getElementById('vo');
  const COLORS = ['#5a2416', '#7a3a1c', '#2e3a48', '#5b3a6e', '#3a2a22', '#8e1f14', '#2f6f94'];
  SECTIONS.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 's';
    d.style.left = (s.start / DURATION) * 100 + '%';
    d.style.width = ((s.end - s.start) / DURATION) * 100 + '%';
    d.style.background = COLORS[i % COLORS.length];
    d.textContent = `${s.id.toUpperCase()} · ${s.title}`;
    bar.appendChild(d);
  });
  let t = t0, playing = false, busy = false, actx = null, src = null;
  const fmt = (x) => { const m = Math.floor(x / 60), s = x - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`; };
  const draw = async () => {
    if (busy) return; busy = true;
    await renderFrame(t);
    busy = false;
    tc.textContent = fmt(t) + `  f${Math.round(t * FPS)}`;
    const sec = SECTIONS.find((s) => t >= s.start && t < s.end);
    secEl.textContent = sec ? `${sec.id} · ${sec.title}` : '';
    errEl.textContent = errors.length ? `${errors.length} errors (see console)` : '';
    head.style.left = (t / DURATION) * 100 + '%';
  };
  const stopFx = () => { try { src && src.stop(); } catch (_) {} src = null; };
  const play = async () => {
    playing = true;
    document.getElementById('play').textContent = '❚❚ Pause';
    vo.currentTime = Math.min(t, 1027.7);
    if (document.getElementById('fx').checked) {
      actx = actx || new AudioContext({ sampleRate: audio.SR });
      const { buffer, offset } = await audio.renderPreview(t, 60);
      if (!playing) return;
      stopFx();
      src = actx.createBufferSource(); src.buffer = buffer; src.connect(actx.destination);
      src.start(0, offset);
    }
    vo.play();
    const loop = async () => {
      if (!playing) return;
      t = vo.ended ? Math.min(DURATION, t + 1 / 30) : vo.currentTime;
      await draw();
      requestAnimationFrame(loop);
    };
    loop();
  };
  const pause = () => { playing = false; vo.pause(); stopFx(); document.getElementById('play').textContent = '▶ Play'; };
  const seek = (x) => { t = Math.max(0, Math.min(DURATION - 1 / FPS, x)); if (playing) { pause(); } draw(); history.replaceState(null, '', `?t=${t.toFixed(2)}${params.get('sections') ? '&sections=' + params.get('sections') : ''}`); };
  document.getElementById('play').onclick = () => (playing ? pause() : play());
  document.getElementById('back').onclick = () => seek(t - 1);
  document.getElementById('fwd').onclick = () => seek(t + 1);
  document.getElementById('fb').onclick = () => seek(t - 1 / FPS);
  document.getElementById('ff').onclick = () => seek(t + 1 / FPS);
  bar.onclick = (e) => { const r = bar.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * DURATION); };
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    if (e.code === 'ArrowRight') seek(t + (e.shiftKey ? 5 : 1));
    if (e.code === 'ArrowLeft') seek(t - (e.shiftKey ? 5 : 1));
    if (e.key === '.') seek(t + 1 / FPS);
    if (e.key === ',') seek(t - 1 / FPS);
  });
  draw();
}

// ─────────────────────────────────────────────────────────────────────────────
// audio.js — procedural score + sound design, rendered OFFLINE with Web Audio.
//
// Sections register EVENTS (pure data + a scheduling function). Nothing plays live
// during rendering: render.js asks the page to render the mix window-by-window in an
// OfflineAudioContext, writes fx_music.wav, then ffmpeg mixes it UNDER the voice-over.
//
//   import { at } from '../../core/audio.js'
//   at(t, dur, 'music' | 'sfx' | 'amb', (ac, out, when, R) => { ...build nodes, start(when)... })
// • t is absolute film time (s). `when` is the local context time to start at.
// • dur = how long the event can sound (incl. tail). Hard max: MAX_EVENT seconds.
//   Long beds must be built from overlapping ≤12 s events (synth.js helpers do this).
// • R = per-context resources: R.white/pink/brown (noise buffers), R.reverb (send input),
//   R.ks(freq,…) Karplus-Strong buffers, R.rand (seeded).
// The VO is NOT in this mix. Music is auto-ducked under speech from word timings.
// ─────────────────────────────────────────────────────────────────────────────
import { mulberry32, clamp } from './util.js';
import { DURATION } from './engine.js';

export const SR = 48000;
export const WIN = 60;       // seconds per render window
export const PRE = 14;       // pre-roll seconds (lets tails & reverb settle across windows)
export const MAX_EVENT = 13; // seconds — keep every event shorter than PRE

const events = [];
let speech = [];             // [[start,end], ...] voice activity
export const MIX = {
  music: 0.42,               // bus gains (linear) — conservative, VO sits on top
  sfx: 0.55,
  amb: 0.45,
  duckTo: 0.36,              // music level while the narrator speaks (≈ -9 dB)
  ambDuckTo: 0.7,
  reverbReturn: 0.32,
  master: 0.9,
};

export function at(t, dur, bus, fn) {
  if (!(t >= -0.5) || !isFinite(t)) return;
  if (dur > MAX_EVENT) {
    console.warn(`audio event at ${t.toFixed(2)} dur ${dur} > MAX_EVENT; clamped`);
    dur = MAX_EVENT;
  }
  events.push({ t: Math.max(0, t), dur, bus, fn });
}
export const eventCount = () => events.length;

/** Called at boot with Whisper word timings → voice activity map for ducking. */
export function setSpeech(words) {
  const raw = words.filter((w) => w.end > w.start && (w.probability ?? 1) > 0.05).map((w) => [w.start - 0.1, w.end + 0.22]);
  raw.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] < 0.45) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  speech = merged;
}
export const getSpeech = () => speech;

/** 0 = silence, 1 = speaking (smoothed) at time t — sections may use it for visuals too. */
export function speechAt(t) {
  for (const [a, b] of speech) if (t >= a && t <= b) return 1;
  return 0;
}

// ── resources ────────────────────────────────────────────────────────────────
function makeNoiseBuffers(ac) {
  const len = SR * 4;
  const r = mulberry32(4242);
  const mk = () => ac.createBuffer(2, len, SR);
  const white = mk(), pink = mk(), brown = mk();
  for (let ch = 0; ch < 2; ch++) {
    const w = white.getChannelData(ch), p = pink.getChannelData(ch), b = brown.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const x = r() * 2 - 1;
      w[i] = x;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
      last = (last + 0.02 * x) / 1.02; b[i] = last * 3.5;
    }
  }
  return { white, pink, brown };
}
function makeIR(ac, seconds = 3.2, decay = 2.6, seed = 99) {
  const len = Math.floor(SR * seconds);
  const ir = ac.createBuffer(2, len, SR);
  const r = mulberry32(seed);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const tt = i / SR;
      const env = Math.pow(1 - i / len, decay) * (tt < 0.012 ? tt / 0.012 : 1);
      d[i] = (r() * 2 - 1) * env * (1 - 0.35 * Math.min(1, tt * 3) * (ch ? 0.9 : 1));
    }
    // a few early reflections (canyon walls)
    [0.021, 0.034, 0.047, 0.071].forEach((e, k) => { const idx = Math.floor((e + ch * 0.003) * SR); if (idx < len) d[idx] += 0.5 / (k + 1); });
  }
  return ir;
}
function ksBuffer(ac, freq, { decay = 0.996, bright = 0.5, seconds = 3, seed = 1 } = {}) {
  const len = Math.floor(SR * seconds);
  const buf = ac.createBuffer(1, len, SR);
  const d = buf.getChannelData(0);
  const N = Math.max(2, Math.round(SR / freq));
  const r = mulberry32(seed + Math.round(freq * 10));
  const line = new Float32Array(N);
  // excitation: filtered noise burst — brightness controls the pick
  let lp = 0;
  for (let i = 0; i < N; i++) { const x = r() * 2 - 1; lp = lp + (x - lp) * (0.15 + bright * 0.85); line[i] = lp; }
  let idx = 0, prev = 0;
  for (let i = 0; i < len; i++) {
    const cur = line[idx];
    const nxt = 0.5 * (cur + prev) * decay;
    prev = cur;
    line[idx] = nxt;
    d[i] = cur;
    idx = (idx + 1) % N;
  }
  // fade tail
  for (let i = len - 2000; i < len; i++) d[i] *= (len - i) / 2000;
  return buf;
}

function makeResources(ac, reverbIn) {
  const nb = makeNoiseBuffers(ac);
  const ksCache = new Map();
  return {
    ...nb,
    reverb: reverbIn,
    SR,
    rand: mulberry32(777),
    ks(freq, o = {}) {
      const key = `${freq.toFixed(2)}:${o.decay || 0}:${o.bright || 0}:${o.seconds || 0}`;
      if (!ksCache.has(key)) ksCache.set(key, ksBuffer(ac, freq, o));
      return ksCache.get(key);
    },
  };
}

// ── window rendering ─────────────────────────────────────────────────────────
export const windowCount = () => Math.ceil(DURATION / WIN);

function duckCurve(param, t0, t1, level, dt = 0.04) {
  const att = 0.14, rel = 0.6;
  let v = 1;
  // warm the follower up from t0 - 3s so the start of the window is settled
  for (let tt = t0 - 3; tt < t0; tt += dt) {
    const target = speechAt(tt) ? level : 1;
    const k = target < v ? dt / att : dt / rel;
    v += (target - v) * Math.min(1, k);
  }
  param.setValueAtTime(v, 0);
  for (let tt = t0; tt <= t1; tt += dt) {
    const target = speechAt(tt) ? level : 1;
    const k = target < v ? dt / att : dt / rel;
    v += (target - v) * Math.min(1, k);
    param.linearRampToValueAtTime(v, tt - t0);
  }
}

/** Render window i → { sampleRate, channels, start, end, pcm16: base64 (interleaved) } */
export async function renderWindow(i) {
  const a = i * WIN;
  const b = Math.min(DURATION, (i + 1) * WIN);
  const t0 = Math.max(0, a - PRE);
  const len = Math.ceil((b - t0) * SR);
  const ac = new OfflineAudioContext(2, len, SR);

  const master = ac.createGain();
  master.gain.value = MIX.master;
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -9; limiter.knee.value = 4; limiter.ratio.value = 12;
  limiter.attack.value = 0.004; limiter.release.value = 0.2;
  master.connect(limiter).connect(ac.destination);

  const reverb = ac.createConvolver();
  reverb.normalize = true;
  reverb.buffer = makeIR(ac);
  const revRet = ac.createGain();
  revRet.gain.value = MIX.reverbReturn;
  const revIn = ac.createGain();
  revIn.connect(reverb).connect(revRet).connect(master);

  const mk = (g, duck) => {
    const bus = ac.createGain();
    bus.gain.value = g;
    const d = ac.createGain();
    if (duck) duckCurve(d.gain, t0, b, duck);
    bus.connect(d).connect(master);
    const send = ac.createGain();
    send.gain.value = 0.18;
    d.connect(send).connect(revIn);
    return bus;
  };
  const buses = { music: mk(MIX.music, MIX.duckTo), sfx: mk(MIX.sfx, 0), amb: mk(MIX.amb, MIX.ambDuckTo) };
  const R = makeResources(ac, revIn);

  let n = 0;
  for (const ev of events) {
    if (ev.t < t0 || ev.t >= b) continue;
    if (ev.t + ev.dur < a) continue;
    try {
      ev.fn(ac, buses[ev.bus] || buses.sfx, ev.t - t0, R);
      n++;
    } catch (e) {
      console.error('audio event failed', ev.t, e);
    }
  }
  const buf = await ac.startRendering();
  const from = Math.floor((a - t0) * SR);
  const frames = Math.floor((b - a) * SR);
  const L = buf.getChannelData(0), Rr = buf.getChannelData(1);
  const out = new Int16Array(frames * 2);
  let peak = 0;
  for (let k = 0; k < frames; k++) {
    const l = L[from + k] || 0, r = Rr[from + k] || 0;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    out[k * 2] = Math.max(-32767, Math.min(32767, Math.round(l * 32767)));
    out[k * 2 + 1] = Math.max(-32767, Math.min(32767, Math.round(r * 32767)));
  }
  // base64 encode in chunks
  const bytes = new Uint8Array(out.buffer);
  let bin = '';
  const CH = 0x8000;
  for (let k = 0; k < bytes.length; k += CH) bin += String.fromCharCode.apply(null, bytes.subarray(k, k + CH));
  return { sampleRate: SR, channels: 2, start: a, end: b, events: n, peak, pcm16: btoa(bin) };
}

/** Preview helper: render [t, t+len] as an AudioBuffer for live playback in the browser UI. */
export async function renderPreview(tStart, length = 45) {
  const t0 = Math.max(0, tStart - PRE);
  const b = Math.min(DURATION, tStart + length);
  const len = Math.ceil((b - t0) * SR);
  const ac = new OfflineAudioContext(2, len, SR);
  const master = ac.createGain(); master.gain.value = MIX.master;
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -9; limiter.ratio.value = 12; limiter.attack.value = 0.004; limiter.release.value = 0.2;
  master.connect(limiter).connect(ac.destination);
  const reverb = ac.createConvolver(); reverb.buffer = makeIR(ac);
  const revRet = ac.createGain(); revRet.gain.value = MIX.reverbReturn;
  const revIn = ac.createGain(); revIn.connect(reverb).connect(revRet).connect(master);
  const mk = (g, duck) => {
    const bus = ac.createGain(); bus.gain.value = g;
    const d = ac.createGain(); if (duck) duckCurve(d.gain, t0, b, duck);
    bus.connect(d).connect(master);
    const send = ac.createGain(); send.gain.value = 0.18; d.connect(send).connect(revIn);
    return bus;
  };
  const buses = { music: mk(MIX.music, MIX.duckTo), sfx: mk(MIX.sfx, 0), amb: mk(MIX.amb, MIX.ambDuckTo) };
  const R = makeResources(ac, revIn);
  for (const ev of events) {
    if (ev.t < t0 || ev.t >= b) continue;
    try { ev.fn(ac, buses[ev.bus] || buses.sfx, ev.t - t0, R); } catch (e) { console.error(e); }
  }
  const buf = await ac.startRendering();
  return { buffer: buf, offset: tStart - t0 };
}

export const _clamp = clamp;

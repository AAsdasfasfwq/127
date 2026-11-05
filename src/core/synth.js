// ─────────────────────────────────────────────────────────────────────────────
// synth.js — the procedural orchestra. Every function REGISTERS an audio event at an
// absolute film time t (seconds). Use them to compose each section's score.
//
//   import { M, N, chord, pattern, beats, MOTIF } from '../../core/synth.js';
//   M.pad(12.0, 8, chord('D3','min9'), { gain: 0.05, cutoff: 1400 });
//   pattern(20, 112, 'x...x...x...x...', (t, v) => M.kick(t, { gain: 0.4 * v }), { bars: 4 });
//
// Instruments: pad, strings, choir, brass, drone, piano, bell, celesta, marimba, kalimba,
// pluck, guitar, pizz, bass, sub, organ, kick, snare, hat, clap, taiko, tom, shaker, rim,
// brush, riser, swell, heartbeat. All voices route to the 'music' bus (auto-ducked).
// Gains are deliberately LOW; the narration must always sit on top.
// ─────────────────────────────────────────────────────────────────────────────
import { at } from './audio.js';

// ── notes & harmony ──────────────────────────────────────────────────────────
const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function midiOf(name) {
  if (typeof name === 'number') return name;
  const m = /^([A-G][b#]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('bad note ' + name);
  return 12 * (parseInt(m[2], 10) + 1) + NOTE_IDX[m[1]];
}
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
/** N('A4') → 440. Numbers pass through as Hz. */
export const N = (name) => (typeof name === 'number' ? name : mtof(midiOf(name)));
export const CHORDS = {
  maj: [0, 4, 7], min: [0, 3, 7], sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], m7b5: [0, 3, 6, 10],
  add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], min9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14],
  pow: [0, 7, 12], open5: [0, 7, 12, 19], cluster: [0, 1, 3, 6], tritone: [0, 6, 12],
};
/** chord('D3','min9') → array of Hz. inv rotates up an octave. */
export function chord(root, type = 'min', inv = 0) {
  const r = midiOf(root);
  let iv = (CHORDS[type] || CHORDS.min).slice();
  for (let k = 0; k < inv; k++) iv.push(iv.shift() + 12);
  return iv.map((i) => mtof(r + i));
}
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], pentaMin: [0, 3, 5, 7, 10], pentaMaj: [0, 2, 4, 7, 9],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};
/** degree(root,'minor',deg,oct) → Hz (deg can exceed scale length). */
export function degree(root, scale, deg, octShift = 0) {
  const s = SCALES[scale];
  const r = midiOf(root);
  const o = Math.floor(deg / s.length);
  const d = ((deg % s.length) + s.length) % s.length;
  return mtof(r + s[d] + 12 * (o + octShift));
}

/** The film's leitmotif ("Aron's theme"). Beats are quarter-note units. */
export const MOTIF = {
  // D minor: 1 – b3 – 5 – 4  (questioning, unresolved)
  notes: ['D4', 'F4', 'A4', 'G4'],
  beats: [1, 0.5, 1.5, 2],
  // hope variant (D major): 1 – 3 – 5 – 6 – 5  (the vision of the son / freedom / Leo)
  hope: ['D4', 'F#4', 'A4', 'B4', 'A4'],
  hopeBeats: [1, 0.5, 1, 0.5, 2],
};
/** Play a note list with beat durations at bpm using instrument fn(t, hz, durSec, i). */
export function phrase(t0, bpm, notes, beatsArr, fn, transpose = 0) {
  let t = t0;
  const spb = 60 / bpm;
  notes.forEach((n, i) => {
    const d = (beatsArr[i] ?? 1) * spb;
    fn(t, mtof(midiOf(n) + transpose), d, i);
    t += d;
  });
  return t;
}

// ── scheduling helpers ───────────────────────────────────────────────────────
/** beats(t0, bpm, count, (t, k) => ...) — one callback per beat. */
export function beats(t0, bpm, count, fn, div = 1) {
  const step = 60 / bpm / div;
  for (let k = 0; k < count; k++) fn(t0 + k * step, k);
}
/**
 * pattern(t0, bpm, 'x..x..x.x...', fn, { div: 4, bars: 2, swing: 0, until })
 * chars: 'x' = 1.0, 'o' = 0.6, '.' = 0.35 accent-less? no: '.' = rest, '1'-'9' = velocity/9
 * One string = one bar unless `stepsPerBar` set. Calls fn(t, velocity, stepIndex, bar).
 */
export function pattern(t0, bpm, str, fn, o = {}) {
  const div = o.div || 4;
  const steps = str.replace(/\s|\|/g, '');
  const stepDur = 60 / bpm / div;
  const bars = o.bars || 1;
  for (let b = 0; b < bars; b++) {
    for (let i = 0; i < steps.length; i++) {
      const c = steps[i];
      let v = 0;
      if (c === 'x' || c === 'X') v = c === 'X' ? 1 : 0.85;
      else if (c === 'o') v = 0.55;
      else if (c >= '1' && c <= '9') v = (c.charCodeAt(0) - 48) / 9;
      if (!v) continue;
      let t = t0 + (b * steps.length + i) * stepDur;
      if (o.swing && i % 2 === 1) t += stepDur * o.swing;
      if (o.until !== undefined && t >= o.until) return;
      fn(t, v, i, b);
    }
  }
}

// ── internal voice plumbing ──────────────────────────────────────────────────
function outChain(ac, out, R, when, { pan = 0, rev = 0.25 } = {}) {
  const g = ac.createGain();
  const p = ac.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  g.connect(p).connect(out);
  if (rev > 0) {
    const s = ac.createGain();
    s.gain.value = rev;
    p.connect(s).connect(R.reverb);
  }
  return g;
}
function adsr(param, when, dur, { a = 0.01, d = 0.1, s = 0.7, r = 0.3, peak = 1 } = {}) {
  param.setValueAtTime(0, when);
  param.linearRampToValueAtTime(peak, when + a);
  param.linearRampToValueAtTime(peak * s, when + a + d);
  const hold = Math.max(when + a + d, when + dur);
  param.setValueAtTime(peak * s, hold);
  param.linearRampToValueAtTime(0.0001, hold + r);
  return hold + r;
}
function expDecay(param, when, peak, decay, a = 0.003) {
  param.setValueAtTime(0, when);
  param.linearRampToValueAtTime(peak, when + a);
  param.setTargetAtTime(0.00001, when + a, decay / 4.6);
}
function noiseSrc(ac, buf, when, dur, offset = 0) {
  const s = ac.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start(when, offset % 3.5);
  s.stop(when + dur + 0.05);
  return s;
}
/** split long sustained events into ≤11 s overlapping pieces */
function sustained(t, dur, bus, maker, xf = 1.2) {
  const MAXP = 11;
  if (dur <= MAXP) { at(t, dur + 3, bus, (ac, out, when, R) => maker(ac, out, when, R, dur, 'full')); return; }
  let s = 0;
  let idx = 0;
  while (s < dur) {
    const len = Math.min(MAXP, dur - s + (s > 0 ? xf : 0));
    const st = t + s - (s > 0 ? xf : 0);
    const first = idx === 0;
    const last = s + MAXP >= dur;
    at(st, len + 3, bus, (ac, out, when, R) => maker(ac, out, when, R, len, first ? (last ? 'full' : 'in') : last ? 'out' : 'mid', xf));
    s += MAXP - xf;
    idx++;
  }
}
function segEnv(param, when, len, mode, peak, attack, release, xf = 1.2) {
  const a = mode === 'full' || mode === 'in' ? attack : xf;
  const r = mode === 'full' || mode === 'out' ? release : xf;
  param.setValueAtTime(0, when);
  param.linearRampToValueAtTime(peak, when + a);
  param.setValueAtTime(peak, when + Math.max(a, len - (mode === 'full' || mode === 'out' ? 0 : xf)));
  param.linearRampToValueAtTime(0.0001, when + Math.max(a, len - (mode === 'full' || mode === 'out' ? 0 : xf)) + r);
  return when + len + r;
}

// ── instruments ──────────────────────────────────────────────────────────────
export const M = {
  /** Warm analogue pad. notes = Hz[] ; o: gain, attack, release, cutoff, detune(cents), type, pan, rev, lfo */
  pad(t, dur, notes, o = {}) {
    const g0 = (o.gain ?? 0.05) / Math.sqrt(notes.length);
    sustained(t, dur, o.bus || 'music', (ac, out, when, R, len, mode, xf) => {
      notes.forEach((f, i) => {
        const pan = (o.spread ?? 0.6) * (notes.length > 1 ? (i / (notes.length - 1)) * 2 - 1 : 0) + (o.pan || 0);
        const vg = outChain(ac, out, R, when, { pan, rev: o.rev ?? 0.5 });
        const filt = ac.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = o.cutoff ?? 1600;
        filt.Q.value = o.q ?? 0.6;
        const lfo = ac.createOscillator();
        lfo.frequency.value = 0.07 + i * 0.013;
        const lg = ac.createGain(); lg.gain.value = (o.cutoff ?? 1600) * (o.lfo ?? 0.25);
        lfo.connect(lg).connect(filt.frequency);
        lfo.start(when); lfo.stop(when + len + 4);
        filt.connect(vg);
        const end = segEnv(vg.gain, when, len, mode, g0, o.attack ?? 1.6, o.release ?? 2.2, xf);
        [-1, 0, 1].forEach((d) => {
          const osc = ac.createOscillator();
          osc.type = o.type || 'sawtooth';
          osc.frequency.value = f;
          osc.detune.value = d * (o.detune ?? 8);
          const og = ac.createGain(); og.gain.value = d === 0 ? 0.5 : 0.35;
          osc.connect(og).connect(filt);
          osc.start(when); osc.stop(end + 0.1);
        });
      });
    });
  },

  /** String ensemble. o: gain, attack, release, tremolo(Hz), vibrato, bright, pan, rev */
  strings(t, dur, notes, o = {}) {
    const g0 = (o.gain ?? 0.045) / Math.sqrt(notes.length);
    sustained(t, dur, 'music', (ac, out, when, R, len, mode, xf) => {
      notes.forEach((f, i) => {
        const pan = (notes.length > 1 ? (i / (notes.length - 1)) * 1.2 - 0.6 : 0) + (o.pan || 0);
        const vg = outChain(ac, out, R, when, { pan, rev: o.rev ?? 0.55 });
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
        const br = o.bright ?? 0.5;
        lp.frequency.setValueAtTime(600 + br * 900, when);
        lp.frequency.linearRampToValueAtTime(1600 + br * 3200, when + (o.attack ?? 1.2));
        lp.Q.value = 0.5;
        hp.connect(lp);
        let tail = lp;
        if (o.tremolo) {
          const tg = ac.createGain(); tg.gain.value = 0.6;
          const lfo = ac.createOscillator(); lfo.frequency.value = o.tremolo;
          const lg = ac.createGain(); lg.gain.value = 0.4;
          lfo.connect(lg).connect(tg.gain); lfo.start(when); lfo.stop(when + len + 4);
          lp.connect(tg); tail = tg;
        }
        tail.connect(vg);
        const end = segEnv(vg.gain, when, len, mode, g0, o.attack ?? 1.2, o.release ?? 1.8, xf);
        const vib = ac.createOscillator(); vib.frequency.value = 5.1 + i * 0.17;
        const vd = ac.createGain(); vd.gain.value = o.vibrato ?? 7;
        vib.connect(vd); vib.start(when); vib.stop(end + 0.1);
        for (let k = 0; k < 4; k++) {
          const osc = ac.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = f;
          osc.detune.value = (k - 1.5) * 6;
          vd.connect(osc.detune);
          const og = ac.createGain(); og.gain.value = 0.28;
          osc.connect(og).connect(hp);
          osc.start(when); osc.stop(end + 0.1);
        }
      });
    });
  },

  /** Vowel choir. o.vowel 'a'|'o'|'u'|'e'|'i' */
  choir(t, dur, notes, o = {}) {
    const F = { a: [800, 1150, 2900], o: [450, 800, 2830], u: [325, 700, 2530], e: [400, 1600, 2700], i: [270, 2140, 2950] }[o.vowel || 'a'];
    const g0 = (o.gain ?? 0.06) / Math.sqrt(notes.length);
    sustained(t, dur, 'music', (ac, out, when, R, len, mode, xf) => {
      notes.forEach((f, i) => {
        const vg = outChain(ac, out, R, when, { pan: (i % 2 ? 0.35 : -0.35), rev: o.rev ?? 0.8 });
        const end = segEnv(vg.gain, when, len, mode, g0, o.attack ?? 1.8, o.release ?? 2.5, xf);
        const sum = ac.createGain(); sum.gain.value = 1;
        F.forEach((ff, k) => {
          const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 9 + k * 3;
          const bg = ac.createGain(); bg.gain.value = [1, 0.55, 0.25][k] * 3.2;
          sum.connect(bp).connect(bg).connect(vg);
        });
        const vib = ac.createOscillator(); vib.frequency.value = 4.6 + i * 0.3;
        const vd = ac.createGain(); vd.gain.value = 9;
        vib.connect(vd); vib.start(when); vib.stop(end + 0.1);
        for (let k = 0; k < 3; k++) {
          const osc = ac.createOscillator(); osc.type = 'sawtooth';
          osc.frequency.value = f; osc.detune.value = (k - 1) * 11;
          vd.connect(osc.detune);
          osc.connect(sum); osc.start(when); osc.stop(end + 0.1);
        }
      });
    });
  },

  /** Brass swell / stab. o: gain, attack, release, bright */
  brass(t, dur, notes, o = {}) {
    const g0 = (o.gain ?? 0.05) / Math.sqrt(notes.length);
    at(t, Math.min(12.5, dur + 2), 'music', (ac, out, when, R) => {
      notes.forEach((f, i) => {
        const vg = outChain(ac, out, R, when, { pan: (i / Math.max(1, notes.length - 1) - 0.5) * 0.7, rev: o.rev ?? 0.45 });
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.4;
        const a = o.attack ?? 0.35;
        lp.frequency.setValueAtTime(250, when);
        lp.frequency.linearRampToValueAtTime(900 + (o.bright ?? 0.6) * 2800, when + a);
        lp.frequency.linearRampToValueAtTime(700 + (o.bright ?? 0.6) * 1400, when + dur);
        lp.connect(vg);
        const end = adsr(vg.gain, when, dur, { a, d: 0.2, s: 0.8, r: o.release ?? 0.6, peak: g0 });
        for (let k = 0; k < 2; k++) {
          const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = f;
          osc.detune.setValueAtTime(-35 + k * 7, when); osc.detune.linearRampToValueAtTime(k * 7 - 3, when + 0.09);
          osc.connect(lp); osc.start(when); osc.stop(end + 0.1);
        }
      });
    });
  },

  /** Cello-like bowed drone with bow noise. */
  drone(t, dur, f, o = {}) {
    sustained(t, dur, 'music', (ac, out, when, R, len, mode, xf) => {
      const vg = outChain(ac, out, R, when, { pan: o.pan || 0, rev: o.rev ?? 0.5 });
      const end = segEnv(vg.gain, when, len, mode, o.gain ?? 0.06, o.attack ?? 2, o.release ?? 2.5, xf);
      const bp = ac.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = o.cutoff ?? 900; bp.Q.value = 0.9;
      const body = ac.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 280; body.gain.value = 6; body.Q.value = 1.2;
      bp.connect(body).connect(vg);
      const vib = ac.createOscillator(); vib.frequency.value = 4.8;
      const vd = ac.createGain(); vd.gain.value = o.vibrato ?? 5;
      vib.connect(vd); vib.start(when); vib.stop(end + 0.1);
      [0, 1].forEach((k) => {
        const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = f * (k ? 2.001 : 1);
        vd.connect(osc.detune);
        const og = ac.createGain(); og.gain.value = k ? 0.25 : 0.6;
        osc.connect(og).connect(bp); osc.start(when); osc.stop(end + 0.1);
      });
      const nz = noiseSrc(ac, R.pink, when, len + 3, when * 1.37);
      const nb = ac.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = f * 6; nb.Q.value = 2;
      const ng = ac.createGain(); ng.gain.value = o.bow ?? 0.12;
      nz.connect(nb).connect(ng).connect(bp);
    });
  },

  /** Felt piano. o: gain, dur, vel(0..1), pan, rev, bright */
  piano(t, f, o = {}) {
    const dur = o.dur ?? Math.min(6, 2 + 260 / f);
    at(t, dur + 1, 'music', (ac, out, when, R) => {
      const vel = o.vel ?? 0.8;
      const vg = outChain(ac, out, R, when, { pan: o.pan ?? (Math.log2(f / 260) * 0.25), rev: o.rev ?? 0.4 });
      vg.gain.value = (o.gain ?? 0.09) * (0.4 + vel * 0.6);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(Math.min(12000, f * (4 + vel * 10) * (o.bright ?? 1)), when);
      lp.frequency.setTargetAtTime(f * 2.5, when + 0.05, dur / 4);
      lp.connect(vg);
      const parts = [[1, 1, 1], [2.0, 0.42, 0.7], [3.01, 0.22, 0.5], [4.03, 0.1, 0.35], [5.06, 0.05, 0.25]];
      parts.forEach(([m, a, dk]) => {
        [-1.2, 1.2].forEach((dt) => {
          const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = f * m; osc.detune.value = dt;
          const og = ac.createGain();
          expDecay(og.gain, when, a * 0.5, dur * dk, 0.004);
          osc.connect(og).connect(lp); osc.start(when); osc.stop(when + dur + 0.2);
        });
      });
      const hn = noiseSrc(ac, R.white, when, 0.05, when * 2.1);
      const hb = ac.createBiquadFilter(); hb.type = 'bandpass'; hb.frequency.value = Math.min(9000, f * 5); hb.Q.value = 1.5;
      const hg = ac.createGain(); expDecay(hg.gain, when, 0.08 * vel, 0.04, 0.001);
      hn.connect(hb).connect(hg).connect(vg);
    });
  },

  /** FM bell (ratio 3.5) — tolls, chimes. o: gain, dur, ratio, index, pan */
  bell(t, f, o = {}) {
    const dur = o.dur ?? 5;
    at(t, Math.min(12.5, dur + 1), 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { pan: o.pan || 0, rev: o.rev ?? 0.6 });
      expDecay(vg.gain, when, o.gain ?? 0.07, dur, 0.002);
      const car = ac.createOscillator(); car.frequency.value = f;
      const mod = ac.createOscillator(); mod.frequency.value = f * (o.ratio ?? 3.5);
      const mg = ac.createGain();
      expDecay(mg.gain, when, f * (o.index ?? 2.2), dur * 0.6, 0.001);
      mod.connect(mg).connect(car.frequency);
      car.connect(vg);
      car.start(when); mod.start(when); car.stop(when + dur + 0.2); mod.stop(when + dur + 0.2);
    });
  },
  /** Celesta / music box (the son's motif). */
  celesta(t, f, o = {}) { M.bell(t, f, { ratio: 4, index: 0.9, dur: o.dur ?? 2.4, gain: o.gain ?? 0.06, pan: o.pan, rev: o.rev ?? 0.55 }); },

  marimba(t, f, o = {}) {
    const dur = o.dur ?? 1.2;
    at(t, dur + 0.5, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { pan: o.pan || 0, rev: o.rev ?? 0.3 });
      vg.gain.value = o.gain ?? 0.12;
      [[1, 1, dur], [3.93, 0.25, dur * 0.25], [9.8, 0.08, 0.06]].forEach(([m, a, d]) => {
        const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = f * m;
        const og = ac.createGain(); expDecay(og.gain, when, a, d, 0.002);
        osc.connect(og).connect(vg); osc.start(when); osc.stop(when + dur + 0.2);
      });
    });
  },
  kalimba(t, f, o = {}) {
    const dur = o.dur ?? 1.6;
    at(t, dur + 0.5, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { pan: o.pan || 0, rev: o.rev ?? 0.4 });
      vg.gain.value = o.gain ?? 0.1;
      [[1, 1, dur], [5.95, 0.18, 0.18], [2.0, 0.12, dur * 0.4]].forEach(([m, a, d]) => {
        const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = f * m;
        const og = ac.createGain(); expDecay(og.gain, when, a, d, 0.0015);
        osc.connect(og).connect(vg); osc.start(when); osc.stop(when + dur + 0.2);
      });
    });
  },

  /** Plucked string (Karplus–Strong). o: gain, decay, bright, tone(Hz), pan, rev, seconds */
  pluck(t, f, o = {}) {
    const secs = o.seconds ?? 2.6;
    at(t, secs + 0.5, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { pan: o.pan || 0, rev: o.rev ?? 0.35 });
      vg.gain.value = o.gain ?? 0.22;
      const src = ac.createBufferSource();
      src.buffer = R.ks(f, { decay: o.decay ?? 0.996, bright: o.bright ?? 0.55, seconds: secs });
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.tone ?? 5200;
      src.connect(lp).connect(vg);
      src.start(when);
    });
  },
  /** Strummed guitar chord. o.strum seconds between strings, o.up reverses. */
  guitar(t, freqs, o = {}) {
    const fs = o.up ? freqs.slice().reverse() : freqs;
    fs.forEach((f, i) => M.pluck(t + i * (o.strum ?? 0.016), f, { gain: (o.gain ?? 0.16) * (1 - i * 0.04), decay: o.decay ?? 0.997, bright: o.bright ?? 0.5, tone: o.tone ?? 4200, pan: (i / Math.max(1, fs.length - 1) - 0.5) * 0.5 + (o.pan || 0), rev: o.rev ?? 0.35, seconds: o.seconds ?? 2.8 }));
  },
  /** Pizzicato (sneaky / sardonic beats). */
  pizz(t, f, o = {}) { M.pluck(t, f, { gain: o.gain ?? 0.24, decay: 0.985, bright: 0.25, tone: o.tone ?? 2200, seconds: 0.9, pan: o.pan, rev: o.rev ?? 0.3 }); },

  /** Bass. o.type 'sub' | 'synth' | 'pluck' ; o: gain, cutoff */
  bass(t, f, dur = 0.5, o = {}) {
    if (o.type === 'pluck') { M.pluck(t, f, { gain: o.gain ?? 0.3, decay: 0.993, bright: 0.2, tone: 900, seconds: Math.min(3, dur + 0.8), rev: 0.1 }); return; }
    at(t, dur + 1, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { pan: 0, rev: 0.06 });
      const end = adsr(vg.gain, when, dur, { a: 0.008, d: 0.12, s: 0.75, r: o.release ?? 0.18, peak: o.gain ?? 0.16 });
      const osc = ac.createOscillator();
      osc.type = o.type === 'synth' ? 'sawtooth' : 'sine';
      osc.frequency.value = f;
      if (o.type === 'synth') {
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
        lp.frequency.setValueAtTime(o.cutoff ?? 1200, when);
        lp.frequency.setTargetAtTime(220, when + 0.01, 0.12);
        osc.connect(lp).connect(vg);
      } else {
        const ws = ac.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 1.6); }
        ws.curve = curve;
        osc.connect(ws).connect(vg);
      }
      osc.start(when); osc.stop(end + 0.05);
    });
  },
  /** Sub swell / sustained low sine. */
  sub(t, f, dur = 2, o = {}) {
    at(t, Math.min(12.5, dur + 1), 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: 0 });
      const end = adsr(vg.gain, when, dur, { a: o.attack ?? 0.6, d: 0.1, s: 1, r: o.release ?? 1, peak: o.gain ?? 0.14 });
      const osc = ac.createOscillator(); osc.frequency.value = f;
      osc.connect(vg); osc.start(when); osc.stop(end + 0.05);
    });
  },
  /** Reed organ / harmonium (hymn-like warmth). */
  organ(t, dur, notes, o = {}) {
    M.pad(t, dur, notes, { type: 'square', cutoff: o.cutoff ?? 1100, detune: 3, gain: o.gain ?? 0.035, attack: o.attack ?? 0.4, release: o.release ?? 0.8, rev: o.rev ?? 0.5, lfo: 0.05 });
  },

  // ── percussion ─────────────────────────────────────────────────────────────
  kick(t, o = {}) {
    at(t, 0.8, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: 0.04 });
      expDecay(vg.gain, when, o.gain ?? 0.42, o.decay ?? 0.42, 0.001);
      const osc = ac.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(o.from ?? 140, when);
      osc.frequency.exponentialRampToValueAtTime(o.to ?? 44, when + 0.11);
      osc.connect(vg); osc.start(when); osc.stop(when + 0.7);
      const n = noiseSrc(ac, R.white, when, 0.02, when);
      const ng = ac.createGain(); expDecay(ng.gain, when, 0.15, 0.012, 0.0005);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
      n.connect(hp).connect(ng).connect(vg);
    });
  },
  snare(t, o = {}) {
    at(t, 0.6, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: o.rev ?? 0.18, pan: o.pan || 0 });
      vg.gain.value = o.gain ?? 0.2;
      const n = noiseSrc(ac, R.white, when, 0.3, when * 1.3);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = o.tone ?? 1400;
      const ng = ac.createGain(); expDecay(ng.gain, when, 0.9, o.decay ?? 0.18, 0.001);
      n.connect(hp).connect(ng).connect(vg);
      const osc = ac.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(220, when); osc.frequency.exponentialRampToValueAtTime(160, when + 0.08);
      const og = ac.createGain(); expDecay(og.gain, when, 0.5, 0.09, 0.001);
      osc.connect(og).connect(vg); osc.start(when); osc.stop(when + 0.3);
    });
  },
  hat(t, o = {}) {
    const d = o.open ? 0.32 : o.decay ?? 0.045;
    at(t, d + 0.3, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: 0.08, pan: o.pan ?? 0.25 });
      vg.gain.value = o.gain ?? 0.06;
      const n = noiseSrc(ac, R.white, when, d + 0.1, when * 3.7);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7200;
      const bp = ac.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 10500; bp.gain.value = 6;
      const ng = ac.createGain(); expDecay(ng.gain, when, 1, d, 0.0008);
      n.connect(hp).connect(bp).connect(ng).connect(vg);
    });
  },
  clap(t, o = {}) {
    at(t, 0.6, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: o.rev ?? 0.3, pan: o.pan || 0 });
      vg.gain.value = o.gain ?? 0.16;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.1;
      bp.connect(vg);
      [0, 0.011, 0.023].forEach((off, k) => {
        const n = noiseSrc(ac, R.white, when + off, 0.2, when * 2 + k);
        const g = ac.createGain(); expDecay(g.gain, when + off, k === 2 ? 1 : 0.7, k === 2 ? 0.16 : 0.02, 0.0005);
        n.connect(g).connect(bp);
      });
    });
  },
  /** Big drum — epic / tribal hits. */
  taiko(t, o = {}) {
    at(t, 2.5, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: o.rev ?? 0.55, pan: o.pan || 0 });
      expDecay(vg.gain, when, o.gain ?? 0.38, o.decay ?? 1.1, 0.002);
      const osc = ac.createOscillator(); osc.frequency.setValueAtTime((o.pitch ?? 72) * 1.5, when);
      osc.frequency.exponentialRampToValueAtTime(o.pitch ?? 72, when + 0.06);
      osc.frequency.exponentialRampToValueAtTime((o.pitch ?? 72) * 0.8, when + 1.2);
      osc.connect(vg); osc.start(when); osc.stop(when + 2);
      const n = noiseSrc(ac, R.brown, when, 0.4, when);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const ng = ac.createGain(); expDecay(ng.gain, when, 1.4, 0.18, 0.001);
      n.connect(lp).connect(ng).connect(vg);
    });
  },
  tom(t, f = 110, o = {}) {
    at(t, 1.2, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: 0.25, pan: o.pan || 0 });
      expDecay(vg.gain, when, o.gain ?? 0.25, o.decay ?? 0.5, 0.001);
      const osc = ac.createOscillator(); osc.frequency.setValueAtTime(f * 1.6, when); osc.frequency.exponentialRampToValueAtTime(f, when + 0.05);
      osc.connect(vg); osc.start(when); osc.stop(when + 1);
    });
  },
  shaker(t, o = {}) {
    at(t, 0.3, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: 0.1, pan: o.pan ?? -0.3 });
      vg.gain.value = 0;
      vg.gain.setValueAtTime(0, when);
      vg.gain.linearRampToValueAtTime(o.gain ?? 0.05, when + 0.025);
      vg.gain.setTargetAtTime(0.0001, when + 0.03, 0.025);
      const n = noiseSrc(ac, R.white, when, 0.2, when * 5.1);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 6500; bp.Q.value = 2.5;
      n.connect(bp).connect(vg);
    });
  },
  rim(t, o = {}) {
    at(t, 0.3, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: 0.2, pan: o.pan ?? 0.15 });
      expDecay(vg.gain, when, o.gain ?? 0.12, 0.05, 0.0005);
      const osc = ac.createOscillator(); osc.type = 'triangle'; osc.frequency.value = o.f ?? 1750;
      osc.connect(vg); osc.start(when); osc.stop(when + 0.15);
    });
  },
  brush(t, dur = 0.25, o = {}) {
    at(t, dur + 0.3, 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: 0.2, pan: o.pan ?? 0.1 });
      vg.gain.setValueAtTime(0, when);
      vg.gain.linearRampToValueAtTime(o.gain ?? 0.05, when + dur * 0.4);
      vg.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = noiseSrc(ac, R.pink, when, dur + 0.1, when * 1.9);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.8;
      n.connect(bp).connect(vg);
    });
  },
  /** Musical riser (noise + tone) that peaks at t + dur. */
  riser(t, dur = 2, o = {}) {
    at(t, Math.min(12.5, dur + 0.5), 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: 0.4 });
      vg.gain.setValueAtTime(0.0001, when);
      vg.gain.exponentialRampToValueAtTime(o.gain ?? 0.09, when + dur);
      vg.gain.linearRampToValueAtTime(0.0001, when + dur + 0.08);
      const n = noiseSrc(ac, R.white, when, dur + 0.1, when);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
      bp.frequency.setValueAtTime(300, when); bp.frequency.exponentialRampToValueAtTime(o.top ?? 7000, when + dur);
      n.connect(bp).connect(vg);
      if (o.tone !== false) {
        const osc = ac.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(o.f0 ?? 110, when); osc.frequency.exponentialRampToValueAtTime(o.f1 ?? 880, when + dur);
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
        const og = ac.createGain(); og.gain.value = 0.25;
        osc.connect(lp).connect(og).connect(vg); osc.start(when); osc.stop(when + dur + 0.1);
      }
    });
  },
  /** Reverse swell into a downbeat (cymbal-like). */
  swell(t, dur = 1.5, o = {}) {
    at(t, Math.min(12.5, dur + 0.3), 'music', (ac, out, when, R) => {
      const vg = outChain(ac, out, R, when, { rev: 0.5 });
      vg.gain.setValueAtTime(0.0001, when);
      vg.gain.exponentialRampToValueAtTime(o.gain ?? 0.07, when + dur);
      vg.gain.linearRampToValueAtTime(0.0001, when + dur + 0.03);
      const n = noiseSrc(ac, R.white, when, dur + 0.1, when * 0.7);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
      n.connect(hp).connect(vg);
    });
  },
  /** Lub-dub. */
  heartbeat(t, o = {}) {
    [0, 0.17].forEach((off, k) => M.kick(t + off, { gain: (o.gain ?? 0.3) * (k ? 0.7 : 1), from: 70, to: 38, decay: 0.28 }));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// sfx.js — procedural sound design (Web Audio). All on the 'sfx' bus (not ducked) or
// 'amb' (lightly ducked beds). LOW levels by default: these live UNDER the narration.
//
//   import { S } from '../../core/sfx.js';
//   S.whoosh(t, { dur: 0.6, gain: 0.12, pan: -0.4 });   S.impact(t, { size: 1 });
//
// Rules (docs/ART_BIBLE.md §Sound): no whoosh on routine slides; reserve whooshes for
// real camera moves / transitions. Leave ~60 ms of silence before hero impacts.
// ─────────────────────────────────────────────────────────────────────────────
import { at } from './audio.js';
import { mulberry32 } from './util.js';

function chain(ac, out, R, { pan = 0, rev = 0.2 } = {}) {
  const g = ac.createGain();
  const p = ac.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  g.connect(p).connect(out);
  if (rev > 0) { const s = ac.createGain(); s.gain.value = rev; p.connect(s).connect(R.reverb); }
  return g;
}
function nsrc(ac, buf, when, dur, off = 0) {
  const s = ac.createBufferSource();
  s.buffer = buf; s.loop = true;
  s.start(when, Math.abs(off) % 3.5);
  s.stop(when + dur + 0.05);
  return s;
}
function decay(param, when, peak, d, a = 0.002) {
  param.setValueAtTime(0, when);
  param.linearRampToValueAtTime(peak, when + a);
  param.setTargetAtTime(0.00001, when + a, d / 4.6);
}
function shaper(ac, amt = 2) {
  const ws = ac.createWaveShaper();
  const c = new Float32Array(512);
  for (let i = 0; i < 512; i++) { const x = i / 256 - 1; c[i] = Math.tanh(x * amt); }
  ws.curve = c;
  return ws;
}

export const S = {
  /** Air movement for camera moves / transitions. dir: 1 up-sweep, -1 down-sweep */
  whoosh(t, o = {}) {
    const dur = o.dur ?? 0.7;
    at(t, dur + 0.6, o.bus || 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: 0, rev: o.rev ?? 0.25 });
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(o.gain ?? 0.11, when + dur * 0.55);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.pink, when, dur, when * 3.3);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = o.q ?? 1.6;
      const f0 = o.f0 ?? (o.dir === -1 ? 3000 : 350), f1 = o.f1 ?? (o.dir === -1 ? 300 : 2600);
      bp.frequency.setValueAtTime(f0, when);
      bp.frequency.exponentialRampToValueAtTime(f1, when + dur);
      const p = ac.createStereoPanner();
      p.pan.setValueAtTime(o.panFrom ?? -0.6, when);
      p.pan.linearRampToValueAtTime(o.panTo ?? 0.6, when + dur);
      n.connect(bp).connect(p).connect(g);
    });
  },
  /** Soft swish — small UI-ish movements, type reveals (quieter than whoosh). */
  swish(t, o = {}) { S.whoosh(t, { dur: o.dur ?? 0.32, gain: o.gain ?? 0.05, q: 2.4, f0: 1200, f1: 5200, rev: 0.1, panFrom: o.pan ?? 0, panTo: o.pan ?? 0 }); },

  /** Low impact: body thump + noise crack + sub tail. size 0.5..2 */
  impact(t, o = {}) {
    const size = o.size ?? 1;
    at(t, 3, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan || 0, rev: o.rev ?? 0.35 });
      g.gain.value = o.gain ?? 0.28;
      const osc = ac.createOscillator();
      osc.frequency.setValueAtTime(120 * (1.2 - size * 0.2), when);
      osc.frequency.exponentialRampToValueAtTime(34, when + 0.3 * size);
      const og = ac.createGain(); decay(og.gain, when, 0.9, 0.7 * size, 0.002);
      osc.connect(shaper(ac, 1.8)).connect(og).connect(g); osc.start(when); osc.stop(when + 2);
      const n = nsrc(ac, R.brown, when, 1, when);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 / size;
      const ng = ac.createGain(); decay(ng.gain, when, 1.2, 0.35 * size, 0.001);
      n.connect(lp).connect(ng).connect(g);
      const w = nsrc(ac, R.white, when, 0.2, when * 2);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
      const wg = ac.createGain(); decay(wg.gain, when, 0.25, 0.06, 0.0005);
      w.connect(hp).connect(wg).connect(g);
    });
  },
  /** Cinematic sub drop (felt more than heard). */
  subHit(t, o = {}) {
    at(t, 3, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0 });
      decay(g.gain, when, o.gain ?? 0.3, o.decay ?? 1.8, 0.004);
      const osc = ac.createOscillator();
      osc.frequency.setValueAtTime(o.from ?? 70, when);
      osc.frequency.exponentialRampToValueAtTime(o.to ?? 28, when + (o.decay ?? 1.8));
      osc.connect(g); osc.start(when); osc.stop(when + 2.8);
    });
  },
  /** Big boom with long tail (rare: the boulder crash, freedom). */
  boom(t, o = {}) { S.subHit(t, { gain: (o.gain ?? 0.3) * 1.1, decay: 2.4 }); S.impact(t, { size: 1.8, gain: o.gain ?? 0.3, rev: 0.6 }); },

  /** Clock / UI tick. */
  tick(t, o = {}) {
    at(t, 0.2, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan ?? 0, rev: o.rev ?? 0.05 });
      decay(g.gain, when, o.gain ?? 0.07, 0.03, 0.0005);
      const osc = ac.createOscillator(); osc.type = 'square'; osc.frequency.value = o.f ?? 2400;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = o.f ?? 2400; bp.Q.value = 6;
      osc.connect(bp).connect(g); osc.start(when); osc.stop(when + 0.06);
    });
  },
  /** Mechanical click (counter digits, carabiner, switch). */
  click(t, o = {}) {
    at(t, 0.2, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan ?? 0, rev: o.rev ?? 0.08 });
      g.gain.value = o.gain ?? 0.09;
      const n = nsrc(ac, R.white, when, 0.03, when * 7);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = o.f ?? 3800; bp.Q.value = 4;
      const ng = ac.createGain(); decay(ng.gain, when, 1, 0.018, 0.0003);
      n.connect(bp).connect(ng).connect(g);
    });
  },
  /** Metallic clack (carabiner, multi-tool). */
  clack(t, o = {}) {
    at(t, 0.6, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan ?? 0, rev: o.rev ?? 0.15 });
      g.gain.value = o.gain ?? 0.08;
      [1, 2.76, 5.4, 8.93].forEach((m, k) => {
        const osc = ac.createOscillator(); osc.frequency.value = (o.f ?? 1250) * m;
        const og = ac.createGain(); decay(og.gain, when, 0.5 / (k + 1), 0.25 / (k * 0.5 + 1), 0.0005);
        osc.connect(og).connect(g); osc.start(when); osc.stop(when + 0.5);
      });
    });
  },
  /** Rising tension into a moment (peaks at t+dur). */
  riser(t, dur = 2, o = {}) {
    at(t, Math.min(12.5, dur + 0.3), 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.35 });
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(o.gain ?? 0.08, when + dur);
      g.gain.linearRampToValueAtTime(0.0001, when + dur + 0.05);
      const n = nsrc(ac, R.white, when, dur, when);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 4;
      bp.frequency.setValueAtTime(400, when); bp.frequency.exponentialRampToValueAtTime(o.top ?? 8000, when + dur);
      n.connect(bp).connect(g);
    });
  },
  /** Pitch-falling downer (after a reveal / failure). */
  downer(t, dur = 1.4, o = {}) {
    at(t, dur + 0.5, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.4 });
      decay(g.gain, when, o.gain ?? 0.08, dur, 0.01);
      const osc = ac.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(o.f0 ?? 420, when); osc.frequency.exponentialRampToValueAtTime(o.f1 ?? 50, when + dur);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
      osc.connect(lp).connect(g); osc.start(when); osc.stop(when + dur + 0.1);
    });
  },
  /** Filter sweep (scale change, map zoom). */
  sweep(t, dur = 1, o = {}) {
    at(t, dur + 0.4, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.3 });
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.05, when + dur * 0.5);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.pink, when, dur, when * 1.1);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 8;
      bp.frequency.setValueAtTime(o.up === false ? 6000 : 200, when);
      bp.frequency.exponentialRampToValueAtTime(o.up === false ? 200 : 6000, when + dur);
      n.connect(bp).connect(g);
    });
  },
  /** Deep rumble bed (geology, dread). */
  rumble(t, dur = 4, o = {}) {
    at(t, Math.min(12.5, dur + 1), o.bus || 'amb', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.2 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.14, when + (o.attack ?? dur * 0.3));
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.brown, when, dur, when * 0.9);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cutoff ?? 160;
      n.connect(lp).connect(g);
    });
  },
  /** Stone-on-stone grinding (the boulder shifts). */
  grind(t, dur = 2.5, o = {}) {
    at(t, Math.min(12.5, dur + 0.6), 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan || 0, rev: o.rev ?? 0.3 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.22, when + 0.25);
      g.gain.setValueAtTime(o.gain ?? 0.22, when + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.brown, when, dur, when * 1.7);
      const am = ac.createGain(); am.gain.value = 0.5;
      const lfo = ac.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = o.rate ?? 13;
      const lg = ac.createGain(); lg.gain.value = 0.5;
      lfo.connect(lg).connect(am.gain); lfo.start(when); lfo.stop(when + dur + 0.1);
      const bp1 = ac.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 180; bp1.Q.value = 1.5;
      const bp2 = ac.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 640; bp2.Q.value = 3;
      n.connect(am);
      am.connect(bp1).connect(g);
      const g2 = ac.createGain(); g2.gain.value = 0.6;
      am.connect(bp2).connect(g2).connect(g);
      const w = nsrc(ac, R.white, when, dur, when * 2.2);
      const hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 0.8;
      const wg = ac.createGain(); wg.gain.value = 0.12;
      w.connect(hp).connect(wg).connect(am);
    });
  },
  /** Dry crack (rock fracture / bone — used with restraint). */
  crack(t, o = {}) {
    at(t, 2, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan || 0, rev: o.rev ?? 0.45 });
      g.gain.value = o.gain ?? 0.26;
      const n = nsrc(ac, R.white, when, 0.25, when * 4.4);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const pk = ac.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 2400; pk.gain.value = 9; pk.Q.value = 3;
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0, when);
      ng.gain.linearRampToValueAtTime(1, when + 0.0015);
      ng.gain.setTargetAtTime(0.0001, when + 0.002, 0.012);
      ng.gain.setValueAtTime(0.5, when + 0.021);
      ng.gain.setTargetAtTime(0.0001, when + 0.022, 0.02);
      n.connect(hp).connect(pk).connect(ng).connect(g);
      const osc = ac.createOscillator(); osc.frequency.setValueAtTime(210, when); osc.frequency.exponentialRampToValueAtTime(70, when + 0.08);
      const og = ac.createGain(); decay(og.gain, when, 0.6, 0.1, 0.001);
      osc.connect(og).connect(g); osc.start(when); osc.stop(when + 0.3);
    });
  },
  /** Body / bag thud on sand. */
  thud(t, o = {}) {
    at(t, 1, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan || 0, rev: 0.15 });
      g.gain.value = o.gain ?? 0.2;
      const osc = ac.createOscillator(); osc.frequency.setValueAtTime(95, when); osc.frequency.exponentialRampToValueAtTime(48, when + 0.15);
      const og = ac.createGain(); decay(og.gain, when, 1, 0.22, 0.002);
      osc.connect(og).connect(g); osc.start(when); osc.stop(when + 0.5);
      const n = nsrc(ac, R.pink, when, 0.3, when);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const ng = ac.createGain(); decay(ng.gain, when, 0.5, 0.12, 0.002);
      n.connect(lp).connect(ng).connect(g);
    });
  },
  /** Trickling sand / pebbles. */
  sand(t, dur = 1.5, o = {}) {
    at(t, Math.min(12.5, dur + 0.4), 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan || 0, rev: 0.25 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.06, when + 0.1);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.white, when, dur, when * 6);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4500; bp.Q.value = 1.2;
      const am = ac.createGain(); am.gain.value = 0.4;
      const lfo = ac.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 31;
      const lg = ac.createGain(); lg.gain.value = 0.6;
      lfo.connect(lg).connect(am.gain); lfo.start(when); lfo.stop(when + dur + 0.1);
      n.connect(bp).connect(am).connect(g);
    });
  },
  /** Desert / canyon wind bed. gust 0..1 */
  wind(t, dur = 8, o = {}) {
    at(t, Math.min(12.5, dur + 0.5), o.bus || 'amb', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.15, pan: o.pan || 0 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.08, when + Math.min(2, dur * 0.3));
      g.gain.setValueAtTime(o.gain ?? 0.08, when + dur - Math.min(2, dur * 0.3));
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.pink, when, dur, when * 0.37);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
      bp.frequency.value = o.tone ?? 520;
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.13 + (o.gust ?? 0.5) * 0.2;
      const lg = ac.createGain(); lg.gain.value = (o.tone ?? 520) * 0.6 * (o.gust ?? 0.5);
      lfo.connect(lg).connect(bp.frequency); lfo.start(when); lfo.stop(when + dur + 0.1);
      n.connect(bp).connect(g);
    });
  },
  /** Ringing ears after trauma. */
  tinnitus(t, dur = 4, o = {}) {
    at(t, Math.min(12.5, dur + 0.3), 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.025, when + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      const osc = ac.createOscillator(); osc.frequency.value = o.f ?? 6200;
      osc.connect(g); osc.start(when); osc.stop(when + dur + 0.1);
    });
  },
  /** Electric zap / stun gun (nerve). */
  zap(t, dur = 0.9, o = {}) {
    at(t, dur + 0.5, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.25, pan: o.pan || 0 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.12, when + 0.01);
      g.gain.setValueAtTime(o.gain ?? 0.12, when + dur * 0.8);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const osc = ac.createOscillator(); osc.type = 'square'; osc.frequency.value = 92;
      const fm = ac.createOscillator(); fm.frequency.value = 37;
      const fg = ac.createGain(); fg.gain.value = 60;
      fm.connect(fg).connect(osc.frequency);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      osc.connect(shaper(ac, 6)).connect(hp).connect(g);
      osc.start(when); fm.start(when); osc.stop(when + dur + 0.1); fm.stop(when + dur + 0.1);
      const n = nsrc(ac, R.white, when, dur, when * 9);
      const am = ac.createGain(); am.gain.value = 0;
      const lfo = ac.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 23;
      lfo.connect(am.gain); lfo.start(when); lfo.stop(when + dur + 0.1);
      const ng = ac.createGain(); ng.gain.value = 0.5;
      n.connect(am).connect(ng).connect(g);
    });
  },
  /** Defibrillator: charge whine then thump at t + charge. */
  defib(t, o = {}) {
    const charge = o.charge ?? 1.1;
    at(t, charge + 2, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.3 });
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(o.gain ?? 0.05, when + charge);
      g.gain.linearRampToValueAtTime(0.0001, when + charge + 0.02);
      const osc = ac.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(800, when); osc.frequency.exponentialRampToValueAtTime(4200, when + charge);
      osc.connect(g); osc.start(when); osc.stop(when + charge + 0.05);
    });
    S.impact(t + charge, { size: 0.9, gain: (o.gain ?? 0.05) * 5 });
    S.subHit(t + charge, { gain: 0.25, decay: 1.2 });
  },
  /** Camcorder REC beep. */
  recBeep(t, o = {}) {
    [0, 0.12].forEach((off) => at(t + off, 0.2, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.05 });
      decay(g.gain, when, o.gain ?? 0.05, 0.08, 0.002);
      const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = 2800;
      osc.connect(g); osc.start(when); osc.stop(when + 0.1);
    }));
  },
  /** Helicopter rotor pass. dur ≤ 12 */
  heli(t, dur = 8, o = {}) {
    at(t, Math.min(12.5, dur + 0.5), o.bus || 'amb', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.2 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.12, when + dur * (o.peakAt ?? 0.6));
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.brown, when, dur, when * 1.2);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      const am = ac.createGain(); am.gain.value = 0.15;
      const lfo = ac.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = o.rate ?? 6.2;
      const lg = ac.createGain(); lg.gain.value = 0.85;
      lfo.connect(lg).connect(am.gain); lfo.start(when); lfo.stop(when + dur + 0.1);
      n.connect(lp).connect(am).connect(g);
      const tur = ac.createOscillator(); tur.type = 'sawtooth'; tur.frequency.value = 1480;
      const tb = ac.createBiquadFilter(); tb.type = 'bandpass'; tb.frequency.value = 1500; tb.Q.value = 12;
      const tg = ac.createGain(); tg.gain.value = 0.05;
      tur.connect(tb).connect(tg).connect(g); tur.start(when); tur.stop(when + dur + 0.1);
    });
  },
  /** Water drip in a cave. */
  drip(t, o = {}) {
    at(t, 1.2, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan ?? 0.3, rev: 0.7 });
      decay(g.gain, when, o.gain ?? 0.05, 0.12, 0.001);
      const osc = ac.createOscillator(); osc.frequency.setValueAtTime(o.f ?? 900, when); osc.frequency.exponentialRampToValueAtTime((o.f ?? 900) * 2.2, when + 0.05);
      osc.connect(g); osc.start(when); osc.stop(when + 0.2);
    });
  },
  /** Taut rope creak / ring (pulley). ring:true adds a pitched string tone. */
  rope(t, dur = 1.2, o = {}) {
    at(t, dur + 0.6, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan || 0, rev: 0.35 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.08, when + 0.05);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.white, when, dur, when * 3);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 14;
      const am = ac.createGain(); am.gain.value = 0.3;
      const lfo = ac.createOscillator(); lfo.frequency.value = 17; const lg = ac.createGain(); lg.gain.value = 0.7;
      lfo.connect(lg).connect(am.gain); lfo.start(when); lfo.stop(when + dur + 0.1);
      n.connect(bp).connect(am).connect(g);
      if (o.ring) {
        const osc = ac.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(o.f ?? 196, when);
        osc.frequency.linearRampToValueAtTime((o.f ?? 196) * 1.06, when + dur);
        const og = ac.createGain(); og.gain.value = 0.35;
        osc.connect(og).connect(g); osc.start(when); osc.stop(when + dur + 0.1);
      }
    });
  },
  /** Metal on rock scrape (chipping with the knife). */
  scrape(t, dur = 0.4, o = {}) {
    at(t, dur + 0.4, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan || 0, rev: 0.2 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.07, when + 0.02);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.white, when, dur, when * 5);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 9;
      bp.frequency.setValueAtTime(o.f ?? 3100, when); bp.frequency.linearRampToValueAtTime((o.f ?? 3100) * 0.8, when + dur);
      n.connect(bp).connect(g);
    });
  },
  /** Pen / knife writing scratch. */
  scratch(t, dur = 1, o = {}) {
    at(t, dur + 0.3, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan || 0, rev: 0.1 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.04, when + 0.05);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const n = nsrc(ac, R.white, when, dur, when * 8);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = o.f ?? 5200; bp.Q.value = 2;
      const am = ac.createGain(); am.gain.value = 0.2;
      const lfo = ac.createOscillator(); lfo.frequency.value = o.rate ?? 9; const lg = ac.createGain(); lg.gain.value = 0.8;
      lfo.connect(lg).connect(am.gain); lfo.start(when); lfo.stop(when + dur + 0.1);
      n.connect(bp).connect(am).connect(g);
    });
  },
  /** Paper rustle / card. */
  paper(t, o = {}) {
    at(t, 0.6, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { pan: o.pan || 0, rev: 0.1 });
      decay(g.gain, when, o.gain ?? 0.05, 0.25, 0.01);
      const n = nsrc(ac, R.white, when, 0.4, when * 11);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
      n.connect(hp).connect(g);
    });
  },
  /** Typewriter key. */
  key(t, o = {}) { S.click(t, { f: 1800, gain: o.gain ?? 0.07 }); S.thud(t + 0.004, { gain: (o.gain ?? 0.07) * 0.6 }); },
  /** Camera shutter. */
  shutter(t, o = {}) { S.click(t, { f: 4200, gain: o.gain ?? 0.08 }); S.click(t + 0.07, { f: 2600, gain: (o.gain ?? 0.08) * 0.8 }); },
  /** Footsteps on sand: n steps every `step` seconds. */
  steps(t, n = 4, step = 0.55, o = {}) {
    for (let k = 0; k < n; k++) {
      at(t + k * step, 0.4, 'sfx', (ac, out, when, R) => {
        const g = chain(ac, out, R, { pan: (k % 2 ? 0.15 : -0.15) + (o.pan || 0), rev: 0.12 });
        decay(g.gain, when, (o.gain ?? 0.06) * (k % 2 ? 0.85 : 1), 0.14, 0.008);
        const nn = nsrc(ac, R.white, when, 0.25, when * 13 + k);
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400 + (k % 3) * 300; bp.Q.value = 1.4;
        nn.connect(bp).connect(g);
      });
    }
  },
  /** Tonal "story" hit: piano-ish strike + sub, for big reveals. f in Hz. */
  stinger(t, f = 73.42, o = {}) {
    at(t, 4, 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.6 });
      decay(g.gain, when, o.gain ?? 0.14, 3, 0.004);
      [1, 2, 3, 4.2, 6].forEach((m, k) => {
        const osc = ac.createOscillator(); osc.frequency.value = f * m;
        const og = ac.createGain(); decay(og.gain, when, 0.6 / (k + 1), 3 / (k + 1), 0.003);
        osc.connect(og).connect(g); osc.start(when); osc.stop(when + 3.5);
      });
    });
    S.subHit(t, { gain: (o.gain ?? 0.14) * 1.4, decay: 1.6, from: f, to: f * 0.5 });
  },
  /** High shimmer (revelation / light). */
  shimmer(t, dur = 2.5, o = {}) {
    at(t, Math.min(12.5, dur + 0.5), 'sfx', (ac, out, when, R) => {
      const g = chain(ac, out, R, { rev: 0.8 });
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(o.gain ?? 0.035, when + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      [2093, 2637, 3136, 4186].forEach((f, k) => {
        const osc = ac.createOscillator(); osc.frequency.value = f * (o.transpose ?? 1);
        const lfo = ac.createOscillator(); lfo.frequency.value = 5 + k; const lg = ac.createGain(); lg.gain.value = 8;
        lfo.connect(lg).connect(osc.detune); lfo.start(when); lfo.stop(when + dur + 0.1);
        const og = ac.createGain(); og.gain.value = 0.25;
        osc.connect(og).connect(g); osc.start(when); osc.stop(when + dur + 0.1);
      });
    });
  },
  /** Glitch burst (delirium, data). */
  glitch(t, dur = 0.3, o = {}) {
    at(t, dur + 0.3, 'sfx', (ac, out, when) => {
      const R = { rand: mulberry32(Math.round(t * 1000) + 17), reverb: null };
      const g = chain(ac, out, R, { rev: 0, pan: o.pan || 0 });
      g.gain.value = 0;
      const steps = Math.max(3, Math.round(dur / 0.03));
      for (let k = 0; k < steps; k++) g.gain.setValueAtTime(R.rand() < 0.6 ? (o.gain ?? 0.06) : 0, when + k * (dur / steps));
      g.gain.setValueAtTime(0, when + dur);
      const osc = ac.createOscillator(); osc.type = 'square';
      for (let k = 0; k < steps; k++) osc.frequency.setValueAtTime(200 + R.rand() * 2400, when + k * (dur / steps));
      osc.connect(g); osc.start(when); osc.stop(when + dur + 0.05);
    });
  },
};

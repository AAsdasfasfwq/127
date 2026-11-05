// ─────────────────────────────────────────────────────────────────────────────
// engine.js — the timeline, compositor and frame renderer.
//
// A film is a list of SCENES on one absolute timeline (seconds, VO time).
//   scene({ id, start, end, render(ctx, lt, info), init?, dispose?, in?, post?, z? })
// • base scenes (z = 0 / undefined) tile the timeline; the latest-starting one wins.
// • `in: { type, dur, ...opts }` blends FROM the previous base scene over `dur` seconds.
//   The previous scene keeps being rendered past its `end` during that blend, so every
//   scene must render sensibly up to ~2 s beyond its end (continue/hold motion).
// • overlays (z > 0) are drawn on top of the base picture, in z order, with alpha.
// • every frame is a PURE function of time t. Never keep state that depends on the
//   order frames are requested in (render.js renders chunks in parallel, out of order).
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, ease } from './util.js';
import { transitions } from './transitions.js';
import { applyPost, DEFAULT_POST } from './post.js';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const VO_DURATION = 1027.79; // seconds of narration audio
export const TAIL = 2.51;            // clean hold after the last word
export const DURATION = 1030.30;     // = VO + tail (total film length)
export const TOTAL_FRAMES = Math.round(DURATION * FPS);

/** Hand-off map: one agent owns each time range. Boundaries are hard contracts. */
export const SECTIONS = [
  { id: 's1', start: 0.0, end: 138.2, title: 'The Maze & The Man' },
  { id: 's2', start: 138.2, end: 302.25, title: 'The Boulder' },
  { id: 's3', start: 302.25, end: 454.2, title: 'Plans, Night, Thirst' },
  { id: 's4', start: 454.2, end: 600.76, title: 'The Diary & The Vision' },
  { id: 's5', start: 600.76, end: 717.05, title: 'The Decision' },
  { id: 's6', start: 717.05, end: 885.26, title: 'The Hardest Part & The Walk Out' },
  { id: 's7', start: 885.26, end: DURATION, title: 'Rescue & The Lesson' },
];

const scenes = [];
let sorted = null;
export const errors = [];

export function scene(def) {
  if (!def || typeof def.render !== 'function') throw new Error('scene() needs a render function');
  if (!(def.end > def.start)) throw new Error(`scene ${def.id}: end must be > start`);
  def.z = def.z || 0;
  def._inited = false;
  def._buffers = new Map();
  scenes.push(def);
  sorted = null;
  return def;
}
export const allScenes = () => scenes.slice();

function ensureSorted() {
  if (sorted) return;
  sorted = {
    base: scenes.filter((s) => !s.z).sort((a, b) => a.start - b.start),
    over: scenes.filter((s) => s.z).sort((a, b) => a.z - b.z || a.start - b.start),
  };
}

// ── Buffers ──────────────────────────────────────────────────────────────────
export function makeCanvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const pool = [];
let poolCursor = 0;
function acquire() {
  if (poolCursor >= pool.length) {
    const c = makeCanvas();
    pool.push({ canvas: c, ctx: c.getContext('2d') });
  }
  const b = pool[poolCursor++];
  resetCtx(b.ctx);
  b.ctx.clearRect(0, 0, W, H);
  return b;
}
export function resetCtx(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.setLineDash([]);
}

// ── Scene rendering ──────────────────────────────────────────────────────────
function makeInfo(s, t) {
  const lt = t - s.start;
  const dur = s.end - s.start;
  return {
    t, lt, dur,
    p: clamp(lt / dur),
    frame: Math.round(t * FPS),
    W, H, FPS,
    scene: s,
    /** persistent canvas cached per scene (draw static art once; check `.drawn`) */
    buf(name, w = W, h = H) {
      let c = s._buffers.get(name);
      if (!c) { c = makeCanvas(w, h); c.drawn = false; s._buffers.set(name, c); }
      return c;
    },
    /** temporary cleared full-frame canvas for this frame only: returns {canvas, ctx} */
    tmp() { return acquire(); },
  };
}

async function renderScene(s, t, ctx) {
  const info = makeInfo(s, t);
  try {
    if (!s._inited) {
      s._inited = true;
      if (s.init) await s.init(info);
    }
    ctx.save();
    resetCtx(ctx);
    const r = s.render(ctx, info.lt, info);
    if (r && typeof r.then === 'function') await r;
    ctx.restore();
  } catch (e) {
    try { ctx.restore(); } catch (_) {}
    const msg = `[${s.id}] t=${t.toFixed(3)}: ${e && e.stack ? e.stack : e}`;
    if (errors.length < 200) errors.push(msg);
    console.error(msg);
  }
}

function findBase(t) {
  ensureSorted();
  let cur = null;
  for (const s of sorted.base) if (s.start <= t + 1e-9 && t < s.end - 1e-9) cur = s;
  return cur;
}
function findPrev(cur) {
  let prev = null;
  for (const s of sorted.base) {
    if (s === cur) continue;
    if (s.start < cur.start - 1e-9 && s.end >= cur.start - 1e-3) prev = s;
  }
  return prev;
}

function disposeFar(t) {
  for (const s of scenes) {
    if (!s._inited) continue;
    if (t > s.end + 25 || t < s.start - 60) {
      try { if (s.dispose) s.dispose(); } catch (_) {}
      s._buffers.clear();
      s._inited = false;
    }
  }
}

let outCtx = null;
export function setOutput(canvas) { outCtx = canvas.getContext('2d'); }

/** Render the frame at absolute time t into the output canvas. */
export async function renderFrame(t, target = outCtx) {
  ensureSorted();
  poolCursor = 0;
  disposeFar(t);
  const ctx = target;
  resetCtx(ctx);
  ctx.fillStyle = '#120d0b';
  ctx.fillRect(0, 0, W, H);

  const cur = findBase(t);
  let post = DEFAULT_POST;
  if (cur) {
    post = { ...DEFAULT_POST, ...(cur.post || {}) };
    const inT = cur.in;
    const blending = inT && inT.type && inT.type !== 'cut' && t < cur.start + (inT.dur || 0);
    const prev = blending ? findPrev(cur) : null;
    if (blending && prev) {
      const a = acquire(), b = acquire();
      await renderScene(prev, t, a.ctx);
      await renderScene(cur, t, b.ctx);
      const raw = clamp((t - cur.start) / inT.dur);
      const p = (inT.ease || ease.inOutCubic)(raw);
      const fn = transitions[inT.type] || transitions.fade;
      resetCtx(ctx);
      fn(ctx, a.canvas, b.canvas, p, inT, { t, raw, W, H, tmp: acquire });
      // blend post settings too
      const pp = { ...DEFAULT_POST, ...(prev.post || {}) };
      for (const k of Object.keys(post)) if (typeof post[k] === 'number' && typeof pp[k] === 'number') post[k] = pp[k] + (post[k] - pp[k]) * raw;
    } else {
      await renderScene(cur, t, ctx);
    }
  }

  // overlays
  for (const s of sorted.over) {
    if (!(s.start <= t && t < s.end)) continue;
    const o = acquire();
    await renderScene(s, t, o.ctx);
    const fi = s.fadeIn || 0, fo = s.fadeOut || 0;
    let a = 1;
    if (fi > 0) a = Math.min(a, clamp((t - s.start) / fi));
    if (fo > 0) a = Math.min(a, clamp((s.end - t) / fo));
    resetCtx(ctx);
    ctx.globalAlpha = a;
    if (s.blend) ctx.globalCompositeOperation = s.blend;
    ctx.drawImage(o.canvas, 0, 0);
    resetCtx(ctx);
  }

  resetCtx(ctx);
  applyPost(ctx, t, post, acquire);
  resetCtx(ctx);
}

/** Timeline QA: list gaps (no base scene) and overlaps for tools/check.js */
export function timelineReport() {
  ensureSorted();
  const gaps = [];
  const step = 1 / FPS;
  let inGap = null;
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f * step;
    const c = findBase(t);
    if (!c && inGap === null) inGap = t;
    if (c && inGap !== null) { gaps.push([+inGap.toFixed(3), +t.toFixed(3)]); inGap = null; }
  }
  if (inGap !== null) gaps.push([+inGap.toFixed(3), DURATION]);
  return {
    scenes: sorted.base.map((s) => ({ id: s.id, start: s.start, end: s.end, in: s.in ? s.in.type : null })),
    overlays: sorted.over.map((s) => ({ id: s.id, start: s.start, end: s.end, z: s.z })),
    gaps,
  };
}

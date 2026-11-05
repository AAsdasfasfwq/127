// ─────────────────────────────────────────────────────────────────────────────
// transitions.js — compositor functions used by scene `in: { type, dur, ... }`.
// Signature: fn(ctx, A, B, p, opts, env)   A = outgoing canvas, B = incoming canvas,
// p = eased progress 0→1, env = { t, raw, W, H, tmp() }.
//
// FILM TRANSITION FAMILIES (see docs/ART_BIBLE.md §Montage):
//   'slit'     – vertical canyon slit of light opens (signature motif)
//   'strata'   – sandstone layers wipe in staggered wavy bands
//   'occluder' – a foreground rock wall passes the lens, swap happens behind it
//   'sand'     – organic grain dissolve (noise threshold)
//   'tear'     – torn paper edge (collage chapters)
//   'iris'     – circular shape-match reveal from a point
//   'light'    – over-exposure bridge (flash of heat / revelation)
//   'push' / 'whip' / 'zoom' / 'blur' / 'fade' / 'dip' / 'shape' / 'cut'
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, ease, noise, rng } from './util.js';

const W = 1920, H = 1080;

function drawFull(ctx, img, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, 0, 0);
  ctx.globalAlpha = 1;
}

// low-res noise field for the sand dissolve (built once per seed)
const sandCache = new Map();
function sandField(seed, w, h) {
  const key = seed + ':' + w;
  if (sandCache.has(key)) return sandCache.get(key);
  const f = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = noise.fbm2(x * 0.018 + seed * 3.1, y * 0.018 - seed, 5) * 0.5 + 0.5;
      const g = (noise.n2(x * 0.9 + seed, y * 0.9) * 0.5 + 0.5) * 0.18; // grain
      f[y * w + x] = clamp(n * 0.82 + g);
    }
  sandCache.set(key, f);
  return f;
}
const maskCanvas = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 480; c.height = 270;
  return c;
})();

export const transitions = {
  cut(ctx, A, B) { drawFull(ctx, B); },

  fade(ctx, A, B, p) { drawFull(ctx, A); drawFull(ctx, B, p); },

  dip(ctx, A, B, p, o) {
    const color = o.color || '#120d0b';
    if (p < 0.5) { drawFull(ctx, A); ctx.fillStyle = color; ctx.globalAlpha = p * 2; ctx.fillRect(0, 0, W, H); }
    else { drawFull(ctx, B); ctx.fillStyle = color; ctx.globalAlpha = (1 - p) * 2; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
  },

  /** Canyon slit: B is revealed through a jagged vertical crack that widens. */
  slit(ctx, A, B, p, o) {
    drawFull(ctx, A);
    const cx = o.x ?? W / 2;
    const jag = o.jag ?? 42;
    const seed = o.seed ?? 3;
    const half = lerp(0, W * 0.75 + jag * 2, ease.inOutQuart(p));
    const steps = 48;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const y = (i / steps) * (H + 40) - 20;
      const x = cx - half + noise.fbm2(y * 0.006, seed, 3) * jag + noise.n2(y * 0.04, seed + 9) * jag * 0.25;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const y = (i / steps) * (H + 40) - 20;
      const x = cx + half + noise.fbm2(y * 0.006, seed + 5, 3) * jag + noise.n2(y * 0.04, seed + 19) * jag * 0.25;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.save();
    ctx.clip();
    drawFull(ctx, B);
    ctx.restore();
    // hot rim light on the crack edges
    const rim = o.rim ?? 'rgba(255,214,160,0.9)';
    ctx.strokeStyle = rim;
    ctx.lineWidth = lerp(5, 1, p);
    ctx.globalAlpha = Math.sin(Math.PI * clamp(p * 1.15)) * 0.9;
    ctx.shadowColor = rim;
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.restore();
  },

  /** Sandstone strata wipe: staggered horizontal wavy bands. */
  strata(ctx, A, B, p, o) {
    drawFull(ctx, A);
    const n = o.bands ?? 7;
    const dir = o.dir ?? 1; // 1 = left→right
    const seed = o.seed ?? 11;
    const bh = H / n;
    for (let i = 0; i < n; i++) {
      const order = o.alternate === false ? i : (i % 2 ? n - 1 - i : i);
      const pi = clamp((p - (order / n) * 0.45) / 0.55);
      if (pi <= 0) continue;
      const e = ease.inOutCubic(pi);
      const edge = lerp(-160, W + 160, e);
      ctx.save();
      ctx.beginPath();
      const y0 = i * bh - 6, y1 = (i + 1) * bh + 6;
      const wav = (y) => noise.fbm2(y * 0.01, seed + i * 7.7, 3) * 70;
      if (dir > 0) {
        ctx.moveTo(-10, y0);
        for (let y = y0; y <= y1; y += 12) ctx.lineTo(edge + wav(y), y);
        ctx.lineTo(edge + wav(y1), y1);
        ctx.lineTo(-10, y1);
      } else {
        ctx.moveTo(W + 10, y0);
        for (let y = y0; y <= y1; y += 12) ctx.lineTo(W - edge + wav(y), y);
        ctx.lineTo(W - edge + wav(y1), y1);
        ctx.lineTo(W + 10, y1);
      }
      ctx.closePath();
      ctx.clip();
      drawFull(ctx, B);
      ctx.restore();
    }
  },

  /** A dark foreground rock wall sweeps past the lens; the cut hides behind it. */
  occluder(ctx, A, B, p, o) {
    const dir = o.dir ?? 1;
    drawFull(ctx, p < 0.5 ? A : B);
    const color = o.color || '#1d1210';
    const rimC = o.rim || 'rgba(255,170,110,0.55)';
    const cx = lerp(dir > 0 ? -W * 0.9 : W * 1.9, dir > 0 ? W * 1.9 : -W * 0.9, ease.inOutSine(p));
    const half = W * 0.72;
    const seed = o.seed ?? 21;
    ctx.save();
    ctx.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const y = (i / steps) * (H + 80) - 40;
      const x = cx - half + noise.fbm2(y * 0.004, seed, 4) * 160;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const y = (i / steps) * (H + 80) - 40;
      ctx.lineTo(cx + half + noise.fbm2(y * 0.004, seed + 3, 4) * 160, y);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    g.addColorStop(0, '#3a2219');
    g.addColorStop(0.18, color);
    g.addColorStop(0.82, color);
    g.addColorStop(1, '#2c1914');
    ctx.fillStyle = g;
    ctx.filter = 'blur(6px)';
    ctx.fill();
    ctx.filter = 'none';
    ctx.strokeStyle = rimC;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.restore();
  },

  /** Organic grain dissolve. */
  sand(ctx, A, B, p, o, env) {
    drawFull(ctx, A);
    if (!maskCanvas) { drawFull(ctx, B, p); return; }
    const mw = maskCanvas.width, mh = maskCanvas.height;
    const f = sandField(o.seed ?? 5, mw, mh);
    const mctx = maskCanvas.getContext('2d');
    const img = mctx.createImageData(mw, mh);
    const d = img.data;
    const thr = lerp(-0.15, 1.15, p);
    const soft = o.soft ?? 0.08;
    const bias = o.fromBottom ? 1 : 0;
    for (let y = 0; y < mh; y++)
      for (let x = 0; x < mw; x++) {
        const i = y * mw + x;
        const v = f[i] * (1 - bias * 0.5) + (bias ? (1 - y / mh) * 0.5 : 0);
        const a = clamp((thr - v) / soft + 0.5);
        d[i * 4 + 3] = a * 255;
      }
    mctx.putImageData(img, 0, 0);
    const t = env.tmp();
    t.ctx.drawImage(B, 0, 0);
    t.ctx.globalCompositeOperation = 'destination-in';
    t.ctx.imageSmoothingEnabled = true;
    t.ctx.drawImage(maskCanvas, 0, 0, W, H);
    t.ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(t.canvas, 0, 0);
  },

  /** Torn paper edge sweeping diagonally. */
  tear(ctx, A, B, p, o) {
    drawFull(ctx, B);
    const r = rng(o.seed ?? 77);
    const jitter = Array.from({ length: 64 }, () => r());
    const ang = o.angle ?? 0.22;
    const off = lerp(-W * 0.35, W * 1.35, ease.inOutCubic(p));
    const pts = [];
    for (let i = 0; i <= 63; i++) {
      const y = (i / 63) * (H + 200) - 100;
      const x = off + (y - H / 2) * ang + (jitter[i] - 0.5) * 26 + noise.n2(y * 0.02, 4) * 18;
      pts.push([x, y]);
    }
    // A remains to the right of the tear
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W + 400, -100);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(W + 400, H + 100);
    ctx.closePath();
    ctx.shadowColor = 'rgba(20,10,5,0.45)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = -10;
    ctx.fillStyle = '#efe6d6';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.clip();
    drawFull(ctx, A);
    ctx.restore();
    // paper fibre edge
    ctx.save();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + 7, y) : ctx.moveTo(x + 7, y)));
    ctx.strokeStyle = 'rgba(245,238,226,0.95)';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.restore();
  },

  iris(ctx, A, B, p, o) {
    const x = o.x ?? W / 2, y = o.y ?? H / 2;
    const maxR = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 20;
    const r = lerp(o.r0 ?? 0, maxR, p);
    drawFull(ctx, A);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
    ctx.clip();
    drawFull(ctx, B);
    ctx.restore();
    if (o.ring) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = o.ring;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - p;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  /** Over-exposure bridge: A burns to warm white, B develops out of it. */
  light(ctx, A, B, p, o) {
    const c = o.color || '#fff1dc';
    const k = Math.sin(Math.PI * p);
    drawFull(ctx, p < 0.5 ? A : B);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = k;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = clamp((k - 0.55) / 0.45);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  },

  push(ctx, A, B, p, o) {
    const dir = o.dir || 'left';
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const ox = dx * W * p, oy = dy * H * p;
    ctx.drawImage(A, ox, oy);
    ctx.drawImage(B, ox - dx * W, oy - dy * H);
  },

  whip(ctx, A, B, p, o) {
    const dir = o.dir || 'left';
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const blur = Math.sin(Math.PI * p) * (o.blur ?? 40);
    const ox = dx * W * p, oy = dy * H * p;
    ctx.filter = `blur(${blur.toFixed(1)}px)`;
    ctx.drawImage(A, ox, oy);
    ctx.drawImage(B, ox - dx * W, oy - dy * H);
    ctx.filter = 'none';
  },

  zoom(ctx, A, B, p, o) {
    const x = o.x ?? W / 2, y = o.y ?? H / 2;
    const s1 = lerp(1, o.scaleOut ?? 1.7, ease.inCubic(p));
    ctx.save();
    ctx.translate(x, y); ctx.scale(s1, s1); ctx.translate(-x, -y);
    ctx.filter = `blur(${(p * 18).toFixed(1)}px)`;
    ctx.globalAlpha = 1 - ease.inQuad(p);
    ctx.drawImage(A, 0, 0);
    ctx.restore();
    const s2 = lerp(o.scaleIn ?? 0.82, 1, ease.outCubic(p));
    ctx.save();
    ctx.translate(x, y); ctx.scale(s2, s2); ctx.translate(-x, -y);
    ctx.filter = `blur(${((1 - p) * 14).toFixed(1)}px)`;
    ctx.globalAlpha = ease.outQuad(p);
    ctx.drawImage(B, 0, 0);
    ctx.restore();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  },

  blur(ctx, A, B, p, o) {
    const m = o.max ?? 26;
    ctx.filter = `blur(${(p * m).toFixed(1)}px)`;
    ctx.drawImage(A, 0, 0);
    ctx.filter = `blur(${((1 - p) * m).toFixed(1)}px)`;
    ctx.globalAlpha = p;
    ctx.drawImage(B, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  },

  /** Custom clip: o.path(ctx, p) builds a path; B is drawn inside it. */
  shape(ctx, A, B, p, o) {
    drawFull(ctx, A);
    ctx.save();
    ctx.beginPath();
    o.path(ctx, p, W, H);
    ctx.clip(o.rule || 'nonzero');
    drawFull(ctx, B);
    ctx.restore();
  },
};

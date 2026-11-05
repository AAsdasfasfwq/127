// ─────────────────────────────────────────────────────────────────────────────
// S6 shared toolkit: grounds, labels, dimension lines, silhouettes from the rig,
// glow strokes, lightning, cel helpers for the supporting cast.
// Everything is a pure function of its inputs (deterministic).
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, ease, seg, rng, noise, TAU, rgba, mixColor, hexToRgb } from '../../core/util.js';
import { C, ROCK } from '../../core/palette.js';
import { text, maskRise, measure, F } from '../../core/text.js';
import { paper, cached, sandstone } from '../../core/textures.js';
import { drawAaron } from '../../core/aaron.js';

export const W = 1920, H = 1080;
export const K = {
  night: '#120D0B', ink: '#1B1512', blood: '#8E1F14', red: C.red, hot: '#FFF1DC', bone: C.bone,
  nerve: '#FFD27A', cord: '#EDE6D6', sky: C.sky, gold: C.gold, line: '#2A1712',
};

/** progress helper: in [a,b] eased, out [c,d] (faster). returns {i, o, v} v = visible amount */
export function io(t, a, b, c, d, ei = ease.outExpo, eo = ease.inQuart) {
  const i = seg(t, a, b, ei);
  const o = c === undefined ? 0 : seg(t, c, d, eo);
  return { i, o, v: i * (1 - o) };
}

/** Near-black warm ground with mottled paper fibre (never flat #000). */
export function darkGround(ctx, o = {}) {
  const base = o.base || '#17110E';
  const tex = paper(1920, 1080, { base, seed: o.seed ?? 61, fibre: 0.5, mottling: 1.4 });
  ctx.drawImage(tex, 0, 0);
  const g = ctx.createRadialGradient(o.cx ?? 960, o.cy ?? 500, 80, o.cx ?? 960, o.cy ?? 540, 1150);
  g.addColorStop(0, rgba(o.glow || '#3A1F16', o.glowA ?? 0.55));
  g.addColorStop(0.55, 'rgba(18,13,11,0)');
  g.addColorStop(1, 'rgba(8,5,4,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Mono label with mask-rise entrance and faster fall exit. */
export function label(ctx, str, x, y, pin, pout = 0, o = {}) {
  if (pin <= 0 || pout >= 1) return 0;
  const size = o.size ?? 22;
  const opt = { family: 'mono', size, weight: o.weight ?? 600, color: o.color || C.bone, tracking: o.tracking ?? 0.28, align: o.align || 'left', ...o };
  ctx.save();
  if (pout > 0) ctx.globalAlpha *= 1 - ease.inQuad(pout);
  const w = maskRise(ctx, str, x, y - (pout > 0 ? ease.inQuart(pout) * size * 0.6 : 0), pin, opt);
  ctx.restore();
  return w;
}

/** Partial polyline (p 0..1 of total length). */
export function polyPartial(ctx, pts, p) {
  if (p <= 0 || pts.length < 2) return null;
  let total = 0;
  const L = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); total += l; }
  let d = clamp(p) * total;
  ctx.moveTo(pts[0][0], pts[0][1]);
  let end = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (d >= L[i - 1]) { ctx.lineTo(pts[i][0], pts[i][1]); d -= L[i - 1]; end = pts[i]; }
    else { const f = L[i - 1] ? d / L[i - 1] : 0; end = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; ctx.lineTo(end[0], end[1]); break; }
  }
  return end;
}
export function polyLength(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
export function polyAt(pts, p) {
  const total = polyLength(pts);
  let d = clamp(p) * total;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= l || i === pts.length - 1) { const f = l ? clamp(d / l) : 0; return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; }
    d -= l;
  }
  const q = pts[pts.length - 1];
  return [q[0], q[1], 0];
}

/** Glowing stroke: wide blurred under-stroke + crisp core. build(ctx) makes the path. */
export function glow(ctx, build, color, width, o = {}) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.globalCompositeOperation = o.blend || 'lighter';
  ctx.filter = `blur(${(o.blur ?? width * 2.2).toFixed(1)}px)`;
  ctx.strokeStyle = color; ctx.lineWidth = width * (o.spread ?? 3.2);
  ctx.beginPath(); build(ctx); ctx.stroke();
  ctx.filter = 'none';
  ctx.globalCompositeOperation = o.coreBlend || 'source-over';
  ctx.strokeStyle = o.core || color; ctx.lineWidth = width;
  ctx.beginPath(); build(ctx); ctx.stroke();
  ctx.restore();
}

/**
 * Engineering dimension line from (x0,y0) to (x1,y1), drawn progressively (p), with end ticks,
 * arrowheads and a label at the middle (offset perpendicular by `off`).
 */
export function dimension(ctx, x0, y0, x1, y1, p, o = {}) {
  if (p <= 0) return;
  const col = o.color || C.bone;
  const e = ease.inOutCubic(clamp(p * 1.25));
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const tick = o.tick ?? 16;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const ax = lerp(mx, x0, e), ay = lerp(my, y0, e), bx = lerp(mx, x1, e), by = lerp(my, y1, e);
  ctx.save();
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = o.width ?? 2;
  ctx.globalAlpha *= o.alpha ?? 1;
  // extension ticks
  const tp = clamp(p * 3);
  ctx.beginPath();
  ctx.moveTo(x0 - nx * tick * tp, y0 - ny * tick * tp); ctx.lineTo(x0 + nx * tick * tp, y0 + ny * tick * tp);
  ctx.moveTo(x1 - nx * tick * tp, y1 - ny * tick * tp); ctx.lineTo(x1 + nx * tick * tp, y1 + ny * tick * tp);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  // arrowheads
  const ah = o.arrow ?? 12;
  const arrow = (x, y, a) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a - 0.35) * ah, y - Math.sin(a - 0.35) * ah); ctx.lineTo(x - Math.cos(a + 0.35) * ah, y - Math.sin(a + 0.35) * ah); ctx.closePath(); ctx.fill(); };
  if (e > 0.98) { arrow(x1, y1, ang); arrow(x0, y0, ang + Math.PI); }
  ctx.restore();
  if (o.label) {
    const lp = clamp((p - 0.45) / 0.55);
    if (lp > 0) {
      const off = o.off ?? -26;
      const lx = mx + nx * off, ly = my + ny * off;
      ctx.save();
      ctx.translate(lx, ly);
      if (o.rotateLabel) ctx.rotate(ang);
      if (o.gap) { ctx.fillStyle = o.gapColor || K.night; const wq = measure(ctx, o.label, o.labelStyle || { family: 'display', size: 64, weight: 800 }) + 30; ctx.fillRect(-wq / 2, -40, wq, 56); }
      maskRise(ctx, o.label, 0, 0, lp, { family: 'display', size: 64, weight: 800, color: o.labelColor || col, align: 'center', tracking: 0.02, ...(o.labelStyle || {}) });
      ctx.restore();
    }
  }
}

/**
 * A silhouette canvas of Aron rendered with the canonical rig (alpha mask) — cached per key.
 * returns { canvas, joints } where joints are in canvas coordinates (full frame 1920×1080).
 */
export function aronMask(key, opts) {
  return cached('s6mask:' + key, () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const joints = drawAaron(g, opts);
    return { canvas: c, joints };
  });
}
/** Recolour an alpha mask into a new canvas (cached). */
export function tintMask(key, mask, color) {
  return cached('s6tint:' + key, () => {
    const c = document.createElement('canvas');
    c.width = mask.width; c.height = mask.height;
    const g = c.getContext('2d');
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  });
}
/** Outline ring (px thick) of an alpha mask, coloured (cached). */
export function outlineMask(key, mask, px, color) {
  return cached('s6out:' + key, () => {
    const c = document.createElement('canvas');
    c.width = mask.width; c.height = mask.height;
    const g = c.getContext('2d');
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; g.drawImage(mask, Math.cos(a) * px, Math.sin(a) * px); }
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  });
}

/** Procedural lightning bolt between two points (midpoint displacement). Returns points. */
export function bolt(x0, y0, x1, y1, seed, o = {}) {
  const r = rng(seed);
  let pts = [[x0, y0], [x1, y1]];
  const depth = o.depth ?? 6;
  let amp = (o.amp ?? 0.22) * Math.hypot(x1 - x0, y1 - y0);
  for (let d = 0; d < depth; d++) {
    const np = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      const off = (r() - 0.5) * amp;
      np.push([mx + Math.cos(ang) * off, my + Math.sin(ang) * off], b);
    }
    pts = np;
    amp *= 0.55;
  }
  return pts;
}
export function strokePts(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }

/** Small HUD-like corner tick marks framing an area (technical drawing frame). */
export function cornerMarks(ctx, x, y, w, h, p, o = {}) {
  if (p <= 0) return;
  const l = (o.len ?? 26) * ease.outCubic(clamp(p));
  ctx.save();
  ctx.strokeStyle = o.color || C.bone; ctx.globalAlpha *= o.alpha ?? 0.5; ctx.lineWidth = o.width ?? 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + l); ctx.lineTo(x, y); ctx.lineTo(x + l, y);
  ctx.moveTo(x + w - l, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + l);
  ctx.moveTo(x + w, y + h - l); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - l, y + h);
  ctx.moveTo(x + l, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - l);
  ctx.stroke();
  ctx.restore();
}

/** Thin strata hairlines field (texture layer). */
export function hairStrata(ctx, t, o = {}) {
  ctx.save();
  ctx.strokeStyle = o.color || C.bone;
  ctx.globalAlpha *= o.alpha ?? 0.06;
  ctx.lineWidth = o.width ?? 1.2;
  const n = o.count ?? 16;
  const y0 = o.y0 ?? 0, h = o.h ?? H;
  for (let k = 0; k < n; k++) {
    ctx.beginPath();
    const yb = y0 + (k + 0.5) * (h / n);
    for (let x = -20; x <= W + 20; x += 24) {
      const y = yb + noise.fbm2(x * 0.0017 + k * 0.37, k * 1.3 + t * (o.speed ?? 0.03), 3) * (o.amp ?? 40);
      x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Screen-space heat shimmer: re-draws horizontal strips of `src` with sine offsets. */
export function shimmer(ctx, src, t, amt = 3, o = {}) {
  const sh = o.strip ?? 6;
  const y0 = o.y0 ?? 0, y1 = o.y1 ?? H;
  for (let y = y0; y < y1; y += sh) {
    const k = (y - y0) / Math.max(1, y1 - y0);
    const dx = Math.sin(y * 0.045 + t * 7.3) * amt * (o.falloff ? lerp(1, 0.2, k) : 1) + Math.sin(y * 0.13 - t * 11) * amt * 0.4;
    ctx.drawImage(src, 0, y, W, sh, dx, y, W, sh);
  }
}

/** Rope with twist stripes along a polyline. */
export function rope(ctx, pts, o = {}) {
  const w = o.width ?? 8;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = o.shadow || 'rgba(20,8,4,0.35)'; ctx.lineWidth = w + 3;
  ctx.beginPath(); strokePts(ctx, pts.map(([x, y]) => [x + 3, y + 4])); ctx.stroke();
  ctx.strokeStyle = o.dark || '#7A2A18'; ctx.lineWidth = w + 1.5;
  ctx.beginPath(); strokePts(ctx, pts); ctx.stroke();
  ctx.strokeStyle = o.color || '#C8452A'; ctx.lineWidth = w;
  ctx.beginPath(); strokePts(ctx, pts); ctx.stroke();
  // twist stripes
  ctx.strokeStyle = o.stripe || 'rgba(255,225,170,0.55)'; ctx.lineWidth = Math.max(1, w * 0.28);
  const step = w * 1.6;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    for (let d = (step - acc % step) % step; d < L; d += step) {
      const x = a[0] + Math.cos(ang) * d, y = a[1] + Math.sin(ang) * d;
      ctx.beginPath();
      ctx.moveTo(x - nx * w * 0.45 - Math.cos(ang) * w * 0.3, y - ny * w * 0.45 - Math.sin(ang) * w * 0.3);
      ctx.lineTo(x + nx * w * 0.45 + Math.cos(ang) * w * 0.3, y + ny * w * 0.45 + Math.sin(ang) * w * 0.3);
      ctx.stroke();
    }
    acc += L;
  }
  ctx.strokeStyle = 'rgba(255,240,210,0.35)'; ctx.lineWidth = Math.max(1, w * 0.18);
  ctx.beginPath(); strokePts(ctx, pts.map(([x, y]) => [x - w * 0.2, y - w * 0.25])); ctx.stroke();
  ctx.restore();
}

/** Sandstone wall texture shortcut (cached). */
export const wallTex = (seed, ramp = ROCK.navajo, o = {}) => sandstone(1024, 1024, { seed, ramp, scale: o.scale ?? 1, strata: o.strata ?? 1.2, varnish: o.varnish ?? 0.7, crossbed: o.crossbed ?? 0.5, tilt: o.tilt ?? 0 });

// ── cel helpers (copied from the rig so the supporting cast matches its look) ──
export function cel(ctx, build, base, sh, light, off, o = {}) {
  ctx.save();
  ctx.beginPath(); build(ctx);
  ctx.fillStyle = base; ctx.fill();
  ctx.clip();
  ctx.save();
  ctx.translate(-light[0] * off, -light[1] * off);
  ctx.beginPath(); ctx.rect(-5000, -5000, 10000, 10000); build(ctx);
  ctx.restore();
  ctx.fillStyle = sh;
  ctx.fill('evenodd');
  ctx.restore();
  if (o.line) {
    ctx.save();
    ctx.beginPath(); build(ctx);
    ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 2; ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }
}
export function limbPath(ctx, ax, ay, bx, by, wa, wb, bulge = 0.12) {
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const wm = (wa + wb) / 2 * (1 + bulge);
  const ang = Math.atan2(dy, dx);
  ctx.moveTo(ax + nx * wa, ay + ny * wa);
  ctx.quadraticCurveTo(mx + nx * wm * 1.05, my + ny * wm * 1.05, bx + nx * wb, by + ny * wb);
  ctx.arc(bx, by, wb, ang + Math.PI / 2, ang - Math.PI / 2, true);
  ctx.quadraticCurveTo(mx - nx * wm, my - ny * wm, ax - nx * wa, ay - ny * wa);
  ctx.arc(ax, ay, wa, ang - Math.PI / 2, ang + Math.PI / 2, true);
  ctx.closePath();
}
export function chainPath(ctx, pts, widths, bulge = 0.14) {
  const P = [], Wd = [];
  for (let i = 0; i < pts.length; i++) {
    P.push(pts[i]); Wd.push(widths[i]);
    if (i < pts.length - 1) {
      P.push([(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]);
      Wd.push(((widths[i] + widths[i + 1]) / 2) * (1 + bulge * (i === 0 ? 1 : 0.6)));
    }
  }
  const n = P.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    L.push([P[i][0] - dy * Wd[i], P[i][1] + dx * Wd[i]]);
    R.push([P[i][0] + dy * Wd[i], P[i][1] - dx * Wd[i]]);
  }
  const angEnd = Math.atan2(P[n - 1][1] - P[n - 2][1], P[n - 1][0] - P[n - 2][0]);
  const angSt = Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0]);
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
  ctx.lineTo(L[n - 1][0], L[n - 1][1]);
  ctx.arc(P[n - 1][0], P[n - 1][1], Wd[n - 1], angEnd + Math.PI / 2, angEnd - Math.PI / 2, true);
  for (let i = n - 2; i > 0; i--) ctx.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + R[i - 1][0]) / 2, (R[i][1] + R[i - 1][1]) / 2);
  ctx.lineTo(R[0][0], R[0][1]);
  ctx.arc(P[0][0], P[0][1], Wd[0], angSt - Math.PI / 2, angSt + Math.PI / 2, true);
  ctx.closePath();
}
export function smoothClosed(ctx, pts) {
  const n = pts.length;
  ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  ctx.closePath();
}

/** Draw a canvas layer with an offset/scale about a pivot (camera helper for 2D sets). */
export function withCam(ctx, cam, fn) {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  if (cam.rot) ctx.rotate(cam.rot);
  ctx.scale(cam.zoom ?? 1, cam.zoom ?? 1);
  ctx.translate(-W / 2 - (cam.x || 0), -H / 2 - (cam.y || 0));
  fn(ctx);
  ctx.restore();
}

export { clamp, lerp, ease, seg, rng, noise, TAU, rgba, mixColor, hexToRgb, C, text, maskRise, measure, F };

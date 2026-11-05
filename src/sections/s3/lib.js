// ─────────────────────────────────────────────────────────────────────────────
// S3 shared library — drafting ("Van Dyke brownprint") primitives, rope, the cheap
// multi-tool, Aron bust, frost, breath, heat arrows, small helpers.
// Everything is a pure function of its inputs (deterministic).
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, ease, seg, noise, rng, TAU, mixColor, rgba, hexToRgb } from '../../core/util.js';
import { C, ROCK } from '../../core/palette.js';
import { text, maskRise, richLine, measure } from '../../core/text.js';
import { paper, sandstone, cached } from '../../core/textures.js';
import { drawHead, AARON_COLORS } from '../../core/aaron.js';
import { hourCounter } from '../../core/motifs.js';

export const W = 1920, H = 1080;

// ── palette for the drafting world (brownprint: bone on oxide — blue means HELP) ──
export const DR = {
  bg: '#24170F',
  bg2: '#2E1D13',
  line: '#E9DFCC',
  soft: 'rgba(233,223,204,0.62)',
  faint: 'rgba(233,223,204,0.16)',
  grid: 'rgba(233,223,204,0.055)',
  red: C.red,
  gold: C.gold,
  rope: '#C2652A', ropeDk: '#6A2E12', ropeHi: '#E89A5C', ropeFleck: '#EADFC8',
};

/** smoothstep-ish window: rises over [a,a+fi], falls over [b-fo,b]. */
export function win(t, a, b, fi = 0.4, fo = 0.3) {
  return Math.min(ease.outCubic(clamp((t - a) / fi)), 1 - ease.inQuart(clamp((t - (b - fo)) / fo)));
}

// ── brownprint sheet (cached) ────────────────────────────────────────────────
export function brownprint(seed = 3, o = {}) {
  return cached(`s3-bp:${seed}:${o.border ?? 1}`, () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(paper(W, H, { base: '#2A1B12', seed: seed + 40, fibre: 0.5, mottling: 1.6 }), 0, 0);
    // tonal unevenness of the print (darker edges, warm centre)
    const rg = g.createRadialGradient(W * 0.52, H * 0.46, 120, W / 2, H / 2, 1150);
    rg.addColorStop(0, 'rgba(70,40,24,0.35)'); rg.addColorStop(1, 'rgba(8,4,2,0.55)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    // grid
    g.lineWidth = 1;
    for (let x = 0; x <= W; x += 24) { g.strokeStyle = x % 120 === 0 ? 'rgba(233,223,204,0.085)' : 'rgba(233,223,204,0.04)'; g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
    for (let y = 0; y <= H; y += 24) { g.strokeStyle = y % 120 === 0 ? 'rgba(233,223,204,0.085)' : 'rgba(233,223,204,0.04)'; g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
    if (o.border !== 0) {
      g.strokeStyle = 'rgba(233,223,204,0.55)'; g.lineWidth = 2.5;
      g.strokeRect(56, 46, W - 112, H - 92);
      g.strokeStyle = 'rgba(233,223,204,0.3)'; g.lineWidth = 1;
      g.strokeRect(68, 58, W - 136, H - 116);
      // zone ticks along the border
      g.fillStyle = 'rgba(233,223,204,0.45)';
      g.font = '600 11px "Martian Mono"';
      for (let k = 0; k < 8; k++) {
        const x = 68 + (k + 0.5) * (W - 136) / 8;
        g.fillText(String.fromCharCode(65 + k), x - 4, 55);
        g.beginPath(); g.moveTo(68 + k * (W - 136) / 8, 46); g.lineTo(68 + k * (W - 136) / 8, 58); g.strokeStyle = 'rgba(233,223,204,0.4)'; g.stroke();
      }
      for (let k = 0; k < 4; k++) { const y = 58 + (k + 0.5) * (H - 116) / 4; g.fillText(String(k + 1), 59 - 2, y + 4); }
    }
    // a few drafting smudges / eraser marks
    const r = rng(seed + 7);
    for (let k = 0; k < 7; k++) {
      const x = r() * W, y = r() * H, rr = 40 + r() * 120;
      const sg = g.createRadialGradient(x, y, 0, x, y, rr);
      sg.addColorStop(0, `rgba(233,223,204,${0.015 + r() * 0.02})`); sg.addColorStop(1, 'rgba(233,223,204,0)');
      g.fillStyle = sg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    return c;
  });
}

/** Warm "desk lamp" pool + slight paper breathing over a sheet (call after drawing). */
export function lampPool(ctx, t, x = 980, y = 460, o = {}) {
  const px = x + Math.sin(t * 0.21) * 60, py = y + Math.cos(t * 0.17) * 40;
  const g = ctx.createRadialGradient(px, py, 40, px, py, o.r ?? 1000);
  g.addColorStop(0, `rgba(255,214,160,${o.a ?? 0.07})`);
  g.addColorStop(1, 'rgba(255,214,160,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── polylines with progressive draw ─────────────────────────────────────────
export function polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
/** Build the path of the first p (0..1) of a polyline into ctx (no stroke). Returns end point. */
export function polyPath(ctx, pts, p = 1, closed = false) {
  const P = closed ? pts.concat([pts[0]]) : pts;
  if (P.length < 2) return null;
  const L = polyLen(P);
  let rem = clamp(p) * L;
  ctx.moveTo(P[0][0], P[0][1]);
  let end = P[0];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (rem >= l) { ctx.lineTo(b[0], b[1]); rem -= l; end = b; }
    else { const k = l ? rem / l : 0; end = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; ctx.lineTo(end[0], end[1]); break; }
  }
  return end;
}
/** Ink line: progressive polyline stroke. o: color, width, dash, closed, alpha, cap, pen (draw a nib dot) */
export function ink(ctx, pts, p = 1, o = {}) {
  if (p <= 0) return;
  ctx.save();
  ctx.strokeStyle = o.color || DR.line;
  ctx.lineWidth = o.width ?? 2;
  ctx.lineJoin = 'round'; ctx.lineCap = o.cap || 'round';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath();
  const end = polyPath(ctx, pts, p, o.closed);
  ctx.stroke();
  if (o.pen && end && p < 1) {
    ctx.setLineDash([]);
    ctx.fillStyle = o.color || DR.line;
    ctx.beginPath(); ctx.arc(end[0], end[1], (o.width ?? 2) * 1.3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
export const PHANTOM = [26, 7, 5, 7, 5, 7];
export const HIDDEN = [10, 7];
export const CENTER = [30, 6, 6, 6];

/** Dense outline points replicating textures.rockPath (same noise) — for drafting the chockstone. */
export function rockPts(cx, cy, rx, ry, o = {}) {
  const n = o.points || 22, seed = o.seed || 1, rough = o.rough ?? 0.18, flat = o.flatBottom ?? 0;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (o.rot || 0);
    const k = 1 + noise.fbm2(Math.cos(a) * 1.3 + seed * 3.7, Math.sin(a) * 1.3 + seed, 3) * rough * 2.2 + noise.n2(i * 0.9 + seed * 11, seed) * rough * 0.35;
    const x = cx + Math.cos(a) * rx * k;
    let y = cy + Math.sin(a) * ry * k;
    if (flat > 0 && y > cy) y = lerp(y, cy + ry * 0.78, flat * clamp((y - cy) / ry));
    pts.push([x, y]);
  }
  const out = [];
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  for (let i = 0; i < n; i++) {
    const p0 = mid(pts[(i - 1 + n) % n], pts[i]), c = pts[i], p1 = mid(pts[i], pts[(i + 1) % n]);
    for (let s = 0; s < 6; s++) {
      const u = s / 6;
      out.push([(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1]]);
    }
  }
  return out;
}
/** Canonical chockstone outline (size = drawChockstone size) in local coords around (cx,cy), rotated. */
export function chockPts(cx, cy, size, rot = 0) {
  const pts = rockPts(0, 0, size * 0.62, size * 0.46, { seed: 127, rough: 0.12, points: 26, flatBottom: 0.25 });
  const c = Math.cos(rot), s = Math.sin(rot);
  return pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

/** Parallel hatch inside a clip path. o: angle, gap, color, width, p (reveal 0..1 sweeping), bbox [x,y,w,h] */
export function hatch(ctx, buildPath, o = {}) {
  const [bx, by, bw, bh] = o.bbox || [0, 0, W, H];
  const ang = o.angle ?? -Math.PI / 4, gap = o.gap ?? 14;
  const p = o.p ?? 1;
  if (p <= 0) return;
  ctx.save();
  ctx.beginPath(); buildPath(ctx); ctx.clip();
  ctx.strokeStyle = o.color || DR.soft;
  ctx.lineWidth = o.width ?? 1.2;
  if (o.dash) ctx.setLineDash(o.dash);
  const cx = bx + bw / 2, cy = by + bh / 2, R = Math.hypot(bw, bh) / 2 + 4;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const n = Math.ceil((2 * R) / gap);
  const shown = Math.floor(n * clamp(p));
  ctx.beginPath();
  for (let i = 0; i < shown; i++) {
    const d = -R + i * gap;
    const px = cx - sa * d, py = cy + ca * d;
    ctx.moveTo(px - ca * R, py - sa * R); ctx.lineTo(px + ca * R, py + sa * R);
  }
  ctx.stroke();
  ctx.restore();
}

/** Dimension line between a and b, offset along the normal by `off`. label in mono. */
export function dim(ctx, a, b, label, p = 1, o = {}) {
  if (p <= 0) return;
  const col = o.color || DR.line;
  const off = o.off ?? 40;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const A = [a[0] + nx * off, a[1] + ny * off], B = [b[0] + nx * off, b[1] + ny * off];
  const e = ease.outCubic(clamp(p * 1.4));
  ctx.save();
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = o.width ?? 1.4;
  ctx.globalAlpha *= o.alpha ?? 1;
  // extension lines
  ctx.globalAlpha *= 0.7;
  ctx.beginPath();
  ctx.moveTo(a[0] + nx * 8, a[1] + ny * 8); ctx.lineTo(a[0] + nx * (off + 12) * e, a[1] + ny * (off + 12) * e);
  ctx.moveTo(b[0] + nx * 8, b[1] + ny * 8); ctx.lineTo(b[0] + nx * (off + 12) * e, b[1] + ny * (off + 12) * e);
  ctx.stroke();
  ctx.globalAlpha /= 0.7;
  const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const q = ease.inOutCubic(clamp(p * 1.25 - 0.1));
  const A2 = [lerp(mid[0], A[0], q), lerp(mid[1], A[1], q)], B2 = [lerp(mid[0], B[0], q), lerp(mid[1], B[1], q)];
  ctx.beginPath(); ctx.moveTo(A2[0], A2[1]); ctx.lineTo(B2[0], B2[1]); ctx.stroke();
  // architectural ticks
  if (q > 0.98) {
    const tk = 9;
    ctx.lineWidth = (o.width ?? 1.4) * 1.6;
    ctx.beginPath();
    for (const P of [A, B]) { ctx.moveTo(P[0] - (dx / L + nx) * tk * 0.7, P[1] - (dy / L + ny) * tk * 0.7); ctx.lineTo(P[0] + (dx / L + nx) * tk * 0.7, P[1] + (dy / L + ny) * tk * 0.7); }
    ctx.stroke();
  }
  if (label) {
    const lp = clamp(p * 2 - 1);
    if (lp > 0) {
      ctx.save();
      ctx.translate(mid[0] + nx * (o.labelOff ?? 22), mid[1] + ny * (o.labelOff ?? 22));
      let ang = Math.atan2(dy, dx); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      ctx.rotate(ang);
      maskRise(ctx, label, 0, (o.size ?? 26) * 0.36, lp, { family: o.family || 'mono', size: o.size ?? 26, weight: o.weight ?? 600, color: col, align: 'center', tracking: 0.12 });
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Leader callout: dot at (x,y) → elbow → label. */
export function leader(ctx, x, y, ex, ey, label, p = 1, o = {}) {
  if (p <= 0) return;
  const col = o.color || DR.line;
  const e = ease.outCubic(clamp(p * 1.5));
  const side = ex >= x ? 1 : -1;
  const shelf = o.shelf ?? 70;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = o.width ?? 1.5;
  ctx.beginPath(); ctx.arc(x, y, 4.5 * e, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 9 * e, 0, TAU); ctx.globalAlpha *= 0.5; ctx.stroke(); ctx.globalAlpha /= 0.5;
  const mx = lerp(x, ex, e), my = lerp(y, ey, e);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(mx, my);
  const sp = clamp(p * 2.2 - 1);
  if (sp > 0) ctx.lineTo(ex + side * shelf * ease.outCubic(sp), ey);
  ctx.stroke();
  const lp = clamp(p * 2 - 0.9);
  if (lp > 0 && label) {
    maskRise(ctx, label, ex + side * (shelf + 14), ey + (o.size ?? 26) * 0.36, lp, { family: o.family || 'mono', size: o.size ?? 26, weight: o.weight ?? 600, color: col, align: side > 0 ? 'left' : 'right', tracking: 0.14 });
    if (o.sub) text(ctx, o.sub, ex + side * (shelf + 14), ey + (o.size ?? 26) * 0.36 + 40, { family: 'serif', italic: true, size: (o.size ?? 26) * 1.35, color: col, alpha: ease.outCubic(lp) * 0.8, align: side > 0 ? 'left' : 'right' });
  }
  ctx.restore();
}

/** Editorial plan title: italic "Plan" + huge letter + mono subtitle; optional red strike. */
export function planTitle(ctx, x, y, letter, sub, p = 1, strike = 0, o = {}) {
  if (p <= 0) return;
  const col = o.color || DR.line;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  const r = richLine(ctx, [
    { t: 'Plan', family: 'title', italic: true, weight: 300, size: 92, color: col },
    { t: letter, family: 'display', weight: 900, size: 156, color: col },
  ], x, y, { p, stagger: 0.35, gap: 18 });
  const sp = clamp((p - 0.35) / 0.65);
  if (sub && sp > 0) {
    ctx.strokeStyle = o.accent || DR.red; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.lineTo(x + 70 * ease.outExpo(sp), y + 30); ctx.stroke();
    maskRise(ctx, sub, x + 86, y + 44, sp, { family: 'mono', size: 34, weight: 600, color: col, tracking: 0.28 });
  }
  if (strike > 0) {
    const w = Math.max(r.width, sub ? 86 + measure(ctx, sub, { family: 'mono', size: 34, weight: 600, tracking: 0.28 }) : 0) + 40;
    const e = ease.inOutCubic(clamp(strike));
    ctx.strokeStyle = DR.red; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 20, y - 34); ctx.lineTo(x - 20 + w * e, y - 34 - w * 0.035 * e); ctx.stroke();
    if (e > 0.98) { ctx.fillStyle = DR.red; ctx.beginPath(); ctx.arc(x - 20 + w, y - 34 - w * 0.035, 5.5, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  return r;
}

/** Engineering title block (decorative small mono, drawn on). rows: [[label, value], ...] */
export function titleBlock(ctx, x, y, w, h, rows, p = 1, o = {}) {
  if (p <= 0) return;
  const col = o.color || DR.line;
  ctx.save();
  ctx.strokeStyle = col; ctx.lineWidth = 1.6;
  const box = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  ink(ctx, box, ease.inOutCubic(clamp(p * 1.6)), { closed: true, width: 1.8, color: col });
  const rh = h / rows.length;
  rows.forEach((r, i) => {
    const pi = clamp(p * 1.6 - 0.4 - i * 0.12);
    if (pi <= 0) return;
    ctx.globalAlpha = 0.6 * pi;
    if (i > 0) { ctx.beginPath(); ctx.moveTo(x, y + i * rh); ctx.lineTo(x + w * ease.outCubic(pi), y + i * rh); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x + w * 0.34, y + i * rh); ctx.lineTo(x + w * 0.34, y + (i + 1) * rh); ctx.stroke();
    ctx.globalAlpha = 1;
    text(ctx, r[0], x + 10, y + i * rh + rh * 0.62, { family: 'mono', size: 11, weight: 400, color: col, alpha: 0.6 * pi, tracking: 0.2 });
    text(ctx, r[1], x + w * 0.34 + 12, y + i * rh + rh * 0.66, { family: 'mono', size: r[2] || 15, weight: 600, color: col, alpha: pi, tracking: 0.12 });
  });
  ctx.restore();
}

/** Arrow (force vector). o: color, width, head */
export function arrow(ctx, x0, y0, x1, y1, o = {}) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 2) return;
  const a = Math.atan2(y1 - y0, x1 - x0);
  const hw = o.head ?? Math.min(26, L * 0.4);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = o.color || DR.line; ctx.fillStyle = o.color || DR.line;
  ctx.lineWidth = o.width ?? 4; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hw * 0.8, y1 - Math.sin(a) * hw * 0.8); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.38) * hw, y1 - Math.sin(a - 0.38) * hw);
  ctx.lineTo(x1 - Math.cos(a) * hw * 0.72, y1 - Math.sin(a) * hw * 0.72);
  ctx.lineTo(x1 - Math.cos(a + 0.38) * hw, y1 - Math.sin(a + 0.38) * hw);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Hand-drawn capital sigma glyph (fonts may lack Greek). */
export function sigma(ctx, x, y, h, o = {}) {
  const w = h * 0.72;
  ctx.save();
  ctx.strokeStyle = o.color || DR.line; ctx.lineWidth = o.width ?? h * 0.12; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(x + w, y - h + h * 0.08); ctx.lineTo(x + w, y - h); ctx.lineTo(x + w * 0.06, y - h);
  ctx.lineTo(x + w * 0.52, y - h / 2); ctx.lineTo(x + w * 0.06, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y - h * 0.08);
  ctx.stroke();
  ctx.restore();
  return w;
}

// ── rope (burnt-orange kernmantle) ───────────────────────────────────────────
/** Resample a polyline to roughly `step` px spacing. */
export function resample(pts, step = 6) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = step - carry;
    while (d <= l) { out.push([lerp(a[0], b[0], d / l), lerp(a[1], b[1], d / l)]); d += step; }
    carry = l - (d - step);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** Draw rope along pts. o: width, light [x,y] (travel dir), shadow, phase (braid slide), stretch, colors */
export function rope2D(ctx, pts, o = {}) {
  const w = o.width ?? 18;
  const base = o.color || DR.rope, dk = o.dark || DR.ropeDk, hi = o.hi || DR.ropeHi;
  const P = resample(pts, Math.max(2, w * 0.18));
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = o.cap || 'round';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const stroke = (col, lw, ox = 0, oy = 0) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(P[0][0] + ox, P[0][1] + oy);
    for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0] + ox, P[i][1] + oy);
    ctx.stroke();
  };
  if (o.shadow !== false) { ctx.save(); ctx.filter = `blur(${Math.max(1, w * 0.35).toFixed(1)}px)`; stroke('rgba(12,5,2,0.45)', w * 1.05, w * 0.35, w * 0.55); ctx.restore(); }
  stroke(o.line || 'rgba(30,12,5,0.95)', w + Math.max(1.5, w * 0.12));
  stroke(base, w);
  stroke(dk, w * 0.42, 0, w * 0.22);
  stroke(hi, w * 0.22, 0, -w * 0.2);
  // braid: chevrons along the sheath
  const step = w * (o.stretch ?? 1) * 0.62;
  let acc = (o.phase || 0) * step;
  const flecks = rng(o.seed ?? 5);
  ctx.lineWidth = Math.max(1, w * 0.1);
  ctx.lineCap = 'round';
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    acc += l;
    if (acc < step) continue;
    acc -= step;
    const tx = (b[0] - a[0]) / (l || 1), ty = (b[1] - a[1]) / (l || 1);
    const nx = -ty, ny = tx;
    const k = Math.floor(i * 7.13) % 3;
    ctx.strokeStyle = k === 0 ? 'rgba(234,223,200,0.75)' : 'rgba(60,24,8,0.6)';
    const r = w * 0.48;
    ctx.beginPath();
    ctx.moveTo(b[0] + nx * r - tx * r * 0.55, b[1] + ny * r - ty * r * 0.55);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(b[0] - nx * r - tx * r * 0.55, b[1] - ny * r - ty * r * 0.55);
    ctx.stroke();
    if (flecks() < 0.25) { ctx.fillStyle = DR.ropeFleck; ctx.beginPath(); ctx.arc(b[0] + nx * r * 0.3, b[1] + ny * r * 0.3, w * 0.06, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

// ── the cheap multi-tool ─────────────────────────────────────────────────────
// Local units: total length ≈ 1000 (blade tip at x=-500, lanyard ring at x=+515), y down.
export const TOOL = (() => {
  const blade = [[-112, -36], [-395, -36], [-430, -33], [-468, -24], [-500, -6], [-488, 6], [-462, 18], [-420, 30], [-340, 38], [-180, 40], [-128, 40], [-112, 30]];
  const handle = [[-150, -58], [470, -58], [492, -50], [500, -30], [500, 30], [492, 50], [470, 58], [-150, 58], [-178, 40], [-186, 0], [-178, -40]];
  const scale = [[-70, -40], [430, -40], [446, -30], [446, 30], [430, 40], [-70, 40], [-82, 28], [-82, -28]];
  const grind = [[-140, 6], [-410, 6], [-470, 12]];
  return { blade, handle, scale, grind, pivot: [-120, 0], rivets: [[-120, 0], [190, 0], [400, 0]] };
})();
const tf = (pts, x, y, s, rot) => {
  const c = Math.cos(rot), sn = Math.sin(rot);
  return pts.map(([px, py]) => [x + (px * c - py * sn) * s, y + (px * sn + py * c) * s]);
};
export const toolPts = tf;
function pathOf(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }

/** Bend blade points beyond x < hingeX by angle (rad) around the hinge (local units). */
export function bendBlade(pts, hingeX, angle) {
  if (!angle) return pts;
  return pts.map(([x, y]) => {
    if (x >= hingeX) return [x, y];
    const k = clamp((hingeX - x) / 140);
    const a = angle * k;
    const dx = x - hingeX, dy = y;
    return [hingeX + dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
  });
}

/** Photographic-ish multi-tool. o: light (0..1 warm top light), bend, showHandle, ground shadow */
export function toolReal(ctx, x, y, s, rot, o = {}) {
  const blade = tf(bendBlade(TOOL.blade, o.hinge ?? -300, o.bend || 0), x, y, s, rot);
  const handle = tf(TOOL.handle, x, y, s, rot);
  const scale = tf(TOOL.scale, x, y, s, rot);
  ctx.save();
  // cast shadow on the ground (warm top light → shadow falls slightly down)
  if (o.shadow !== false) {
    ctx.save();
    ctx.filter = `blur(${(14 * s).toFixed(1)}px)`;
    ctx.fillStyle = 'rgba(6,8,12,0.55)';
    ctx.translate(10 * s, 26 * s);
    ctx.beginPath(); pathOf(ctx, blade); ctx.fill();
    if (o.showHandle !== false) { ctx.beginPath(); pathOf(ctx, handle); ctx.fill(); }
    ctx.restore();
  }
  // blade: satin steel with a flat grind
  const nrm = [-Math.sin(rot), Math.cos(rot)];
  const bg = ctx.createLinearGradient(x - nrm[0] * 40 * s, y - nrm[1] * 40 * s, x + nrm[0] * 40 * s, y + nrm[1] * 40 * s);
  bg.addColorStop(0, '#E6E1D8'); bg.addColorStop(0.18, '#B9B5AE'); bg.addColorStop(0.5, '#8E8C88'); bg.addColorStop(0.56, '#C9C6C0'); bg.addColorStop(1, '#6E6C69');
  ctx.beginPath(); pathOf(ctx, blade);
  ctx.fillStyle = bg; ctx.fill();
  ctx.save(); ctx.clip();
  // brushed streaks
  const r = rng(11);
  ctx.globalAlpha = 0.18; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  for (let k = 0; k < 40; k++) {
    const yy = -36 + r() * 76, x0 = -500 + r() * 300, x1 = x0 + 60 + r() * 200;
    const a = tf([[x0, yy], [x1, yy]], x, y, s, rot);
    ctx.beginPath(); ctx.moveTo(a[0][0], a[0][1]); ctx.lineTo(a[1][0], a[1][1]); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // rust freckles (cheap steel)
  for (let k = 0; k < 9; k++) {
    const p = tf([[-150 - r() * 300, -20 + r() * 50]], x, y, s, rot)[0];
    ctx.fillStyle = `rgba(140,70,30,${0.15 + r() * 0.2})`;
    ctx.beginPath(); ctx.arc(p[0], p[1], (2 + r() * 4) * s, 0, TAU); ctx.fill();
  }
  // grind line + edge bevel
  const gpts = tf(bendBlade(TOOL.grind, o.hinge ?? -300, o.bend || 0), x, y, s, rot);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.moveTo(gpts[0][0], gpts[0][1]); gpts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.stroke();
  // nail nick + stamp
  const nk = tf([[-170, -16]], x, y, s, rot)[0];
  ctx.fillStyle = 'rgba(40,40,40,0.45)'; ctx.beginPath(); ctx.ellipse(nk[0], nk[1], 22 * s, 4 * s, rot, 0, TAU); ctx.fill();
  ctx.save();
  const st = tf([[-300, -12]], x, y, s, rot)[0];
  ctx.translate(st[0], st[1]); ctx.rotate(rot);
  ctx.font = `600 ${(10 * s).toFixed(1)}px "Martian Mono"`; ctx.fillStyle = 'rgba(50,48,46,0.55)';
  ctx.fillText('STAINLESS · CHINA', 0, 0);
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(30,28,26,0.9)'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); pathOf(ctx, blade); ctx.stroke();
  if (o.showHandle !== false) {
    // handle: stamped steel frame
    const hg = ctx.createLinearGradient(x - nrm[0] * 60 * s, y - nrm[1] * 60 * s, x + nrm[0] * 60 * s, y + nrm[1] * 60 * s);
    hg.addColorStop(0, '#D8D4CC'); hg.addColorStop(0.25, '#9A9893'); hg.addColorStop(0.7, '#6A6966'); hg.addColorStop(1, '#3E3D3B');
    ctx.beginPath(); pathOf(ctx, handle); ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = 'rgba(25,24,22,0.95)'; ctx.lineWidth = 1.8 * s; ctx.stroke();
    // nested tools peeking from the top edge
    ctx.save(); ctx.beginPath(); pathOf(ctx, tf([[-150, -70], [470, -70], [470, -54], [-150, -54]], x, y, s, rot)); ctx.clip();
    ctx.restore();
    // black textured plastic scale
    ctx.beginPath(); pathOf(ctx, scale);
    const sg = ctx.createLinearGradient(x - nrm[0] * 40 * s, y - nrm[1] * 40 * s, x + nrm[0] * 40 * s, y + nrm[1] * 40 * s);
    sg.addColorStop(0, '#4A4743'); sg.addColorStop(0.3, '#2A2826'); sg.addColorStop(1, '#141312');
    ctx.fillStyle = sg; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 3 * s;
    for (let k = 0; k < 26; k++) { const q = tf([[-50 + k * 19, -40], [-50 + k * 19, 40]], x, y, s, rot); ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5 * s; ctx.stroke();
    // rivets
    for (const rv of TOOL.rivets) {
      const p = tf([rv], x, y, s, rot)[0];
      const rg = ctx.createRadialGradient(p[0] - 4 * s, p[1] - 5 * s, 1, p[0], p[1], 15 * s);
      rg.addColorStop(0, '#F2EEE6'); rg.addColorStop(0.5, '#9C9994'); rg.addColorStop(1, '#3C3B39');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p[0], p[1], 14 * s, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.2 * s; ctx.stroke();
    }
    // lanyard ring
    const lr = tf([[512, 0]], x, y, s, rot)[0];
    ctx.strokeStyle = '#8E8B86'; ctx.lineWidth = 6 * s;
    ctx.beginPath(); ctx.arc(lr[0], lr[1], 17 * s, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.arc(lr[0], lr[1], 17 * s, -2.6, -1.2); ctx.stroke();
  }
  // warm top light: soft specular along the top edges
  if ((o.light ?? 1) > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.5 * (o.light ?? 1);
    ctx.strokeStyle = 'rgba(255,214,160,0.9)'; ctx.lineWidth = 3 * s; ctx.filter = `blur(${(2 * s).toFixed(1)}px)`;
    const top = tf([[-112, -34], [-395, -34], [-430, -31]], x, y, s, rot);
    ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); top.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.stroke();
    if (o.showHandle !== false) { const ht = tf([[-140, -55], [468, -55]], x, y, s, rot); ctx.beginPath(); ctx.moveTo(ht[0][0], ht[0][1]); ctx.lineTo(ht[1][0], ht[1][1]); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}

/** Brownprint drawing of the multi-tool (progressive). */
export function toolDraft(ctx, x, y, s, rot, p = 1, o = {}) {
  const col = o.color || DR.line;
  const blade = tf(TOOL.blade, x, y, s, rot), handle = tf(TOOL.handle, x, y, s, rot), scale = tf(TOOL.scale, x, y, s, rot);
  const lw = (o.width ?? 2.2);
  ink(ctx, handle, seg(p, 0, 0.5, ease.inOutCubic), { closed: true, width: lw, color: col });
  ink(ctx, blade, seg(p, 0.1, 0.6, ease.inOutCubic), { closed: true, width: lw, color: col });
  ink(ctx, scale, seg(p, 0.3, 0.75), { closed: true, width: lw * 0.6, color: col, alpha: 0.7 });
  ink(ctx, tf(TOOL.grind, x, y, s, rot), seg(p, 0.45, 0.8), { width: lw * 0.6, color: col, alpha: 0.7 });
  const hp = seg(p, 0.55, 1);
  if (hp > 0) {
    hatch(ctx, (g) => pathOf(g, scale), { angle: rot - Math.PI / 4, gap: 11 * s, color: rgba(DR.line, 0.28), width: 1, p: hp, bbox: [x - 520 * s, y - 520 * s, 1040 * s, 1040 * s] });
    ctx.save(); ctx.globalAlpha *= hp; ctx.strokeStyle = col; ctx.lineWidth = lw * 0.6;
    for (const rv of TOOL.rivets) { const c = tf([rv], x, y, s, rot)[0]; ctx.beginPath(); ctx.arc(c[0], c[1], 14 * s, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(c[0] - 22 * s, c[1]); ctx.lineTo(c[0] + 22 * s, c[1]); ctx.moveTo(c[0], c[1] - 22 * s); ctx.lineTo(c[0], c[1] + 22 * s); ctx.globalAlpha *= 0.6; ctx.stroke(); ctx.globalAlpha /= 0.6; }
    const lr = tf([[512, 0]], x, y, s, rot)[0];
    ctx.beginPath(); ctx.arc(lr[0], lr[1], 17 * s, 0, TAU); ctx.stroke();
    ctx.restore();
    // centre line
    ink(ctx, tf([[-530, 0], [545, 0]], x, y, s, rot), hp, { width: 1, color: col, alpha: 0.45, dash: CENTER, cap: 'butt' });
  }
}

// ── organic limb (skin) for macro shots ──────────────────────────────────────
export function limbShape(ctx, ax, ay, bx, by, wa, wb, bulge = 0.12) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const wm = ((wa + wb) / 2) * (1 + bulge);
  const ang = Math.atan2(dy, dx);
  ctx.moveTo(ax + nx * wa, ay + ny * wa);
  ctx.quadraticCurveTo(mx + nx * wm * 1.05, my + ny * wm * 1.05, bx + nx * wb, by + ny * wb);
  ctx.arc(bx, by, wb, ang + Math.PI / 2, ang - Math.PI / 2, true);
  ctx.quadraticCurveTo(mx - nx * wm, my - ny * wm, ax - nx * wa, ay - ny * wa);
  ctx.arc(ax, ay, wa, ang - Math.PI / 2, ang + Math.PI / 2, true);
  ctx.closePath();
}
/** Cel-shaded skin limb with dust + rim. light = travel direction of light. */
export function skinLimb(ctx, ax, ay, bx, by, wa, wb, o = {}) {
  const COL = AARON_COLORS;
  const L = o.light || [0.6, 0.8];
  const build = (g) => limbShape(g, ax, ay, bx, by, wa, wb, o.bulge ?? 0.12);
  ctx.save();
  ctx.beginPath(); build(ctx);
  ctx.fillStyle = o.skin || COL.skin; ctx.fill();
  ctx.save(); ctx.clip();
  const off = (wa + wb) * 0.28;
  ctx.translate(-L[0] * off, -L[1] * off);
  ctx.beginPath(); ctx.rect(-5000, -5000, 10000, 10000); build(ctx);
  ctx.translate(L[0] * off, L[1] * off);
  ctx.fillStyle = o.skinSh || COL.skinSh; ctx.fill('evenodd');
  // dust / grime
  if (o.dirt) {
    const r = rng(o.seed ?? 3);
    for (let k = 0; k < 18; k++) {
      const u = r(), v = r() - 0.5;
      const px = lerp(ax, bx, u) + (-(by - ay)) / Math.hypot(bx - ax, by - ay) * v * wa * 1.6;
      const py = lerp(ay, by, u) + ((bx - ax)) / Math.hypot(bx - ax, by - ay) * v * wa * 1.6;
      const rr = wa * (0.2 + r() * 0.5);
      const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, `rgba(120,60,30,${0.35 * o.dirt})`); g.addColorStop(1, 'rgba(120,60,30,0)');
      ctx.fillStyle = g; ctx.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    }
  }
  if (o.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.tint; ctx.fillRect(-5000, -5000, 10000, 10000); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  ctx.strokeStyle = o.line || COL.line; ctx.lineWidth = o.lw ?? 3; ctx.lineJoin = 'round';
  ctx.beginPath(); build(ctx); ctx.stroke();
  if (o.rim) {
    ctx.save(); ctx.beginPath(); build(ctx); ctx.clip();
    ctx.translate(L[0] * off * 0.4, L[1] * off * 0.4);
    ctx.strokeStyle = o.rim; ctx.lineWidth = off * 0.5; ctx.filter = 'blur(2px)';
    ctx.beginPath(); build(ctx); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ── Aron bust (shoulders + canonical head) ───────────────────────────────────
/**
 * x,y = head centre; size = head height (px). o: yaw, nod, tilt, expr, beard, dirt, tired, light, rim,
 * shirt tint (multiply colour for night / shade), lean (shoulder roll), pack (straps + blue tube)
 */
export function bust(ctx, x, y, size, o = {}) {
  const COL = AARON_COLORS;
  const s = size;
  const yaw = o.yaw ?? 0.3;
  const L = o.light || [0.6, 0.8];
  const sx = x - yaw * s * 0.12, sy = y + s * 0.62;
  ctx.save();
  // torso / shoulders (mustard tee)
  const torso = (g) => {
    g.moveTo(sx - s * 1.05, sy + s * 1.6);
    g.bezierCurveTo(sx - s * 1.08, sy + s * 0.75, sx - s * 0.98, sy + s * 0.38, sx - s * 0.62, sy + s * 0.22);
    g.quadraticCurveTo(sx - s * 0.25, sy + s * 0.08, sx, sy + s * 0.1);
    g.quadraticCurveTo(sx + s * 0.25, sy + s * 0.08, sx + s * 0.62, sy + s * 0.22);
    g.bezierCurveTo(sx + s * 0.98, sy + s * 0.38, sx + s * 1.08, sy + s * 0.75, sx + s * 1.05, sy + s * 1.6);
    g.closePath();
  };
  ctx.beginPath(); torso(ctx); ctx.fillStyle = COL.shirt; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.translate(-L[0] * s * 0.16, -L[1] * s * 0.12);
  ctx.beginPath(); ctx.rect(-9000, -9000, 18000, 18000); torso(ctx);
  ctx.translate(L[0] * s * 0.16, L[1] * s * 0.12);
  ctx.fillStyle = COL.shirtSh; ctx.fill('evenodd');
  // fold lines
  ctx.strokeStyle = COL.shirtSh; ctx.lineWidth = s * 0.012; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx - s * 0.5, sy + s * 0.5); ctx.quadraticCurveTo(sx - s * 0.36, sy + s * 0.7, sx - s * 0.42, sy + s * 0.95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx + s * 0.55, sy + s * 0.45); ctx.quadraticCurveTo(sx + s * 0.62, sy + s * 0.7, sx + s * 0.5, sy + s * 0.9); ctx.stroke();
  if (o.pack !== false) {
    ctx.strokeStyle = COL.packSh; ctx.lineWidth = s * 0.075; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(sx - s * 0.5, sy + s * 0.12); ctx.quadraticCurveTo(sx - s * 0.56, sy + s * 0.7, sx - s * 0.62, sy + s * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + s * 0.5, sy + s * 0.12); ctx.quadraticCurveTo(sx + s * 0.56, sy + s * 0.7, sx + s * 0.62, sy + s * 1.6); ctx.stroke();
    ctx.strokeStyle = COL.tube; ctx.lineWidth = s * 0.03; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx + s * 0.47, sy + s * 0.1); ctx.quadraticCurveTo(sx + s * 0.3, sy + s * 0.55, sx + s * 0.18, sy + s * 0.5); ctx.stroke();
  }
  if (o.dirt) {
    const r = rng(41);
    for (let k = 0; k < 12; k++) {
      const px = sx + (r() - 0.5) * s * 1.8, py = sy + s * (0.3 + r() * 1.2), rr = s * (0.06 + r() * 0.12);
      const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, `rgba(110,60,25,${0.3 * o.dirt})`); g.addColorStop(1, 'rgba(110,60,25,0)');
      ctx.fillStyle = g; ctx.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    }
  }
  if (o.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.tint; ctx.fillRect(-9000, -9000, 18000, 18000); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  ctx.strokeStyle = COL.line; ctx.lineWidth = Math.max(2, s * 0.011); ctx.lineJoin = 'round';
  ctx.beginPath(); torso(ctx); ctx.stroke();
  // collar
  ctx.strokeStyle = COL.shirtSh; ctx.lineWidth = s * 0.03;
  ctx.beginPath(); ctx.moveTo(sx - s * 0.2, sy + s * 0.1); ctx.quadraticCurveTo(sx, sy + s * 0.3, sx + s * 0.2, sy + s * 0.1); ctx.stroke();
  // neck
  const nb = [sx, sy + s * 0.14], nt = [x - yaw * s * 0.04, y + s * 0.22];
  ctx.beginPath(); limbShape(ctx, nb[0], nb[1], nt[0], nt[1], s * 0.15, s * 0.14, 0);
  ctx.fillStyle = o.tint ? mixColor(COL.skin, '#5a6a7a', 0.25) : COL.skin; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(120,50,30,0.35)'; ctx.fillRect(nb[0] - s, nt[1] + s * 0.04, s * 2, s * 0.12); ctx.restore();
  ctx.strokeStyle = COL.line; ctx.lineWidth = Math.max(2, s * 0.011); ctx.stroke();
  drawHead(ctx, x, y, s, { yaw, nod: o.nod || 0, tilt: o.tilt || 0, expr: o.expr, beard: o.beard ?? 0.05, dirt: o.dirt ?? 0, sunburn: o.sunburn ?? 0.5, light: L, rim: o.rim, tired: o.tired ?? 0, sweat: o.sweat });
  if (o.tint) {
    // grade the head to the scene light (shade / night) without touching the line weight
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = o.tint;
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.62, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ── frost crystals growing from the frame edges ──────────────────────────────
const frostCache = new Map();
function frostSegs(seed) {
  if (frostCache.has(seed)) return frostCache.get(seed);
  const r = rng(seed);
  const segs = [];
  const roots = [];
  for (let k = 0; k < 28; k++) {
    const side = k % 4;
    const u = r();
    const p = side === 0 ? [u * W, -4] : side === 1 ? [W + 4, u * H] : side === 2 ? [u * W, H + 4] : [-4, u * H];
    // corners get more roots
    const cornerBias = Math.min(Math.hypot(p[0], p[1]), Math.hypot(W - p[0], p[1]), Math.hypot(p[0], H - p[1]), Math.hypot(W - p[0], H - p[1]));
    if (cornerBias > 650 && r() < 0.6) continue;
    const inward = Math.atan2(H / 2 - p[1], W / 2 - p[0]) + (r() - 0.5) * 0.9;
    roots.push([p, inward]);
  }
  const grow = (p, a, len, depth, birth) => {
    const q = [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len];
    segs.push({ a: p, b: q, birth, depth });
    if (depth > 3) return;
    const n = depth < 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      const s0 = [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
      const side = i % 2 ? 1 : -1;
      grow(s0, a + side * (0.85 + r() * 0.35), len * (0.42 + r() * 0.18), depth + 1, birth + t * 0.22 + 0.05);
    }
    if (depth < 2) grow(q, a + (r() - 0.5) * 0.4, len * 0.7, depth + 1, birth + 0.25);
  };
  roots.forEach(([p, a]) => grow(p, a, 90 + r() * 120, 0, r() * 0.25));
  frostCache.set(seed, segs);
  return segs;
}
/** Frost: p 0..1 growth. o: color, alpha, seed */
export function frost(ctx, p, o = {}) {
  if (p <= 0) return;
  const segs = frostSegs(o.seed ?? 7);
  ctx.save();
  ctx.lineCap = 'round';
  // icy haze at the edges
  const hz = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  hz.addColorStop(0, 'rgba(200,220,230,0)'); hz.addColorStop(1, `rgba(200,220,230,${0.22 * clamp(p) * (o.alpha ?? 1)})`);
  ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
  for (const sg of segs) {
    const k = clamp((p * 1.3 - sg.birth) / 0.3);
    if (k <= 0) continue;
    const bx = lerp(sg.a[0], sg.b[0], k), by = lerp(sg.a[1], sg.b[1], k);
    ctx.strokeStyle = `rgba(225,238,244,${(0.55 - sg.depth * 0.09) * (o.alpha ?? 1)})`;
    ctx.lineWidth = Math.max(0.6, 2.6 - sg.depth * 0.55);
    ctx.beginPath(); ctx.moveTo(sg.a[0], sg.a[1]); ctx.lineTo(bx, by); ctx.stroke();
  }
  ctx.restore();
}

// ── breath vapour ────────────────────────────────────────────────────────────
/** Periodic exhale puffs from (x,y) drifting in direction dir. o: period, alpha, scale */
export function breath(ctx, x, y, t, o = {}) {
  const per = o.period ?? 3.2;
  const a0 = o.alpha ?? 0.5;
  if (a0 <= 0.01) return;
  const sc = o.scale ?? 1;
  const dir = o.dir ?? [1, -0.25];
  ctx.save();
  for (let k = -1; k <= 0; k++) {
    const cyc = Math.floor(t / per) + k;
    const lt = t - cyc * per;
    if (lt < 0 || lt > per * 1.6) continue;
    const r = rng(cyc * 31 + 7);
    for (let i = 0; i < 9; i++) {
      const delay = i * 0.06;
      const u = lt - delay;
      if (u <= 0) continue;
      const life = 1.7 + r() * 0.6;
      const f = u / life;
      if (f >= 1) continue;
      const d = (40 + 150 * ease.outCubic(f)) * sc;
      const px = x + dir[0] * d + (r() - 0.5) * 30 * sc * f + noise.n2(cyc + i, u) * 12 * sc;
      const py = y + dir[1] * d + (r() - 0.5) * 22 * sc * f - 30 * f * sc;
      const rr = (14 + 60 * f) * sc * (0.6 + r() * 0.6);
      const al = a0 * Math.sin(Math.PI * Math.min(1, f * 1.4 + 0.05)) * (1 - f) * 0.55;
      const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, `rgba(225,236,242,${al})`); g.addColorStop(1, 'rgba(225,236,242,0)');
      ctx.fillStyle = g; ctx.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    }
  }
  ctx.restore();
}

// ── heat-loss arrow (wavy) ───────────────────────────────────────────────────
export function heatArrow(ctx, x, y, ang, len, t, o = {}) {
  if (len < 6) return;
  const n = 18;
  const amp = o.amp ?? 7, wl = o.wl ?? 46;
  const col = o.color || C.ember;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * len;
    const off = Math.sin(d / wl * TAU - t * 6 + (o.seed || 0)) * amp * Math.min(1, d / 30);
    pts.push([x + Math.cos(ang) * d - Math.sin(ang) * off, y + Math.sin(ang) * d + Math.cos(ang) * off]);
  }
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.3, rgba(col, 0.9)); g.addColorStop(1, rgba(col, 1));
  ctx.strokeStyle = g; ctx.lineWidth = o.width ?? 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  const e = pts[n], pr = pts[n - 2];
  const a = Math.atan2(e[1] - pr[1], e[0] - pr[0]);
  const hw = (o.width ?? 4) * 3.2;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(e[0] + Math.cos(a) * hw * 0.6, e[1] + Math.sin(a) * hw * 0.6);
  ctx.lineTo(e[0] + Math.cos(a + 2.4) * hw, e[1] + Math.sin(a + 2.4) * hw);
  ctx.lineTo(e[0] + Math.cos(a - 2.4) * hw, e[1] + Math.sin(a - 2.4) * hw);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ── HOUR counter wrapper with entrance / exit ────────────────────────────────
export function hour(ctx, t, hours, a, b, o = {}) {
  const al = win(t, a, b, 0.45, 0.35);
  if (al <= 0) return;
  ctx.save();
  const rise = (1 - ease.outExpo(clamp((t - a) / 0.6))) * 30;
  ctx.translate(0, rise);
  hourCounter(ctx, { hours, x: o.x ?? 120, y: o.y ?? 120, scale: o.scale ?? 1, alpha: al * (o.alpha ?? 1), t, color: o.color, accent: o.accent });
  ctx.restore();
}

// ── misc ─────────────────────────────────────────────────────────────────────
/** Draw an image-like canvas with horizontal glitch slices. */
export function glitchDraw(ctx, src, amt, t, o = {}) {
  if (amt <= 0.001) { ctx.drawImage(src, 0, 0); return; }
  const r = rng(Math.floor(t * 12) + (o.seed || 0));
  const n = 14;
  let y = 0;
  while (y < H) {
    const h = 8 + r() * 70;
    const shift = (r() < 0.45 ? (r() - 0.5) * 80 * amt : 0);
    ctx.drawImage(src, 0, y, W, h, shift, y, W, h);
    y += h;
  }
  if (amt > 0.2) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.25 * amt;
    ctx.drawImage(src, 6 * amt, 0); ctx.restore();
  }
}

/** Soft vignette in a colour (for grading inside a scene). */
export function vignette(ctx, col = '#000', a = 0.5, inner = 0.35) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * inner, W / 2, H / 2, H * 1.0);
  const [r, gg, b] = hexToRgb(col);
  g.addColorStop(0, `rgba(${r},${gg},${b},0)`); g.addColorStop(1, `rgba(${r},${gg},${b},${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** Cached sandstone helper with consistent keys. */
export const stone = (w, h, o) => sandstone(w, h, o);
export { ROCK, C };

// S7 shared helpers — drawing primitives (copied/adapted from core where core keeps them
// private), camera helpers, plane warps, threads, timing sugar. Pure functions only.
import { clamp, lerp, ease, invLerp, noise, rng, TAU, hexToRgb, mixColor, shade } from '../../core/util.js';

export const W = 1920, H = 1080;
export const LINE = '#2A1712';

/** progress of t through [a,b] with ease (default film) */
export const P = (t, a, b, e = ease.film) => e(clamp(invLerp(a, b, t)));
/** in/out envelope: rises over [a, a+i], holds, falls over [b-o, b] */
export function env(t, a, b, i = 0.4, o = 0.3, ei = ease.outCubic, eo = ease.inQuart) {
  if (t <= a || t >= b) return 0;
  const up = ei(clamp((t - a) / Math.max(1e-6, i)));
  const dn = 1 - eo(clamp((t - (b - o)) / Math.max(1e-6, o)));
  return Math.min(up, dn);
}

// ── cel-shading primitives (same look as aaron.js) ──────────────────────────
export function cel(ctx, build, base, sh, light, off, o = {}) {
  ctx.save();
  ctx.beginPath(); build(ctx);
  ctx.fillStyle = base; ctx.fill();
  ctx.clip();
  ctx.save();
  ctx.translate(-light[0] * off, -light[1] * off);
  ctx.beginPath(); ctx.rect(-6000, -6000, 12000, 12000); build(ctx);
  ctx.restore();
  ctx.fillStyle = sh;
  ctx.fill('evenodd');
  if (o.hi) {
    // lit edge = part of the shape not covered by the shape shifted along the light travel
    ctx.save();
    ctx.translate(light[0] * off * 0.55, light[1] * off * 0.55);
    ctx.beginPath(); ctx.rect(-6000, -6000, 12000, 12000); build(ctx);
    ctx.restore();
    ctx.globalAlpha = o.hiA ?? 0.6;
    ctx.fillStyle = o.hi;
    ctx.fill('evenodd');
    ctx.globalAlpha = 1;
  }
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
  const Pp = [], Wd = [];
  for (let i = 0; i < pts.length; i++) {
    Pp.push(pts[i]); Wd.push(widths[i]);
    if (i < pts.length - 1) {
      Pp.push([(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]);
      Wd.push(((widths[i] + widths[i + 1]) / 2) * (1 + bulge * (i === 0 ? 1 : 0.6)));
    }
  }
  const n = Pp.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = Pp[Math.max(0, i - 1)], b = Pp[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    L.push([Pp[i][0] - dy * Wd[i], Pp[i][1] + dx * Wd[i]]);
    R.push([Pp[i][0] + dy * Wd[i], Pp[i][1] - dx * Wd[i]]);
  }
  const angEnd = Math.atan2(Pp[n - 1][1] - Pp[n - 2][1], Pp[n - 1][0] - Pp[n - 2][0]);
  const angSt = Math.atan2(Pp[1][1] - Pp[0][1], Pp[1][0] - Pp[0][0]);
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
  ctx.lineTo(L[n - 1][0], L[n - 1][1]);
  ctx.arc(Pp[n - 1][0], Pp[n - 1][1], Wd[n - 1], angEnd + Math.PI / 2, angEnd - Math.PI / 2, true);
  for (let i = n - 2; i > 0; i--) ctx.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + R[i - 1][0]) / 2, (R[i][1] + R[i - 1][1]) / 2);
  ctx.lineTo(R[0][0], R[0][1]);
  ctx.arc(Pp[0][0], Pp[0][1], Wd[0], angSt - Math.PI / 2, angSt + Math.PI / 2, true);
  ctx.closePath();
}

export function smoothClosed(ctx, pts) {
  const n = pts.length;
  ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  ctx.closePath();
}
export function smoothOpen(ctx, pts) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  const l = pts[pts.length - 1];
  ctx.lineTo(l[0], l[1]);
}

/** Build a smooth path through points and return a polyline sampler (by arc length). */
export function polyLen(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return cum;
}
export function sampleAt(pts, cum, d) {
  const total = cum[cum.length - 1];
  d = clamp(d, 0, total);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  const f = (d - cum[i - 1]) / seg;
  const a = pts[i - 1], b = pts[i];
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), Math.atan2(b[1] - a[1], b[0] - a[0])];
}
/** Stroke the first `frac` of a polyline. */
export function strokePartial(ctx, pts, frac, cum = polyLen(pts)) {
  const total = cum[cum.length - 1];
  const dEnd = clamp(frac) * total;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] <= dEnd) ctx.lineTo(pts[i][0], pts[i][1]);
    else {
      const f = (dEnd - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
      break;
    }
  }
  ctx.stroke();
}
/** Catmull-Rom resample of control points into a dense polyline. */
export function catmull(ctrl, perSeg = 16) {
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      const f = (j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push(ctrl[0].length === 3 ? [f(0), f(1), f(2)] : [f(0), f(1)]);
    }
  }
  out.push(ctrl[ctrl.length - 1].slice());
  return out;
}

/**
 * Draw a source canvas as a tilted ground plane (pseudo-perspective by horizontal strips).
 * The source is mapped to the trapezoid defined by a camera tilt: tilt=0 → straight top-down
 * (identity fit), tilt→1 → strongly receding. o: { cx, cy (screen anchor of plane centre),
 * scale, tilt (0..1), horizon (y of vanishing), strips }
 * Returns a projector fn(u,v) → {x,y,s} for source coords (u,v in source px).
 */
export function planeProjector(srcW, srcH, o) {
  const cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
  const sc = o.scale ?? 1;
  const tilt = clamp(o.tilt ?? 0, 0, 0.95);
  const f = o.f ?? 1400;               // focal length
  const pitch = (Math.PI / 2) * (1 - tilt); // 90° = top-down
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  const dist = o.dist ?? 1400;
  // plane point (X,Z) in plane units (px of source * sc) centred at plane centre
  return (u, v) => {
    const X = (u - srcW / 2) * sc, Zp = (v - srcH / 2) * sc; // Zp: down the source = toward viewer
    // rotate plane about X axis by pitch: plane coordinates → camera space
    const y = Zp * sp;            // screen-down component
    const z = dist - Zp * cp;     // depth (near rows have smaller z when tilted)
    const s = f / z;
    return { x: cx + X * s * (dist / f), y: cy + y * s * (dist / f), s: s * (dist / f) };
  };
}
export function drawPlane(ctx, src, proj, srcW, srcH, strips = 90, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const sh = srcH / strips;
  for (let i = 0; i < strips; i++) {
    const v0 = i * sh, v1 = (i + 1) * sh;
    const a = proj(0, v0), b = proj(srcW, v0), c = proj(0, v1);
    const wTop = b.x - a.x;
    const hh = c.y - a.y;
    if (hh <= 0.01) continue;
    // affine: map src strip (0..srcW, v0..v1) → top edge a..b, height hh (use top scale)
    const sx = wTop / srcW;
    ctx.setTransform(sx, 0, (c.x - a.x) / (sh), hh / sh, a.x, a.y);
    ctx.drawImage(src, 0, v0, srcW, sh + 0.6, 0, 0, srcW, sh + 0.6);
  }
  ctx.restore();
}

// ── threads (sky-blue connections between people) ───────────────────────────
/**
 * A thread between A and B with sag (0 = taut) and pluck vibration.
 * o: { color, width, sag, vib (amplitude px), phase, t, glow }
 */
export function thread(ctx, ax, ay, bx, by, o = {}) {
  const n = 28;
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const sag = o.sag ?? 0;
  const vib = o.vib ?? 0;
  const t = o.t ?? 0;
  const frac = o.frac ?? 1;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * frac;
    const s = Math.sin(Math.PI * u);
    const w = vib * Math.sin(Math.PI * u * 2 + (o.phase || 0)) * Math.sin(t * 38 + (o.phase || 0)) + vib * 0.6 * s * Math.sin(t * 25);
    pts.push([ax + dx * u + nx * w, ay + dy * u + sag * s + ny * w]);
  }
  if (o.glow) {
    ctx.strokeStyle = o.glowColor || 'rgba(95,184,230,0.25)';
    ctx.lineWidth = (o.width ?? 2.4) * 4;
    ctx.filter = 'blur(4px)';
    ctx.beginPath(); smoothOpen(ctx, pts); ctx.stroke();
    ctx.filter = 'none';
  }
  ctx.strokeStyle = o.color || '#5FB8E6';
  ctx.lineWidth = o.width ?? 2.4;
  ctx.beginPath(); smoothOpen(ctx, pts); ctx.stroke();
  // twist highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(0.6, (o.width ?? 2.4) * 0.35);
  ctx.setLineDash([3, 5]);
  ctx.beginPath(); smoothOpen(ctx, pts); ctx.stroke();
  ctx.restore();
  return pts;
}

/** Hand-made ink line: stroke with slight width wobble (for sketches / route lines). */
export function inkStroke(ctx, pts, o = {}) {
  ctx.save();
  ctx.strokeStyle = o.color || '#2E86C1';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = o.width ?? 3;
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); smoothOpen(ctx, pts); ctx.stroke();
  ctx.restore();
}

/** Particle field of motes with closed-form motion (ash, dust in light). */
export function motes(ctx, t, o = {}) {
  const n = o.count ?? 80;
  const r = rng(o.seed ?? 31);
  const [ax, ay, aw, ah] = o.area || [0, 0, W, H];
  const col = hexToRgb(o.color || '#E8DCC8');
  ctx.save();
  if (o.blend) ctx.globalCompositeOperation = o.blend;
  for (let i = 0; i < n; i++) {
    const z = r();
    const bx = r(), by = r(), ph = r() * TAU, sp = 0.5 + r();
    const life = o.life ?? 0;
    const vy = (o.rise ?? -18) * sp * (0.5 + z);
    const vx = (o.drift ?? 6) * sp;
    let x = ax + ((bx * aw + vx * t + Math.sin(t * 0.6 * sp + ph) * 26 * (o.swirl ?? 1)) % aw + aw) % aw;
    let y = ay + ((by * ah + vy * t + Math.cos(t * 0.45 * sp + ph) * 14) % ah + ah) % ah;
    const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + sp) + ph * 3);
    let a = (o.alpha ?? 0.6) * lerp(0.3, 1, z) * (o.twinkle === false ? 1 : 0.4 + 0.6 * tw);
    if (o.mask) a *= o.mask(x, y);
    if (life) a *= clamp(Math.sin(((t * sp * 0.2 + bx) % 1) * Math.PI) * 1.5);
    if (a < 0.01) continue;
    const sz = lerp(o.size?.[0] ?? 0.8, o.size?.[1] ?? 3.2, z * z);
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** Grounded radial light pool (warm top light on surfaces). */
export function lightPool(ctx, x, y, rx, ry, color = 'rgba(255,236,200,0.5)', blend = 'soft-light') {
  ctx.save();
  ctx.globalCompositeOperation = blend;
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** Vignette by drawing a dark radial frame (scene-level, softer than post). */
export function innerVignette(ctx, strength = 0.4, color = '18,8,4') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.0);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export { clamp, lerp, ease, invLerp, noise, rng, TAU, hexToRgb, mixColor, shade };

// ─────────────────────────────────────────────────────────────────────────────
// Close-up wrapper around the canonical drawHead: at ECU sizes the rig's square stubble
// pixels become visible, so we draw the head with beard≈0 and lay a finer stroke-based
// stubble (same head model/projection as aaron.js, copied) plus grime and grade passes.
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, rng, TAU } from '../../core/util.js';
import { drawHead } from '../../core/aaron.js';

const HEAD_PTS = (() => {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    for (const el of [-1.0, -0.7, -0.4, -0.1, 0.12]) {
      const r = Math.cos(el);
      pts.push([Math.cos(a) * 0.355 * r, -0.13 + Math.sin(el) * 0.36, Math.sin(a) * 0.41 * r]);
    }
  }
  pts.push([0.35, 0.02, 0.13], [-0.35, 0.02, 0.13], [0.31, 0.21, -0.04], [-0.31, 0.21, -0.04],
    [0.24, 0.31, 0.12], [-0.24, 0.31, 0.12], [0.095, 0.4, 0.27], [-0.095, 0.4, 0.27], [0, 0.415, 0.26]);
  return pts;
})();
function hullOf(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}
function smoothClosed(ctx, pts) {
  const n = pts.length;
  ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  ctx.closePath();
}

export function headProjector(size, yaw = 0.3, nod = 0) {
  const yawA = clamp(yaw, -1, 1) * 1.05;
  const cy = Math.cos(yawA), sy = Math.sin(yawA), cn = Math.cos(nod), sn = Math.sin(nod);
  return (p) => {
    const X = p[0] * cy + p[2] * sy, Z = -p[0] * sy + p[2] * cy, Y = p[1];
    return [X * size, (Y * cn - Z * sn) * size, Y * sn + Z * cn];
  };
}

/**
 * o: everything drawHead takes, plus beard (drawn here), grime 0..1, grade:{top,bottom} colours.
 * Returns { proj, faceHull } in head-local coords (relative to x,y before tilt).
 */
export function aronFace(ctx, x, y, size, o = {}) {
  const beard = o.beard ?? 0.95;
  drawHead(ctx, x, y, size, { ...o, beard: 0.0 });
  const proj = headProjector(size, o.yaw ?? 0.3, o.nod || 0);
  const fp = hullOf(HEAD_PTS.map((p) => { const q = proj(p); return [q[0], q[1]]; }));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.tilt || 0);
  ctx.beginPath(); smoothClosed(ctx, fp); ctx.clip();
  // jaw shadow gradient (beard mass)
  if (beard > 0.02) {
    const jc = proj([0, 0.3, 0.24]);
    const g = ctx.createRadialGradient(jc[0], jc[1], size * 0.05, jc[0], jc[1], size * (0.25 + beard * 0.08));
    g.addColorStop(0, `rgba(52,30,19,${0.3 * beard + 0.04})`); g.addColorStop(0.7, `rgba(52,30,19,${0.24 * beard})`); g.addColorStop(1, 'rgba(52,30,19,0)');
    ctx.fillStyle = g; ctx.fillRect(jc[0] - size * 0.5, jc[1] - size * 0.5, size, size);
    // fine stubble strokes
    const r = rng(1771);
    const n = Math.round((700 + 1500 * beard) * clamp(size / 700, 0.4, 1.6));
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, v = r();
      const p = [u * (0.31 - v * 0.15), 0.13 + v * 0.29, 0.22 + (1 - Math.abs(u)) * 0.08];
      // keep the lips clear
      if (Math.abs(u) < 0.36 && p[1] > 0.235 && p[1] < 0.285 && r() < 0.85) continue;
      const q = proj(p);
      if (q[2] < 0.03) continue;
      const len = size * (0.006 + 0.007 * beard) * (0.6 + r() * 0.8);
      const a = Math.PI / 2 + u * 0.6 + (r() - 0.5) * 0.9;
      ctx.strokeStyle = `rgba(${40 + r() * 20},${22 + r() * 10},${14},${(0.28 + 0.42 * beard) * (0.5 + r() * 0.5)})`;
      ctx.lineWidth = Math.max(0.8, size * 0.0024);
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + Math.cos(a) * len, q[1] + Math.sin(a) * len); ctx.stroke();
    }
  }
  // grime: sandstone dust smears
  const gr = o.grime ?? 0;
  if (gr > 0) {
    const r = rng(511);
    for (let i = 0; i < 14; i++) {
      const q = proj([(r() * 2 - 1) * 0.32, -0.25 + r() * 0.6, 0.3]);
      if (q[2] < 0.05) continue;
      const rr = size * (0.03 + r() * 0.07);
      const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr);
      g.addColorStop(0, `rgba(120,58,30,${0.32 * gr})`); g.addColorStop(1, 'rgba(120,58,30,0)');
      ctx.fillStyle = g; ctx.fillRect(q[0] - rr, q[1] - rr, rr * 2, rr * 2);
    }
    // a few dried streaks
    ctx.strokeStyle = `rgba(95,45,25,${0.25 * gr})`; ctx.lineWidth = size * 0.006;
    for (let i = 0; i < 4; i++) {
      const a = proj([(r() * 2 - 1) * 0.25, -0.1 + r() * 0.2, 0.34]);
      if (a[2] < 0.05) continue;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] + size * 0.01, a[1] + size * 0.06, a[0] - size * 0.005, a[1] + size * 0.12); ctx.stroke();
    }
  }
  // grade passes inside the face (key/fill colour)
  if (o.grade) {
    const { from = [0, -0.5], to = [0, 0.5], a = 'rgba(0,0,0,0)', b = 'rgba(0,0,0,0.3)', blend = 'source-over' } = o.grade;
    ctx.globalCompositeOperation = blend;
    const g = ctx.createLinearGradient(from[0] * size, from[1] * size, to[0] * size, to[1] * size);
    g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  return { proj, fp };
}

/** Neck + mustard collar + shoulders under a close-up head (so it never floats). */
export function closeUpBody(ctx, x, y, size, o = {}) {
  const s = size;
  const yaw = o.yaw ?? 0.3;
  const dx = yaw * s * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((o.tilt || 0) * 0.5);
  // neck
  ctx.beginPath();
  ctx.moveTo(-s * 0.19 + dx, s * 0.2); ctx.quadraticCurveTo(-s * 0.2 + dx, s * 0.5, -s * 0.26 + dx, s * 0.78); ctx.lineTo(s * 0.26 + dx, s * 0.78); ctx.quadraticCurveTo(s * 0.2 + dx, s * 0.5, s * 0.18 + dx, s * 0.2); ctx.closePath();
  ctx.fillStyle = '#C98A64'; ctx.fill();
  const ng = ctx.createLinearGradient(0, s * 0.3, 0, s * 0.6);
  ng.addColorStop(0, 'rgba(70,26,15,0.75)'); ng.addColorStop(0.5, 'rgba(70,26,15,0.25)'); ng.addColorStop(1, 'rgba(70,26,15,0.35)');
  ctx.fillStyle = ng; ctx.fill();
  ctx.strokeStyle = '#2A1712'; ctx.lineWidth = Math.max(1.5, s * 0.011); ctx.stroke();
  // shoulders / tee
  ctx.beginPath();
  ctx.moveTo(-s * 1.2 + dx, s * 1.4);
  ctx.quadraticCurveTo(-s * 0.9 + dx, s * 0.66, -s * 0.2 + dx, s * 0.6);
  ctx.quadraticCurveTo(dx, s * 0.72, s * 0.2 + dx, s * 0.6);
  ctx.quadraticCurveTo(s * 0.9 + dx, s * 0.66, s * 1.2 + dx, s * 1.4);
  ctx.closePath();
  ctx.fillStyle = o.shirt || '#D9A521'; ctx.fill();
  const sg = ctx.createLinearGradient(-s, 0, s, 0);
  sg.addColorStop(0, 'rgba(60,30,5,0.55)'); sg.addColorStop(0.5, 'rgba(60,30,5,0.1)'); sg.addColorStop(1, 'rgba(60,30,5,0.5)');
  ctx.fillStyle = sg; ctx.fill();
  if (o.dirt) { ctx.fillStyle = `rgba(110,60,25,${0.35 * o.dirt})`; ctx.fill(); }
  ctx.strokeStyle = '#2A1712'; ctx.lineWidth = Math.max(1.5, s * 0.011); ctx.stroke();
  // collar
  ctx.strokeStyle = '#A9760F'; ctx.lineWidth = s * 0.03;
  ctx.beginPath(); ctx.moveTo(-s * 0.2 + dx, s * 0.62); ctx.quadraticCurveTo(dx, s * 0.78, s * 0.2 + dx, s * 0.62); ctx.stroke();
  // pack strap + blue tube (desaturated while trapped)
  if (o.strap !== false) {
    ctx.strokeStyle = '#1E3E4F'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.55 + dx, s * 0.7); ctx.quadraticCurveTo(-s * 0.5 + dx, s * 1.0, -s * 0.62 + dx, s * 1.4); ctx.stroke();
  }
  ctx.restore();
}

/** Pain / strain lines (brow furrows, crow's feet, nasolabial folds) on top of aronFace. */
export function strainLines(ctx, x, y, size, o = {}, amt = 1) {
  if (amt <= 0.01) return;
  const proj = headProjector(size, o.yaw ?? 0.3, o.nod || 0);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(o.tilt || 0);
  ctx.lineCap = 'round';
  const line = (pts, w, a) => {
    const q = pts.map(proj);
    if (q.some((p) => p[2] < 0.06)) return;
    ctx.strokeStyle = `rgba(105,45,28,${a * amt})`; ctx.lineWidth = Math.max(1, size * w);
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
    if (q.length === 3) ctx.quadraticCurveTo(q[1][0], q[1][1], q[2][0], q[2][1]); else ctx.lineTo(q[1][0], q[1][1]);
    ctx.stroke();
  };
  // vertical furrows between the brows
  line([[-0.035, -0.135, 0.4], [-0.045, -0.105, 0.405], [-0.03, -0.075, 0.405]], 0.006, 0.7);
  line([[0.035, -0.135, 0.4], [0.045, -0.105, 0.405], [0.03, -0.075, 0.405]], 0.006, 0.7);
  // forehead
  line([[-0.15, -0.205, 0.36], [0, -0.225, 0.4], [0.15, -0.205, 0.36]], 0.004, 0.45);
  line([[-0.12, -0.245, 0.34], [0, -0.262, 0.38], [0.12, -0.245, 0.34]], 0.0035, 0.35);
  // crow's feet
  for (const sd of [-1, 1]) {
    for (let k = 0; k < 3; k++) line([[sd * 0.235, -0.03 + k * 0.025, 0.28], [sd * 0.275, -0.05 + k * 0.035, 0.24]], 0.0035, 0.55);
    // nasolabial fold
    line([[sd * 0.075, 0.13, 0.4], [sd * 0.13, 0.2, 0.36], [sd * 0.13, 0.27, 0.33]], 0.0055, 0.6);
    // under-eye tension
    line([[sd * 0.1, 0.035, 0.37], [sd * 0.15, 0.05, 0.36], [sd * 0.2, 0.035, 0.33]], 0.004, 0.45);
  }
  ctx.restore();
}

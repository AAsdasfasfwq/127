// S1 shared helpers (drawing vocabulary used by several S1 scenes).
import { clamp, lerp, ease, seg, rng, noise, TAU, rgba, hexToRgb, mixColor, shade } from '../../core/util.js';
import { text, measure, font, F } from '../../core/text.js';
import { paper, sandstone, softShadow, rockPath } from '../../core/textures.js';
import { C } from '../../core/palette.js';

export const W = 1920, H = 1080;

/** in/out envelope for an element living in [a,b] with entrance ia and exit ob seconds. */
export function life(t, a, b, ia = 0.4, ob = 0.3, ei = ease.outExpo, eo = ease.inQuart) {
  if (t < a || t > b) return 0;
  const i = ia > 0 ? ei(clamp((t - a) / ia)) : 1;
  const o = ob > 0 ? 1 - eo(clamp((t - (b - ob)) / ob)) : 1;
  return Math.min(i, o);
}

/** full-frame paper ground */
export function paperBg(ctx, base = '#EFE4D0', seed = 0, o = {}) {
  ctx.drawImage(paper(1920, 1080, { base, seed, fibre: o.fibre ?? 1, mottling: o.mottling ?? 1 }), 0, 0);
}

/** Radial light pool (adds volume to flat grounds). */
export function lightPool(ctx, x, y, r, color = 'rgba(255,240,215,0.5)', blend = 'soft-light') {
  ctx.save();
  ctx.globalCompositeOperation = blend;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Darken edges with a warm multiply wash (scene-level depth, separate from post vignette) */
export function edgeShade(ctx, amt = 0.35, color = '30,14,8') {
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${amt})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Arrow (force vector / pointer) with a solid head. */
export function arrow(ctx, x0, y0, x1, y1, o = {}) {
  const p = clamp(o.p ?? 1);
  if (p <= 0) return;
  const x = lerp(x0, x1, p), y = lerp(y0, y1, p);
  const a = Math.atan2(y - y0, x - x0);
  const hw = o.head ?? 16;
  const lw = o.width ?? 5;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = o.color || C.ink;
  ctx.fillStyle = o.color || C.ink;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x - Math.cos(a) * hw * 0.8, y - Math.sin(a) * hw * 0.8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(a - 0.42) * hw * 1.4, y - Math.sin(a - 0.42) * hw * 1.4);
  ctx.lineTo(x - Math.cos(a + 0.42) * hw * 1.4, y - Math.sin(a + 0.42) * hw * 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Dimension line with end ticks and a centred label (engineering drawing style). */
export function dimLine(ctx, x0, y0, x1, y1, label, o = {}) {
  const p = clamp(o.p ?? 1);
  if (p <= 0) return;
  const col = o.color || C.ink;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const e = ease.outExpo(p);
  const ax = lerp(mx, x0, e), ay = lerp(my, y0, e), bx = lerp(mx, x1, e), by = lerp(my, y1, e);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  ctx.save();
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineWidth = o.width ?? 2;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  const tk = o.tick ?? 14;
  for (const [x, y, s] of [[ax, ay, 1], [bx, by, -1]]) {
    ctx.beginPath(); ctx.moveTo(x - nx * tk, y - ny * tk); ctx.lineTo(x + nx * tk, y + ny * tk); ctx.stroke();
    // arrowhead into the tick
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * 14 * s - nx * 5, y + Math.sin(ang) * 14 * s - ny * 5);
    ctx.lineTo(x + Math.cos(ang) * 14 * s + nx * 5, y + Math.sin(ang) * 14 * s + ny * 5);
    ctx.closePath(); ctx.fill();
  }
  if (label) {
    const lp = clamp((p - 0.35) / 0.65);
    const off = o.labelOff ?? -24;
    ctx.translate(mx + nx * off, my + ny * off);
    let ra = ang; if (ra > Math.PI / 2 || ra < -Math.PI / 2) ra += Math.PI;
    if (o.upright) ra = 0;
    ctx.rotate(ra);
    text(ctx, label, 0, 0, { family: o.family || 'display', size: o.size ?? 54, weight: o.weight ?? 800, color: o.labelColor || col, align: 'center', baseline: 'middle', alpha: ease.outCubic(lp), tracking: o.tracking ?? 0.02 });
  }
  ctx.restore();
}

/** Chiselled text: letters cut into rock with raking light. p reveals left→right like a chisel pass. */
export function chiselText(ctx, str, x, y, size, p, o = {}) {
  const fam = o.family || 'display', wt = o.weight || 900;
  const tr = o.tracking ?? 0.04;
  const w = measure(ctx, str, { family: fam, size, weight: wt, tracking: tr });
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const rev = clamp(p);
  if (rev <= 0) return { x0, w };
  ctx.save();
  // reveal clip with a ragged chisel front
  ctx.beginPath();
  const fx = x0 - 10 + (w + 20) * rev;
  ctx.moveTo(x0 - 30, y - size * 1.2);
  for (let k = 0; k <= 12; k++) {
    const yy = y - size * 1.2 + (size * 1.6) * (k / 12);
    ctx.lineTo(fx + noise.n2(k * 1.7, size) * 10 * (rev < 1 ? 1 : 0), yy);
  }
  ctx.lineTo(x0 - 30, y + size * 0.4);
  ctx.closePath();
  ctx.clip();
  const base = { family: fam, size, weight: wt, tracking: tr, align: 'left' };
  const fill = o.fill || 'rgba(60,22,12,0.92)';
  // 1) groove floor (dark)
  text(ctx, str, x0, y, { ...base, color: fill });
  // 2) lit lower-right inner bevel: offset copy clipped by the glyph
  const tmp = o.tmp && o.tmp();
  if (tmp) {
    const g = tmp.ctx;
    g.save();
    text(g, str, x0, y, { ...base, color: '#000' });
    g.globalCompositeOperation = 'source-in';
    // light catches the far (lower) edge of the groove, shadow the near (upper-left) edge
    g.fillStyle = o.floorColor || 'rgba(120,52,28,1)';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-atop';
    text(g, str, x0 - size * 0.035, y - size * 0.045, { ...base, color: o.lit || 'rgba(255,214,168,0.85)' });
    text(g, str, x0 + size * 0.01, y + size * 0.0, { ...base, color: fill });
    g.restore();
    ctx.drawImage(tmp.canvas, 0, 0);
  }
  // 3) top-left rim shadow outside the cut (depth)
  text(ctx, str, x0, y, { ...base, color: 'rgba(0,0,0,0)', stroke: 'rgba(40,14,8,0.35)', strokeWidth: Math.max(1, size * 0.012), fill: false });
  ctx.restore();
  return { x0, w, front: fx };
}

/** Rock chips + dust puff flying from a point (deterministic by seed, local time lt since strike). */
export function chips(ctx, x, y, lt, o = {}) {
  if (lt < 0 || lt > (o.life ?? 0.9)) return;
  const r = rng(o.seed ?? 3);
  const n = o.count ?? 14;
  const k = lt / (o.life ?? 0.9);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.4 + (o.dir ?? 0);
    const sp = 160 + r() * 520;
    const px = x + Math.cos(a) * sp * lt;
    const py = y + Math.sin(a) * sp * lt + 900 * lt * lt;
    const s = 2 + r() * 5;
    ctx.globalAlpha = (1 - k) * 0.95;
    ctx.fillStyle = r() < 0.5 ? (o.c1 || '#E9B486') : (o.c2 || '#8E3E22');
    ctx.save(); ctx.translate(px, py); ctx.rotate(r() * TAU + lt * 8);
    ctx.fillRect(-s / 2, -s / 2, s, s * 0.7);
    ctx.restore();
  }
  // dust puff
  const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + lt * 140);
  g.addColorStop(0, `rgba(230,190,150,${0.35 * (1 - k)})`);
  g.addColorStop(1, 'rgba(230,190,150,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(x - 220, y - 220, 440, 440);
  ctx.restore();
}

/** Simple layer of 2D dust motes in light (warm), closed-form. */
export function motes(ctx, t, o = {}) {
  const r = rng(o.seed ?? 77);
  const n = o.count ?? 40;
  const [ax, ay, aw, ah] = o.area || [0, 0, W, H];
  ctx.save();
  ctx.globalCompositeOperation = o.blend || 'screen';
  for (let i = 0; i < n; i++) {
    const z = r();
    const bx = r() * aw, by = r() * ah, ph = r() * TAU;
    const vx = (o.wind ?? 12) * (0.4 + z), vy = (o.rise ?? -6) * (0.5 + z);
    const x = ax + (((bx + vx * t + Math.sin(t * 0.6 + ph) * 18) % aw) + aw) % aw;
    const y = ay + (((by + vy * t + Math.cos(t * 0.45 + ph) * 12) % ah) + ah) % ah;
    const s = lerp(o.min ?? 1, o.max ?? 3.4, z * z);
    const a = (o.alpha ?? 0.5) * (0.4 + 0.6 * z) * (0.6 + 0.4 * Math.sin(t * 1.7 + ph * 3));
    ctx.fillStyle = `rgba(${o.rgb || '255,226,180'},${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** Thin tracked mono label */
export function mono(ctx, str, x, y, o = {}) {
  text(ctx, str, x, y, { family: 'mono', size: o.size ?? 18, weight: o.weight ?? 400, color: o.color || C.ink, tracking: o.tracking ?? 0.25, align: o.align || 'left', alpha: o.alpha ?? 1, baseline: o.baseline });
}

/** Draw a canvas region with a perspective tilt about a horizontal axis (strip slicing). */
export function tiltImage(ctx, img, o = {}) {
  // o: { x, y (centre on screen), w, h (drawn size at rest), tilt (radians, + = top away), f (focal), strips }
  const n = o.strips || 90;
  const f = o.f || 1400;
  const iw = img.width, ih = img.height;
  for (let k = 0; k < n; k++) {
    const v0 = k / n, v1 = (k + 1) / n;
    const yl0 = (v0 - 0.5) * o.h, yl1 = (v1 - 0.5) * o.h;
    const p0 = projTilt(yl0, o.tilt, f), p1 = projTilt(yl1, o.tilt, f);
    const sy0 = o.y + p0.y, sy1 = o.y + p1.y;
    const sMid = (p0.s + p1.s) / 2;
    const w = o.w * sMid;
    ctx.drawImage(img, 0, v0 * ih, iw, (v1 - v0) * ih + 0.5, o.x - w / 2, sy0, w, sy1 - sy0 + 0.8);
  }
}
function projTilt(yl, tilt, f) {
  const z = -yl * Math.sin(tilt);
  const y = yl * Math.cos(tilt);
  const s = f / (f + z);
  return { y: y * s, s };
}

export { C, ease, seg, clamp, lerp, rng, noise, TAU, rgba, mixColor, shade };

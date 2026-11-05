// ─────────────────────────────────────────────────────────────────────────────
// motifs.js — recurring visual devices that bind the 7 sections into ONE film.
//
// 1. HOUR COUNTER  "HOUR 000 → 127"  — narrative clock of the entrapment.
//    Starts at the fall (S2 ≈ 212 s). Lands on 127 at "He was free" (S6 ≈ 782.9 s).
// 2. SLIT OF SKY   — the vertical crack of blue sky seen from the canyon floor.
//    Blue = the outside world / help. Recurs as transition shape and composition device.
// 3. STRATA LINES  — thin contour lines of sandstone layers used in infographics/maps.
// 4. DATE CARD     — minimalist time-jump interstitial (big Big-Shoulders date +
//    Martian-Mono meta line + strata hairlines).
// 5. THE CHOCKSTONE — see textures.drawChockstone (one boulder design for all).
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, ease, lerp, noise, seg } from './util.js';
import { C } from './palette.js';
import { text, maskRise, odometer, F, chars, measure } from './text.js';

/** Narrative hour for key story beats (for the HOUR counter). */
export const HOURS = {
  trapped: 0,          // Sat Apr 26 ~2:45 pm
  inventory: 0.5,
  plans: 3,
  firstNight: 7,       // dusk Saturday
  sunday: 21,
  monday: 45,
  tuesday: 69,
  wednesday: 93,       // 5th day
  visionNight: 105,
  thursdayMorning: 114,
  decision: 118,
  free: 127,           // Thu May 1 ~12:30 pm (actually ~127 h)
};

/**
 * The canonical HOUR counter. Draw it identically everywhere.
 * o: { hours (number, may be fractional → digit roll), x, y, scale:1, color, accent,
 *      alpha, label:true, total:false (shows "/ 127" only from S6 on), align:'left' }
 */
export function hourCounter(ctx, o = {}) {
  const s = o.scale ?? 1;
  const x = o.x ?? 120, y = o.y ?? 120;
  const col = o.color || C.paper;
  const acc = o.accent || C.red;
  const a = o.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha *= a;
  // tiny REC-like dot (pulses once per second of film time if o.t provided)
  const pulse = o.t !== undefined ? 0.55 + 0.45 * Math.cos(o.t * Math.PI * 2) : 1;
  ctx.fillStyle = acc;
  ctx.globalAlpha *= 0.4 + 0.6 * pulse;
  ctx.beginPath();
  ctx.arc(x + 7 * s, y - 30 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = a;
  if (o.label !== false) text(ctx, 'HOUR', x + 22 * s, y - 24 * s, { family: 'mono', size: 15 * s, weight: 600, color: col, tracking: 0.35, alpha: 0.8 });
  const w = odometer(ctx, Math.max(0, o.hours ?? 0), x, y + 62 * s, { family: 'display', weight: 800, size: 96 * s, color: col, digits: 3, tracking: 0.02 });
  if (o.total) text(ctx, '/ 127', x + w + 16 * s, y + 60 * s, { family: 'mono', size: 22 * s, weight: 400, color: col, alpha: 0.55 });
  // hairline + tick ruler (strata motif)
  ctx.strokeStyle = col;
  ctx.globalAlpha = a * 0.5;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 84 * s); ctx.lineTo(x + 240 * s, y + 84 * s);
  for (let k = 0; k <= 12; k++) { const xx = x + k * 20 * s; ctx.moveTo(xx, y + 84 * s); ctx.lineTo(xx, y + (k % 4 ? 90 : 96) * s); }
  ctx.stroke();
  const prog = clamp((o.hours ?? 0) / 127);
  ctx.globalAlpha = a;
  ctx.strokeStyle = acc;
  ctx.lineWidth = 3 * s;
  ctx.beginPath(); ctx.moveTo(x, y + 84 * s); ctx.lineTo(x + 240 * s * prog, y + 84 * s); ctx.stroke();
  ctx.restore();
}

/**
 * Date / time-jump interstitial. Draws a complete frame (background included).
 * o: { lt, dur, big:'APR 26', small:'SATURDAY · 2003', meta:'BLUE JOHN CANYON, UTAH',
 *      bg, fg, accent, align:'center' }
 */
export function dateCard(ctx, o = {}) {
  const W = 1920, H = 1080;
  const lt = o.lt ?? 1, dur = o.dur ?? 2;
  const bg = o.bg || C.paper, fg = o.fg || C.ink, acc = o.accent || C.terracotta;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // strata hairlines drifting
  ctx.save();
  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.09;
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 14; k++) {
    ctx.beginPath();
    const y0 = 120 + k * 64;
    for (let x = -20; x <= W + 20; x += 24) {
      const y = y0 + noise.fbm2(x * 0.0018 + k * 0.7, k * 3.1 + lt * 0.04, 3) * 46;
      x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  const pIn = seg(lt, 0, 0.7);
  const pOut = seg(lt, dur - 0.35, dur, ease.inQuart);
  const cx = W / 2, cy = H / 2 + 40;
  const drift = lerp(0, -18, seg(lt, 0, dur, ease.linear));
  ctx.save();
  ctx.globalAlpha = 1 - pOut;
  if (o.small) maskRise(ctx, o.small, cx, cy - 190 + drift * 0.5, seg(lt, 0.05, 0.6), { family: 'mono', size: 24, weight: 600, color: acc, tracking: 0.4, align: 'center' });
  const bigSize = o.bigSize || 230;
  chars(ctx, o.big || '', cx, cy + drift, { family: 'display', size: bigSize, weight: 800, color: fg, align: 'center', tracking: 0.01 }, (i, n) => {
    const p = clamp((pIn * 1.4) - (i / Math.max(1, n)) * 0.4);
    const e = ease.outExpo(p);
    return { dy: (1 - e) * 80, alpha: e, blur: (1 - e) * 10 };
  });
  if (o.meta) {
    const p2 = seg(lt, 0.35, 1.0);
    text(ctx, o.meta, cx, cy + 90 + drift * 1.3, { family: 'mono', size: 20, weight: 400, color: fg, tracking: 0.3, align: 'center', alpha: ease.outCubic(p2) * 0.75 });
  }
  // underline that draws
  const lw = measure(ctx, o.big || '', { family: 'display', size: bigSize, weight: 800 });
  ctx.strokeStyle = acc;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - lw / 2, cy + 40 + drift);
  ctx.lineTo(cx - lw / 2 + lw * ease.inOutCubic(seg(lt, 0.25, 0.95)), cy + 40 + drift);
  ctx.stroke();
  ctx.restore();
}

/**
 * The slit of sky seen from the canyon floor: draws a jagged vertical sky opening into
 * the current clip. width = opening width (px), x = centre. Rock is NOT drawn here.
 * Returns the path builder so callers can clip/fill the rock around it.
 */
export function slitPath(ctx, x, width, o = {}) {
  const H = 1080;
  const seed = o.seed ?? 8;
  const jag = o.jag ?? width * 0.35 + 10;
  const steps = 36;
  ctx.moveTo(x - width / 2, -20);
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * (H + 40) - 20;
    const w = width * (1 + noise.fbm2(y * 0.004, seed, 3) * 0.6) * (o.taper ? lerp(1, o.taper, y / H) : 1);
    ctx.lineTo(x - w / 2 + noise.fbm2(y * 0.008, seed + 3, 3) * jag, y);
  }
  for (let i = steps; i >= 0; i--) {
    const y = (i / steps) * (H + 40) - 20;
    const w = width * (1 + noise.fbm2(y * 0.004, seed + 1, 3) * 0.6) * (o.taper ? lerp(1, o.taper, y / H) : 1);
    ctx.lineTo(x + w / 2 + noise.fbm2(y * 0.008, seed + 7, 3) * jag, y);
  }
  ctx.closePath();
}

/** Thin topographic/strata contour field (infographic backgrounds, maps). */
export function strataLines(ctx, o = {}) {
  const W = o.w ?? 1920, H = o.h ?? 1080;
  const n = o.count ?? 18;
  ctx.save();
  ctx.strokeStyle = o.color || C.ink;
  ctx.globalAlpha = o.alpha ?? 0.12;
  ctx.lineWidth = o.width ?? 1.2;
  for (let k = 0; k < n; k++) {
    ctx.beginPath();
    const y0 = (k + 0.5) * (H / n);
    for (let x = -20; x <= W + 20; x += 20) {
      const y = y0 + noise.fbm2(x * (o.freq ?? 0.0016) + k * 0.31, k * 0.9 + (o.t ?? 0) * (o.speed ?? 0.03), 4) * (o.amp ?? 60);
      x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Small mono label with a leader line to a point (annotations in diagrams). */
export function callout(ctx, x, y, label, o = {}) {
  const p = o.p ?? 1;
  const dx = o.dx ?? 140, dy = o.dy ?? -90;
  const col = o.color || C.paper;
  const e = ease.outCubic(clamp(p));
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = o.width ?? 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 5 * e, 0, Math.PI * 2);
  ctx.fill();
  const ex = x + dx * e, ey = y + dy * e;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.lineTo(ex + (dx >= 0 ? 1 : -1) * 60 * clamp(p * 2 - 1), ey);
  ctx.stroke();
  const lp = clamp(p * 2 - 1);
  if (lp > 0) {
    maskRise(ctx, label, ex + (dx >= 0 ? 10 : -10), ey - 14, lp, { family: 'mono', size: o.size ?? 20, weight: 600, color: col, tracking: 0.2, align: dx >= 0 ? 'left' : 'right' });
    if (o.sub) text(ctx, o.sub, ex + (dx >= 0 ? 10 : -10), ey + 26, { family: 'serif', italic: true, size: (o.size ?? 20) * 1.3, color: col, alpha: lp * 0.8, align: dx >= 0 ? 'left' : 'right' });
  }
  ctx.restore();
}

export { F };

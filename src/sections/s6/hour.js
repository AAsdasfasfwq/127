// ─────────────────────────────────────────────────────────────────────────────
// S6 HOUR counter helpers.
// • hud(ctx, hours, t, o)  — the canonical motifs.hourCounter (total:'/127') with a
//   mechanical "hold then snap" digit roll (the core odometer rolls continuously).
// • heroCounter(...)        — the same design drawn at any scale/centre so the HUD can
//   fly from the corner to frame centre and become the 127 payoff (container transform).
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, ease } from '../../core/util.js';
import { C } from '../../core/palette.js';
import { hourCounter } from '../../core/motifs.js';
import { text, measure, odometer } from '../../core/text.js';

/** Snap value: integer part holds, the last `w` of each unit rolls quickly. */
export function snapHours(h, w = 0.18) {
  const n = Math.floor(h + 1e-9);
  const f = h - n;
  return n + ease.inOutCubic(clamp((f - (1 - w)) / w));
}

export function hud(ctx, hours, t, o = {}) {
  hourCounter(ctx, { hours: snapHours(hours), x: o.x ?? 120, y: o.y ?? 120, t, total: true, alpha: o.alpha ?? 1, color: o.color, accent: o.accent, scale: o.scale ?? 1 });
}

/**
 * Same visual grammar as motifs.hourCounter, parametrised for the hero:
 *   (x,y) top-left anchor at scale s, or centred on cx when o.center is given (blend 0..1).
 *   o.fill = ruler progress override, o.totalA = alpha of "/ 127", o.accent, o.color, o.glow
 */
export function heroCounter(ctx, value, x, y, s, o = {}) {
  const col = o.color || C.paper;
  const acc = o.accent || C.red;
  const a = o.alpha ?? 1;
  const dSize = 96 * s;
  const cw = measure(ctx, '0', { family: 'display', weight: 800, size: dSize }) + 0.02 * dSize;
  const digitsW = cw * 3;
  const rulerW = lerp(240 * s, digitsW, o.rulerFit ?? 0);
  ctx.save();
  ctx.globalAlpha *= a;
  // REC-like dot
  const pulse = o.t !== undefined ? 0.55 + 0.45 * Math.cos(o.t * Math.PI * 2) : 1;
  ctx.fillStyle = acc;
  ctx.globalAlpha = a * (0.4 + 0.6 * pulse);
  ctx.beginPath(); ctx.arc(x + 7 * s, y - 30 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = a;
  text(ctx, 'HOUR', x + 22 * s, y - 24 * s, { family: 'mono', size: 15 * s, weight: 600, color: col, tracking: 0.35, alpha: 0.8 });
  if (o.glow) {
    ctx.save();
    ctx.shadowColor = o.glow; ctx.shadowBlur = 40 * s * 0.3;
    odometer(ctx, Math.max(0, value), x, y + 62 * s, { family: 'display', weight: 800, size: dSize, color: col, digits: 3, tracking: 0.02 });
    ctx.restore();
  } else {
    odometer(ctx, Math.max(0, value), x, y + 62 * s, { family: 'display', weight: 800, size: dSize, color: col, digits: 3, tracking: 0.02 });
  }
  if ((o.totalA ?? 1) > 0.01) text(ctx, '/ 127', x + digitsW + 16 * s, y + 60 * s, { family: 'mono', size: 22 * s, weight: 400, color: col, alpha: 0.55 * (o.totalA ?? 1) });
  ctx.strokeStyle = col;
  ctx.globalAlpha = a * 0.5;
  ctx.lineWidth = Math.max(1, s * 0.6);
  ctx.beginPath();
  ctx.moveTo(x, y + 84 * s); ctx.lineTo(x + rulerW, y + 84 * s);
  for (let k = 0; k <= 12; k++) { const xx = x + k * (rulerW / 12); ctx.moveTo(xx, y + 84 * s); ctx.lineTo(xx, y + (k % 4 ? 90 : 96) * s); }
  ctx.stroke();
  const prog = clamp(o.fill ?? value / 127);
  ctx.globalAlpha = a;
  ctx.strokeStyle = o.barColor || acc;
  ctx.lineWidth = 3 * s;
  ctx.beginPath(); ctx.moveTo(x, y + 84 * s); ctx.lineTo(x + rulerW * prog, y + 84 * s); ctx.stroke();
  ctx.restore();
  return { digitsW, rulerW };
}

/** width of the digits block at scale s (for centring) */
export function heroDigitsWidth(ctx, s) {
  const dSize = 96 * s;
  return (measure(ctx, '0', { family: 'display', weight: 800, size: dSize }) + 0.02 * dSize) * 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// text.js — typography system. All type is drawn on canvas (deterministic, maskable).
//
// TYPE ROLES (docs/ART_BIBLE.md §Typography):
//   display  Big Shoulders Display 300–900 — numbers, dates, big kinetic words (CAPS)
//   serif    Instrument Serif (+italic)    — narrative connective phrases, quotes
//   title    Fraunces (variable, +italic)  — chapter titles, editorial headlines
//   mono     Martian Mono 200–800          — data labels, coordinates, HOUR counter
//   wide     Unbounded 300/500/800         — rare: hero statements, film/book title
//   grotesk  Bricolage Grotesque 200–800   — UI-ish labels, secondary headings
//   hand     Reenie Beanie                 — handwriting (the note, diary scribbles)
//   scratch  Rock Salt                     — letters scratched into sandstone
//   type     Special Elite                 — typewriter: police reports, records
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, ease, lerp } from './util.js';

export const F = {
  display: '"Big Shoulders Display"',
  serif: '"Instrument Serif"',
  title: '"Fraunces"',
  mono: '"Martian Mono"',
  wide: '"Unbounded"',
  grotesk: '"Bricolage Grotesque"',
  hand: '"Reenie Beanie"',
  scratch: '"Rock Salt"',
  type: '"Special Elite"',
};

export const FONT_LOADS = [
  ['display', [300, 500, 700, 800, 900]],
  ['serif', [400], true],
  ['title', [300, 400, 600, 800, 900], true],
  ['mono', [200, 400, 600, 800]],
  ['wide', [300, 500, 800]],
  ['grotesk', [300, 500, 700, 800]],
  ['hand', [400]],
  ['scratch', [400]],
  ['type', [400]],
];

export function font(family = 'display', size = 64, weight = 400, italic = false) {
  return `${italic ? 'italic ' : ''}${weight} ${Math.max(1, size).toFixed(2)}px ${F[family] || family}`;
}

function applyStyle(ctx, o) {
  ctx.font = font(o.family, o.size, o.weight, o.italic);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${((o.tracking || 0) * (o.size || 64)).toFixed(2)}px`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
}

/** Measure width of a string in a style (tracking included). */
export function measure(ctx, str, o = {}) {
  ctx.save();
  applyStyle(ctx, { ...o, align: 'left' });
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/**
 * Draw a string.  o: { family, size, weight, italic, color, align, baseline, tracking(em),
 *   alpha, stroke, strokeWidth, shadow:{color,blur,x,y}, fill:false to only stroke }
 */
export function text(ctx, str, x, y, o = {}) {
  ctx.save();
  applyStyle(ctx, o);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow) {
    ctx.shadowColor = o.shadow.color || 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = o.shadow.blur ?? 12;
    ctx.shadowOffsetX = o.shadow.x ?? 0;
    ctx.shadowOffsetY = o.shadow.y ?? 4;
  }
  if (o.fill !== false) {
    ctx.fillStyle = o.color || '#f1e8d8';
    ctx.fillText(str, x, y);
  }
  if (o.stroke) {
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.strokeWidth || 2;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
  }
  ctx.restore();
}

/**
 * Text that rises out of an invisible mask line (the film's default type entrance).
 * p: 0→1 progress. o.from: 'below'|'above'. Keeps descenders safe with o.pad.
 */
export function maskRise(ctx, str, x, y, p, o = {}) {
  const size = o.size || 64;
  const pad = o.pad ?? size * 0.35;
  const w = measure(ctx, str, o);
  let x0 = x;
  if (o.align === 'center') x0 = x - w / 2;
  else if (o.align === 'right') x0 = x - w;
  const e = (o.ease || ease.outExpo)(clamp(p));
  const dy = (1 - e) * size * 1.15 * (o.from === 'above' ? -1 : 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - size, y - size * 1.1 - pad, w + size * 2, size * 1.1 + pad * 2);
  ctx.clip();
  text(ctx, str, x, y + dy, o);
  ctx.restore();
  return w;
}

/**
 * Per-character animation. fn(i, n, ch) → { dx, dy, rot, scale, alpha, color, blur }
 * Characters are laid out with real kerning-free advance widths (tracking applied).
 */
export function chars(ctx, str, x, y, o, fn) {
  const size = o.size || 64;
  const track = (o.tracking || 0) * size;
  ctx.save();
  applyStyle(ctx, { ...o, align: 'left', tracking: 0 });
  const widths = [...str].map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (widths.length - 1);
  let cx = x;
  if (o.align === 'center') cx = x - total / 2;
  else if (o.align === 'right') cx = x - total;
  const arr = [...str];
  arr.forEach((ch, i) => {
    const s = fn ? fn(i, arr.length, ch) || {} : {};
    const cw = widths[i];
    ctx.save();
    ctx.translate(cx + cw / 2 + (s.dx || 0), y + (s.dy || 0));
    if (s.rot) ctx.rotate(s.rot);
    if (s.scale !== undefined) ctx.scale(s.scale, s.scaleY ?? s.scale);
    ctx.globalAlpha *= s.alpha ?? 1;
    if (s.blur) ctx.filter = `blur(${s.blur.toFixed(1)}px)`;
    ctx.fillStyle = s.color || o.color || '#f1e8d8';
    ctx.textAlign = 'center';
    ctx.fillText(ch, 0, 0);
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeWidth || 2; ctx.strokeText(ch, 0, 0); }
    ctx.restore();
    cx += cw + track;
  });
  ctx.restore();
  return total;
}

/**
 * Mixed-style line on one baseline — the film's editorial voice:
 *   richLine(ctx, [ {t:'the most', family:'serif', italic:true, size:58},
 *                   {t:'FATAL', family:'display', weight:900, size:150, color:RED} ], x, y,
 *            { align:'center', gap:18, p: 0..1, stagger:0.5, style:'rise'|'blur'|'fade' })
 * Returns { width, boxes:[{x,w,seg}] } so you can attach underlines, arrows, etc.
 */
export function richLine(ctx, segs, x, y, o = {}) {
  const gap = o.gap ?? 16;
  const widths = segs.map((s) => measure(ctx, s.t, s));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (segs.length - 1);
  let cx = x;
  if (o.align === 'center') cx = x - total / 2;
  else if (o.align === 'right') cx = x - total;
  const boxes = [];
  const n = segs.length;
  const p = o.p ?? 1;
  const spread = o.stagger ?? 0.5;
  segs.forEach((s, i) => {
    const local = n <= 1 ? p : clamp((p - (i / (n - 1)) * spread) / (1 - spread));
    const style = s.style || o.style || 'rise';
    const so = { ...s, align: 'left' };
    if (style === 'rise') maskRise(ctx, s.t, cx, y, local, so);
    else if (style === 'blur') {
      ctx.save();
      ctx.filter = `blur(${((1 - ease.outCubic(local)) * 18).toFixed(1)}px)`;
      text(ctx, s.t, cx, y, { ...so, alpha: (so.alpha ?? 1) * ease.outQuad(local) });
      ctx.restore();
    } else if (style === 'track') {
      const tr = (s.tracking || 0) + (1 - ease.outExpo(local)) * 0.6;
      text(ctx, s.t, cx, y, { ...so, tracking: tr, alpha: (so.alpha ?? 1) * ease.outQuad(local) });
    } else text(ctx, s.t, cx, y, { ...so, alpha: (so.alpha ?? 1) * local });
    boxes.push({ x: cx, w: widths[i], seg: s, p: local });
    cx += widths[i] + gap;
  });
  return { width: total, boxes, x0: boxes.length ? boxes[0].x : x };
}

/** Wrap text into lines that fit maxWidth (for the rare multi-line quote). */
export function wrap(ctx, str, maxWidth, o) {
  const words = str.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (measure(ctx, test, o) > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Number formatting for counters: fmt(1234.5, {dec:0, sep:','}) → '1,235' */
export function fmt(v, o = {}) {
  const dec = o.dec ?? 0;
  const s = Math.abs(v).toFixed(dec);
  const [i, d] = s.split('.');
  const withSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, o.sep ?? ',');
  return (v < 0 ? '−' : '') + withSep + (d ? '.' + d : '');
}

/** Rolling odometer digits: each digit column scrolls (mechanical counter feel). */
export function odometer(ctx, value, x, y, o = {}) {
  const digits = o.digits || String(Math.floor(Math.abs(value))).length;
  const size = o.size || 120;
  const cw = measure(ctx, '0', o) + (o.tracking || 0) * size;
  const total = cw * digits;
  let x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - 10, y - size * 0.95, total + 20, size * 1.15);
  ctx.clip();
  for (let k = 0; k < digits; k++) {
    const place = Math.pow(10, digits - 1 - k);
    const raw = value / place;
    const d = Math.floor(raw) % 10;
    // fractional roll only near the transition (mechanical snap)
    const frac = raw - Math.floor(raw);
    const roll = place === 1 ? frac : clamp((frac - 0.85) / 0.15);
    const off = ease.inOutCubic(roll) * size * 1.05;
    const cxk = x0 + k * cw + cw / 2;
    text(ctx, String(d), cxk, y - off, { ...o, align: 'center', tracking: 0 });
    text(ctx, String((d + 1) % 10), cxk, y - off + size * 1.05, { ...o, align: 'center', tracking: 0 });
  }
  ctx.restore();
  return total;
}

export const lerpSize = lerp;

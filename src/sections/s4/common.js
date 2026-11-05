// ─────────────────────────────────────────────────────────────────────────────
// S4 shared helpers: DV camcorder look, slot-canyon sets, glows, letterbox, etc.
// Everything is a pure function of time; caches are built lazily and deterministically.
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, ease, rng, noise, mulberry32, TAU, hexToRgb, mixColor } from '../../core/util.js';
import { C, ROCK } from '../../core/palette.js';
import { sandstone, drawChockstone, cached, softShadow } from '../../core/textures.js';
import { text } from '../../core/text.js';
import { drawAaron, POSES, EXPR, mixPose, mixExpr } from '../../core/aaron.js';
import { makeCanvas } from '../../core/engine.js';

export const W = 1920, H = 1080;
/** Aron continuity on Wednesday (ART_BIBLE §5). */
export const WED = { beard: 0.8, dirt: 0.7, tired: 0.75, sunburn: 0.35 };

export const COL = {
  dvBg: '#0D1311', dvGreen: '#3F6A4A', lcd: '#CFE3E8', rec: '#E0362A',
  night: '#141B26', nightDeep: '#0B0F16', predawn: '#3E5F86',
  delVi: '#5B3A6E', delMa: '#B0457A', delOc: '#C9A23A', delBg: '#24152B',
  gold: '#F2B64C', peach: '#F6D9B8', leaf: '#5E8C4A', meadow: '#9DBE6A',
  ink: '#2A1712', blueInk: '#2F5FA8',
};

/** progress helpers */
export const P = (t, a, b, e = ease.linear) => e(clamp((t - a) / (b - a)));
export const bump = (t, a, b, c, d) => clamp((t - a) / (b - a)) * (1 - clamp((t - c) / (d - c)));

// ── small cached tiles ──────────────────────────────────────────────────────
export function noiseTile(seed = 1, size = 256, colored = false) {
  return cached(`s4noise:${seed}:${size}:${colored}`, () => {
    const c = makeCanvas(size, size);
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const r = mulberry32(seed * 977 + 13);
    for (let i = 0; i < size * size; i++) {
      const v = r() * 255;
      img.data[i * 4] = colored ? r() * 255 : v;
      img.data[i * 4 + 1] = colored ? r() * 255 : v;
      img.data[i * 4 + 2] = colored ? r() * 255 : v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}
export function scanTile() {
  return cached('s4scan', () => {
    const c = makeCanvas(4, 4);
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 4, 4);
    g.fillStyle = '#b8b8b8'; g.fillRect(0, 2, 4, 2);
    return c;
  });
}
const patCache = new WeakMap();
export function pattern(ctx, canvas, rep = 'repeat') {
  // patterns are cheap to create; keep one per (ctx, canvas)
  let m = patCache.get(ctx);
  if (!m) { m = new Map(); patCache.set(ctx, m); }
  let p = m.get(canvas);
  if (!p) { p = ctx.createPattern(canvas, rep); m.set(canvas, p); }
  return p;
}
/** fill the current path / rect with a pattern translated by (ox,oy) and scaled */
export function fillPattern(ctx, canvas, ox = 0, oy = 0, sc = 1, rect = null) {
  const p = ctx.createPattern(canvas, 'repeat');
  const m = new DOMMatrix();
  m.translateSelf(ox, oy); m.scaleSelf(sc, sc);
  p.setTransform(m);
  ctx.fillStyle = p;
  if (rect) ctx.fillRect(...rect); else ctx.fill();
}

/** cold sandstone tile (512) for walls */
export const coldTex = (seed = 41) => sandstone(512, 512, { seed, ramp: ROCK.cold, scale: 0.8, strata: 1.4, varnish: 0.7, crossbed: 0.6 });
export const shadeTex = (seed = 42) => sandstone(512, 512, { seed, ramp: ROCK.shade, scale: 0.8, strata: 1.3, varnish: 0.8, crossbed: 0.5 });
export const warmTex = (seed = 43) => sandstone(512, 512, { seed, ramp: ROCK.navajo, scale: 0.8, strata: 1.4, varnish: 0.6, crossbed: 0.6 });

// ── glow / light ────────────────────────────────────────────────────────────
export function glow(ctx, x, y, r, color, a = 1, mode = 'screen') {
  if (a <= 0.003 || r <= 0) return;
  const [cr, cg, cb] = hexToRgb(color);
  ctx.save();
  ctx.globalCompositeOperation = mode;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
  g.addColorStop(0.35, `rgba(${cr},${cg},${cb},${a * 0.45})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
/** soft vignette drawn with a radial gradient (cheap, no blit) */
export function vignette(ctx, amt = 0.6, color = '#05070a', inner = 0.35, cx = W / 2, cy = H / 2) {
  const [r, g, b] = hexToRgb(color);
  const gr = ctx.createRadialGradient(cx, cy, H * inner, cx, cy, H * 1.05);
  gr.addColorStop(0, `rgba(${r},${g},${b},0)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},${amt})`);
  ctx.save(); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
}
/** CinemaScope bars that slide in (k 0..1) */
export function letterbox(ctx, k, color = '#0b0807') {
  if (k <= 0) return;
  const bar = Math.round(((H - W / 2.39) / 2) * clamp(k));
  ctx.save(); ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  ctx.restore();
}

// ── DV camcorder look ───────────────────────────────────────────────────────
export const DV43 = { x: 240, y: 0, w: 1440, h: 1080 };
/**
 * Grade the region (default 4:3 window) in place to read as 2003 MiniDV footage:
 * lowered saturation, green-ish cast, lifted blacks, scanlines, chroma noise, occasional
 * tracking slip. o: { t, rect, sat, tint, lift, noise, slip, exposure }
 */
export function dvGrade(ctx, o = {}) {
  const t = o.t ?? 0;
  const [x, y, w, h] = o.rect || [DV43.x, DV43.y, DV43.w, DV43.h];
  const frame = Math.round(t * 30);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  // tracking slip: shift a couple of thin bands sideways (self blit of strips)
  const slip = o.slip ?? 0.25;
  if (slip > 0) {
    const r = mulberry32(frame * 131 + 7);
    const nb = r() < slip ? 1 + Math.floor(r() * 2) : 0;
    for (let k = 0; k < nb; k++) {
      const by = y + r() * h, bh = 3 + r() * 14, dx = (r() - 0.5) * 26;
      ctx.drawImage(ctx.canvas, x, by, w, bh, x + dx, by, w, bh);
    }
  }
  // desaturate via 'saturation' blend with grey
  ctx.globalCompositeOperation = 'saturation';
  ctx.globalAlpha = o.sat ?? 0.55;
  ctx.fillStyle = '#808080'; ctx.fillRect(x, y, w, h);
  // green cast
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = o.tint ?? 0.45;
  ctx.fillStyle = o.tintColor || COL.dvGreen; ctx.fillRect(x, y, w, h);
  // lifted blacks
  ctx.globalCompositeOperation = 'lighten';
  ctx.globalAlpha = o.lift ?? 0.85;
  ctx.fillStyle = o.liftColor || '#18231D'; ctx.fillRect(x, y, w, h);
  // exposure breathing (auto-iris hunting)
  const ex = o.exposure ?? 0;
  if (ex) {
    ctx.globalCompositeOperation = ex > 0 ? 'screen' : 'multiply';
    ctx.globalAlpha = Math.abs(ex);
    ctx.fillStyle = ex > 0 ? '#3a4a40' : '#9aa49c'; ctx.fillRect(x, y, w, h);
  }
  // scanlines
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = o.scan ?? 0.55;
  fillPattern(ctx, scanTile(), 0, frame % 2, 1, [x, y, w, h]);
  // chroma noise
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = o.noise ?? 0.32;
  const r2 = mulberry32(frame * 17 + 3);
  fillPattern(ctx, noiseTile(3, 256, true), Math.floor(r2() * 256), Math.floor(r2() * 256), 1.5, [x, y, w, h]);
  ctx.restore();
}

/** camcorder on-screen display (MiniDV style). o: { t, rect, rec, tc (seconds), date, time, battery 0..1, blinkBattery, alpha, mode } */
export function dvOSD(ctx, o = {}) {
  const [x, y, w, h] = o.rect || [DV43.x, DV43.y, DV43.w, DV43.h];
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  const s = o.scale ?? (w / 1440);
  const t = o.t ?? 0;
  const pad = 70 * s;
  const fg = '#EEF3EA';
  const sh = { color: 'rgba(0,0,0,0.65)', blur: 0, x: 2 * s, y: 2 * s };
  ctx.save();
  ctx.globalAlpha *= a;
  const mono = (str, xx, yy, size, al = 'left', col = fg) => text(ctx, str, xx, yy, { family: 'mono', size: size * s, weight: 600, color: col, align: al, tracking: 0.06, shadow: sh });
  if (o.rec) {
    const on = Math.floor(t * 1.6) % 2 === 0 || o.recSolid;
    ctx.fillStyle = COL.rec;
    if (on) { ctx.beginPath(); ctx.arc(x + pad + 14 * s, y + pad + 4 * s, 13 * s, 0, TAU); ctx.fill(); }
    mono('REC', x + pad + 40 * s, y + pad + 16 * s, 34, 'left', on ? fg : 'rgba(238,243,234,0.85)');
  } else if (o.mode) {
    mono(o.mode, x + pad, y + pad + 16 * s, 34);
  }
  if (o.tc !== undefined) {
    const tc = Math.max(0, o.tc);
    const hh = Math.floor(tc / 3600), mm = Math.floor(tc / 60) % 60, ss = Math.floor(tc) % 60;
    mono(`${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, x + w - pad, y + pad + 16 * s, 34, 'right');
  }
  mono('SP', x + w - pad, y + pad + 66 * s, 24, 'right', 'rgba(238,243,234,0.8)');
  // battery
  if (o.battery !== undefined) {
    const bx = x + pad, by = y + h - pad - 30 * s, bw = 64 * s, bh = 30 * s;
    const blink = o.blinkBattery ? (Math.floor(t * 2.2) % 2 === 0) : true;
    if (blink) {
      ctx.strokeStyle = fg; ctx.lineWidth = 3 * s;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowOffsetX = 2 * s; ctx.shadowOffsetY = 2 * s;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = fg; ctx.fillRect(bx + bw, by + bh * 0.3, 6 * s, bh * 0.4);
      const n = Math.ceil(clamp(o.battery) * 4);
      for (let k = 0; k < n; k++) { ctx.fillStyle = o.battery < 0.26 ? COL.rec : fg; ctx.fillRect(bx + 5 * s + k * 14.5 * s, by + 5 * s, 11 * s, bh - 10 * s); }
      ctx.shadowColor = 'transparent';
    }
  }
  if (o.date) mono(o.date, x + w - pad, y + h - pad - 52 * s, 30, 'right');
  if (o.time) mono(o.time, x + w - pad, y + h - pad - 6 * s, 30, 'right');
  ctx.restore();
}

/** soft dark surround for the 4:3 DV window (the camcorder frame) */
export function dvSurround(ctx, t, o = {}) {
  const { x, w } = DV43;
  ctx.save();
  ctx.fillStyle = o.color || '#0A0E0C';
  ctx.fillRect(0, 0, x, H); ctx.fillRect(x + w, 0, W - x - w, H);
  // inner edge shadow so the frame reads as a screen edge
  const gl = ctx.createLinearGradient(x, 0, x + 60, 0);
  gl.addColorStop(0, 'rgba(0,0,0,0.55)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl; ctx.fillRect(x, 0, 60, H);
  const gr = ctx.createLinearGradient(x + w, 0, x + w - 60, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(x + w - 60, 0, 60, H);
  ctx.restore();
}

// ── slot canyon sets ────────────────────────────────────────────────────────
/** jagged vertical wall edge polyline (deterministic) */
export function wallEdge(x0, seed, jag = 60, steps = 30, y0 = -40, y1 = H + 40, f = 0.004) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const y = lerp(y0, y1, i / steps);
    pts.push([x0 + noise.fbm2(y * f, seed, 3) * jag + noise.n2(y * f * 6, seed + 3) * jag * 0.18, y]);
  }
  return pts;
}
/**
 * Fill a wall region bounded by an edge polyline and the frame side.
 * side: -1 = wall on the left of the edge, 1 = on the right.
 */
export function drawWall(ctx, pts, side, o = {}) {
  ctx.save();
  ctx.beginPath();
  const xs = side < 0 ? -400 : W + 400;
  ctx.moveTo(xs, pts[0][1]);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(xs, pts[pts.length - 1][1]);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  fillPattern(ctx, o.tex || coldTex(o.seed || 41), o.ox || 0, o.oy || 0, o.texScale || 1.4, [-400, -400, W + 800, H + 800]);
  if (o.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.tint; ctx.fillRect(-400, -400, W + 800, H + 800); ctx.globalCompositeOperation = 'source-over'; }
  if (o.shade) { ctx.fillStyle = `rgba(6,8,12,${o.shade})`; ctx.fillRect(-400, -400, W + 800, H + 800); }
  // gradient: darker away from the opening
  const ex = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const g = ctx.createLinearGradient(ex, 0, ex + side * (o.depth || 700), 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(4,6,10,${o.falloff ?? 0.7})`);
  ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, H + 800);
  if (o.vgrad) { ctx.fillStyle = o.vgrad(ctx); ctx.fillRect(-400, -400, W + 800, H + 800); }
  ctx.restore();
  if (o.rim) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = o.rim; ctx.lineWidth = o.rimWidth || 3; ctx.globalAlpha = o.rimAlpha ?? 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

/** Aron trapped (Wednesday look) with the chockstone at his right hand. Returns joints. */
export function drawTrapped(ctx, o = {}) {
  const pose = o.pose || POSES.trapped;
  const j = drawAaron(ctx, {
    x: o.x ?? 960, y: o.y ?? 1000, scale: o.scale ?? 0.6, facing: o.facing ?? 1, pose,
    expr: o.expr || EXPR.exhausted, beard: WED.beard, dirt: WED.dirt, tired: WED.tired, sunburn: WED.sunburn,
    light: o.light || [0.3, 0.95], rim: o.rim ?? 'rgba(160,190,215,0.7)', lineColor: o.lineColor,
  });
  return j;
}

/** Simple deterministic particle drift (dust / frost / pollen). */
export function motes(ctx, t, o = {}) {
  const n = o.count ?? 40;
  const r = rng(o.seed ?? 7);
  const [ax, ay, aw, ah] = o.area || [0, 0, W, H];
  const [vx, vy] = o.vel || [6, 18];
  const col = hexToRgb(o.color || '#DDE6EE');
  ctx.save();
  if (o.blend) ctx.globalCompositeOperation = o.blend;
  for (let i = 0; i < n; i++) {
    const z = r(), bx = r() * aw, by = r() * ah, ph = r() * TAU, sp = 0.5 + r() * 0.8;
    const x = ax + (((bx + vx * t * sp * (0.4 + z) + Math.sin(t * 0.6 * sp + ph) * 18) % aw) + aw) % aw;
    const y = ay + (((by + vy * t * sp * (0.4 + z) + Math.cos(t * 0.45 * sp + ph) * 10) % ah) + ah) % ah;
    const s = lerp(o.size?.[0] ?? 1, o.size?.[1] ?? 3.5, z * z);
    const a = (o.alpha ?? 0.5) * (0.5 + 0.5 * Math.sin(t * 1.7 * sp + ph * 2)) * lerp(0.35, 1, z);
    if (a < 0.01) continue;
    if (o.glow && z > 0.6) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 3);
      g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`); g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
    } else {
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

/** colour wash over the frame (grade) */
export function wash(ctx, color, a, mode = 'soft-light', rect = [0, 0, W, H]) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(...rect); ctx.restore();
}

/** draw a cached sprite canvas centred at x,y with scale */
export function sprite(ctx, c, x, y, s = 1, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(s * (o.flip ? -1 : 1), s);
  ctx.drawImage(c, -(o.ax ?? 0.5) * c.width, -(o.ay ?? 0.5) * c.height);
  ctx.restore();
}

/** blurred copy of a canvas, cached (blur baked at init so frames stay cheap) */
export function blurred(key, src, px, scale = 0.5) {
  return cached(`s4blur:${key}:${px}:${scale}`, () => {
    const w = Math.ceil(src.width * scale), h = Math.ceil(src.height * scale);
    const pad = Math.ceil(px * 2 * scale);
    const c = makeCanvas(w + pad * 2, h + pad * 2);
    const g = c.getContext('2d');
    g.filter = `blur(${(px * scale).toFixed(1)}px)`;
    g.drawImage(src, pad, pad, w, h);
    c.pad = pad / scale; c.sc = scale;
    return c;
  });
}
/** draw a `blurred()` canvas back at the original placement of src (x,y = src top-left) */
export function drawBlurred(ctx, b, x, y, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.drawImage(b, x - b.pad, y - b.pad, b.width / b.sc, b.height / b.sc);
  ctx.restore();
}

export { clamp, lerp, ease, rng, noise, TAU, mixColor, hexToRgb, C, ROCK, drawChockstone, softShadow, mixPose, mixExpr, POSES, EXPR };

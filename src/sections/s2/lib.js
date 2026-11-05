// S2 — shared drawing helpers (walls, labels, vectors, dust, slot framing, chockstone detail).
import { clamp, lerp, ease, noise, rng, TAU, hexToRgb, mixColor, seg } from '../../core/util.js';
import { C, ROCK } from '../../core/palette.js';
import { sandstone, rockPath, drawChockstone, cached, paper } from '../../core/textures.js';
import { text, maskRise, measure } from '../../core/text.js';

export const W = 1920, H = 1080;
export { clamp, lerp, ease, noise, rng, TAU, mixColor, seg, C, ROCK };

// ── palette for this section ────────────────────────────────────────────────
export const K = {
  warmBg: '#E7B98A',
  glow: '#FF9A4A',
  slate: '#2E3A48',
  slateDeep: '#1E2630',
  ink: '#1B1512',
  bone: '#E9DFCC',
  red: C.red,
  sky: C.sky,
  skyPale: C.skyPale,
  gold: C.gold,
  terra: C.terracotta,
  paper: C.paper,
  night: C.night,
  draft: '#1C2229',      // drafting ink ground
  draftLine: '#D9CDB4',  // bone line on drafting ground
};

/** cached sandstone texture with sensible defaults */
export function stone(seed, o = {}) {
  return sandstone(o.w || 1024, o.h || 1024, { seed, ramp: o.ramp || ROCK.navajo, scale: o.scale ?? 0.9, strata: o.strata ?? 1.3, varnish: o.varnish ?? 0.7, crossbed: o.crossbed ?? 0.5, tilt: o.tilt || 0, speckle: o.speckle ?? 1, res: o.res });
}

/** Seeded jagged edge x(y) for a slot wall. side -1 = left wall (edge on its right). */
export function edgeX(y, base, amp, seed, freq = 0.0035) {
  return base + noise.fbm2(y * freq, seed * 7.31, 4) * amp + noise.n2(y * freq * 6, seed * 3.1) * amp * 0.12;
}

/**
 * Slot wall mass between the screen side and a jagged edge.
 * o: { side:-1|1, edge:(y)=>x, y0, y1, tex, texScale, texOff:[x,y], light:0..1 top light,
 *      shade:0..1, rim:'rgba', rimW, glow: bounce colour, tint }
 */
export function wall(ctx, o) {
  const side = o.side ?? -1;
  const y0 = o.y0 ?? -60, y1 = o.y1 ?? H + 60;
  const step = o.step ?? 14;
  const build = (g) => {
    const far = side < 0 ? -400 : W + 400;
    g.moveTo(far, y0);
    for (let y = y0; y <= y1 + 0.1; y += step) g.lineTo(o.edge(y), y);
    g.lineTo(far, y1);
    g.closePath();
  };
  ctx.save();
  ctx.beginPath(); build(ctx);
  ctx.save();
  ctx.clip();
  const pat = ctx.createPattern(o.tex, 'repeat');
  const m = new DOMMatrix();
  m.translateSelf(o.texOff ? o.texOff[0] : 0, o.texOff ? o.texOff[1] : 0);
  m.scaleSelf(o.texScale || 1);
  pat.setTransform(m);
  ctx.fillStyle = pat;
  ctx.fillRect(-500, y0 - 10, W + 1000, y1 - y0 + 20);
  if (o.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.tint; ctx.fillRect(-500, y0 - 10, W + 1000, y1 - y0 + 20); ctx.globalCompositeOperation = 'source-over'; }
  // vertical light: sunlit top → bounce-lit lower → dark base
  const vg = ctx.createLinearGradient(0, y0, 0, y1);
  const L = o.light ?? 0.5;
  vg.addColorStop(0, `rgba(255,214,150,${0.35 * L})`);
  vg.addColorStop(clamp(o.sunLine ?? 0.25), `rgba(255,190,120,${0.12 * L})`);
  vg.addColorStop(clamp((o.sunLine ?? 0.25) + 0.05), 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(20,8,4,${o.base ?? 0.45})`);
  ctx.fillStyle = vg;
  ctx.fillRect(-500, y0 - 10, W + 1000, y1 - y0 + 20);
  if (o.shade) { ctx.fillStyle = `rgba(16,8,5,${o.shade})`; ctx.fillRect(-500, y0 - 10, W + 1000, y1 - y0 + 20); }
  // bounce glow near the edge (light reflecting inside the slot)
  if (o.glow) {
    const [r, gg, b] = hexToRgb(o.glow);
    ctx.globalCompositeOperation = 'screen';
    const ex = o.edge((y0 + y1) / 2);
    const hg = ctx.createLinearGradient(ex, 0, ex - side * (o.glowW ?? 260), 0);
    hg.addColorStop(0, `rgba(${r},${gg},${b},${o.glowA ?? 0.32})`);
    hg.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    ctx.fillStyle = hg;
    ctx.fillRect(-500, y0 - 10, W + 1000, y1 - y0 + 20);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  if (o.rim) {
    ctx.save();
    ctx.beginPath(); build(ctx); ctx.clip();
    ctx.beginPath();
    for (let y = y0; y <= y1 + 0.1; y += step) { const x = o.edge(y); y === y0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = o.rim; ctx.lineWidth = o.rimW ?? 6; ctx.filter = `blur(${o.rimBlur ?? 2}px)`;
    ctx.stroke();
    ctx.restore();
  }
  if (o.line) { ctx.beginPath(); for (let y = y0; y <= y1 + 0.1; y += step) { const x = o.edge(y); y === y0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.strokeStyle = o.line; ctx.lineWidth = o.lineW ?? 2; ctx.stroke(); }
  ctx.restore();
}

/** Arrow with draw-on progress p. o: { color, width, head, p, dash, alpha } */
export function arrow(ctx, x0, y0, x1, y1, o = {}) {
  const p = clamp(o.p ?? 1);
  if (p <= 0) return;
  const x = lerp(x0, x1, p), y = lerp(y0, y1, p);
  const a = Math.atan2(y1 - y0, x1 - x0);
  const hw = o.head ?? 16;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = o.color || K.red; ctx.fillStyle = o.color || K.red;
  ctx.lineWidth = o.width ?? 4; ctx.lineCap = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x - Math.cos(a) * hw * 0.6, y - Math.sin(a) * hw * 0.6); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(a - 0.42) * hw, y - Math.sin(a - 0.42) * hw);
  ctx.lineTo(x - Math.cos(a) * hw * 0.7, y - Math.sin(a) * hw * 0.7);
  ctx.lineTo(x - Math.cos(a + 0.42) * hw, y - Math.sin(a + 0.42) * hw);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Dimension line with end ticks and a centred label. o: { p, color, label, size, family, offset, weight } */
export function dimLine(ctx, x0, y0, x1, y1, o = {}) {
  const p = clamp(o.p ?? 1);
  if (p <= 0) return;
  const col = o.color || K.bone;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const e = ease.outExpo(p);
  const ax = lerp(mx, x0, e), ay = lerp(my, y0, e), bx = lerp(mx, x1, e), by = lerp(my, y1, e);
  const a = Math.atan2(y1 - y0, x1 - x0);
  const nx = -Math.sin(a), ny = Math.cos(a);
  ctx.save();
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = o.width ?? 2;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  const t = o.tick ?? 14;
  for (const [x, y, s] of [[ax, ay, 1], [bx, by, -1]]) {
    ctx.beginPath(); ctx.moveTo(x + nx * t, y + ny * t); ctx.lineTo(x - nx * t, y - ny * t); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 14 * s + nx * 6, y + Math.sin(a) * 14 * s + ny * 6);
    ctx.lineTo(x + Math.cos(a) * 14 * s - nx * 6, y + Math.sin(a) * 14 * s - ny * 6);
    ctx.closePath(); ctx.fill();
  }
  if (o.label) {
    const lp = clamp((p - 0.35) / 0.65);
    const off = o.offset ?? -18;
    ctx.translate(mx + nx * off, my + ny * off);
    let ang = a; if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
    ctx.rotate(o.upright ? 0 : ang);
    maskRise(ctx, o.label, 0, 0, lp, { family: o.family || 'display', size: o.size || 64, weight: o.weight || 800, color: o.labelColor || col, align: 'center', tracking: o.tracking ?? 0.02 });
  }
  ctx.restore();
}

/** Small mono label with a mask-rise entrance and fast exit. */
export function mlabel(ctx, str, x, y, o = {}) {
  const pin = clamp(o.p ?? 1), pout = clamp(o.out ?? 0);
  if (pin <= 0 || pout >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - ease.inQuart(pout);
  maskRise(ctx, str, x, y - ease.inQuart(pout) * 10, pin, { family: o.family || 'mono', size: o.size || 22, weight: o.weight || 600, color: o.color || K.bone, tracking: o.tracking ?? 0.22, align: o.align || 'left', italic: o.italic });
  ctx.restore();
}

/** Leader line from a point to a label; draws on with p. */
export function leader(ctx, x, y, lx, ly, str, o = {}) {
  const p = clamp(o.p ?? 1), out = clamp(o.out ?? 0);
  if (p <= 0 || out >= 1) return;
  const col = o.color || K.bone;
  const e = ease.outCubic(clamp(p * 1.6));
  ctx.save();
  ctx.globalAlpha *= 1 - ease.inQuart(out);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = o.width ?? 1.6;
  ctx.beginPath(); ctx.arc(x, y, (o.dot ?? 5) * e, 0, TAU); ctx.fill();
  if (o.ring) { ctx.beginPath(); ctx.arc(x, y, o.ring * e, 0, TAU); ctx.stroke(); }
  const ex = lerp(x, lx, e), ey = lerp(y, ly, e);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
  const dir = lx >= x ? 1 : -1;
  const tail = (o.tail ?? 50) * clamp(p * 2 - 0.6);
  ctx.lineTo(ex + dir * tail, ey);
  ctx.stroke();
  const lp = clamp((p - 0.45) / 0.55);
  if (lp > 0) maskRise(ctx, str, ex + dir * (tail + 12), ey + (o.size || 22) * 0.36, lp, { family: o.family || 'mono', size: o.size || 22, weight: o.weight || 600, color: col, tracking: o.tracking ?? 0.22, align: dir > 0 ? 'left' : 'right', italic: o.italic });
  ctx.restore();
}

/** Dark textured rock masses closing in from the frame edges (the slot framing device). */
export function slotFrame(ctx, amt, t, o = {}) {
  if (amt <= 0.001) return;
  const tex = o.tex || stone(61, { ramp: o.ramp || ROCK.shade, scale: 1.2, varnish: 0.9 });
  for (const side of [-1, 1]) {
    const base = side < 0 ? amt * (o.left ?? 300) : W - amt * (o.right ?? 300);
    wall(ctx, {
      side, tex, texScale: 1, texOff: [side * 200, 0],
      edge: (y) => edgeX(y + t * (o.drift ?? 0), base, 70 * amt, side < 0 ? 5 : 9),
      light: 0.15, base: 0.8, shade: o.shade ?? 0.45, rim: o.rim ?? 'rgba(255,170,110,0.35)', rimW: 5, step: 18,
    });
  }
}

/**
 * Billowing dust cloud (deterministic). Puffs expand from (cx,cy) after t0.
 * o: { t, t0, n, r0, r1, spread, color, alpha, seed, rise, dur }
 */
export function dustCloud(ctx, o) {
  const t = o.t - (o.t0 ?? 0);
  if (t < 0) return;
  const n = o.n ?? 26;
  const R = rng(o.seed ?? 3);
  const col = hexToRgb(o.color || '#B5643A');
  const dur = o.dur ?? 4;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, sp = (o.spread ?? 700) * (0.35 + R() * 0.65);
    const k = 1 - Math.exp(-t * (o.speed ?? 2.4) * (0.6 + R() * 0.6));
    const x = o.cx + Math.cos(a) * sp * k * (o.sx ?? 1) + noise.n2(i, t * 0.3) * 30;
    const y = o.cy + Math.sin(a) * sp * k * (o.sy ?? 0.55) - (o.rise ?? 40) * t * (0.3 + R());
    const r = lerp(o.r0 ?? 40, o.r1 ?? 260, k) * (0.6 + R() * 0.7);
    const life = clamp(1 - t / (dur * (0.7 + R() * 0.5)));
    const a0 = (o.alpha ?? 0.35) * life * (0.5 + R() * 0.5);
    if (a0 < 0.004) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a0})`);
    g.addColorStop(0.6, `rgba(${col[0]},${col[1]},${col[2]},${a0 * 0.45})`);
    g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** Falling grit / pebbles from (x,y) after t0 (closed-form gravity). */
export function grit(ctx, t, t0, x, y, o = {}) {
  const lt = t - t0;
  if (lt < 0) return;
  const R = rng(o.seed ?? 11);
  const n = o.n ?? 14;
  const g = o.g ?? 1800;
  ctx.save();
  ctx.fillStyle = o.color || '#7A3A1C';
  for (let i = 0; i < n; i++) {
    const d = R() * (o.spreadT ?? 0.8);
    const tt = lt - d;
    if (tt < 0) continue;
    const vx = (R() - 0.5) * (o.vx ?? 160), vy = -R() * (o.vy ?? 60);
    const px = x + (R() - 0.5) * (o.w ?? 30) + vx * tt, py = y + vy * tt + 0.5 * g * tt * tt;
    if (py > (o.floor ?? H + 40)) continue;
    const s = (o.size ?? 3) * (0.4 + R());
    ctx.beginPath(); ctx.ellipse(px, py, s, s * (1 + Math.min(3, tt * 4)), 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** Re-trace the canonical chockstone outline (same params as textures.drawChockstone). */
export function chockPath(ctx, cx, cy, size, rotA = 0, seed = 127) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rotA);
  const m = ctx.getTransform();
  ctx.restore();
  const rx = size * 0.62, ry = size * 0.46;
  const pts = [];
  // replicate rockPath point generation
  const n = 26, rough = 0.12, flat = 0.25;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + noise.fbm2(Math.cos(a) * 1.3 + seed * 3.7, Math.sin(a) * 1.3 + seed, 3) * rough * 2.2 + noise.n2(i * 0.9 + seed * 11, seed) * rough * 0.35;
    let x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    if (y > 0) y = lerp(y, ry * 0.78, flat * clamp(y / ry));
    pts.push([m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  }
  ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  ctx.closePath();
  return pts;
}

/** Canonical chockstone + crisp micro-detail for close-ups (grain, pits, a contact AO). */
export function chock(ctx, cx, cy, size, o = {}) {
  drawChockstone(ctx, cx, cy, size, o);
  if (o.detail === false) return;
  const tex = stone(205, { w: 1024, h: 1024, scale: 0.45, strata: 2.2, varnish: 0.3, speckle: 2.5 });
  ctx.save();
  ctx.beginPath(); chockPath(ctx, cx, cy, size, o.rot || 0); ctx.clip();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = o.detailAlpha ?? 0.45;
  const s = size * 1.4;
  ctx.drawImage(tex, cx - s / 2, cy - s / 2, s, s);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (o.cold) { ctx.fillStyle = 'rgba(40,60,85,0.35)'; ctx.globalCompositeOperation = 'multiply'; ctx.fillRect(cx - size, cy - size, size * 2, size * 2); }
  ctx.restore();
  // crisp outline so it never looks soft against walls
  ctx.save();
  ctx.beginPath(); chockPath(ctx, cx, cy, size, o.rot || 0);
  ctx.strokeStyle = o.outline || 'rgba(30,12,6,0.55)'; ctx.lineWidth = Math.max(1.2, size * 0.004);
  ctx.stroke();
  ctx.restore();
}

/** Sky slit gradient fill (blue = outside world). amt 0..1 saturation, warm rim near top edges. */
export function skyFill(ctx, x0, y0, x1, y1, o = {}) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  const top = o.top || '#4FA6DA', bot = o.bot || '#A9D6EE';
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

/** Paper ground with optional tint (editorial diagram scenes). */
export function paperBg(ctx, base = '#F1E8D8', seed = 0) {
  ctx.drawImage(paper(1920, 1080, { base, seed }), 0, 0);
}

/** Simple vignette pass inside a scene (extra to post). */
export function innerVignette(ctx, a = 0.35, col = '12,6,3') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** Apply a 2D camera {x,y,zoom,rot} (x,y = world point at screen centre). */
export function camApply(ctx, c) {
  ctx.translate(W / 2 + (c.sx || 0), H / 2 + (c.sy || 0));
  if (c.rot) ctx.rotate(c.rot);
  ctx.scale(c.zoom ?? 1, c.zoom ?? 1);
  ctx.translate(-(c.x ?? W / 2), -(c.y ?? H / 2));
}

/** World→screen with the same camera. */
export function camPt(c, x, y) {
  const z = c.zoom ?? 1, r = c.rot || 0;
  let dx = (x - (c.x ?? W / 2)) * z, dy = (y - (c.y ?? H / 2)) * z;
  const cs = Math.cos(r), sn = Math.sin(r);
  return [W / 2 + (c.sx || 0) + dx * cs - dy * sn, H / 2 + (c.sy || 0) + dx * sn + dy * cs];
}

/** Draws a small sun glyph (disc + hairline rays). */
export function sunGlyph(ctx, x, y, r, t, o = {}) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  g.addColorStop(0, 'rgba(255,214,120,0.55)'); g.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  ctx.fillStyle = o.color || K.gold;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = o.color || K.gold; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * TAU + t * 0.2;
    const l0 = r * 1.5, l1 = r * (k % 2 ? 2.0 : 2.4);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * l0, y + Math.sin(a) * l0); ctx.lineTo(x + Math.cos(a) * l1, y + Math.sin(a) * l1); ctx.stroke();
  }
  ctx.restore();
}

/** Motion-blurred copy helper: draws fn several times along a vector (cheap smear). */
export function smear(ctx, n, dx, dy, alpha, fn) {
  for (let i = n - 1; i >= 0; i--) {
    ctx.save();
    ctx.globalAlpha *= i === 0 ? 1 : alpha * (1 - i / n);
    ctx.translate(-dx * i / n, -dy * i / n);
    fn(ctx);
    ctx.restore();
  }
}

export { text, maskRise, measure, rockPath, drawChockstone, sandstone, cached, paper };

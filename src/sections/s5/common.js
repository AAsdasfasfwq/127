// S5 — shared helpers: palette, slot environment, schematic arrows, labels, knife,
// breath vapour, silhouettes. Everything is a pure function of its inputs.
import { clamp, lerp, ease, noise, rng, TAU, seg, mixColor, hexToRgb, rgba } from '../../core/util.js';
import { C, PAL, ROCK } from '../../core/palette.js';
import { text, maskRise, measure, font } from '../../core/text.js';
import { sandstone, rockPath, cached } from '../../core/textures.js';

export const W = 1920, H = 1080;

// ── S5 palette ───────────────────────────────────────────────────────────────
export const P5 = {
  ink: '#3A1C13',          // engraving ink
  inkSoft: '#6A4232',
  paper: '#EFE4CF',
  paperDeep: '#E2D3B6',
  muscle: '#B5655A',
  fat: '#E8D3A2',
  bone: C.bone,
  xbg: PAL.xray.bg,        // #140E0C
  xbone: '#EFE6D4',
  xmid: '#8C7B6A',
  red: C.red,
  sky: C.sky,
  frost: C.frost,
  steel: '#9FB2BE',
  night: C.night,
  dawnTop: '#22374F',
  dawnMid: '#7E9FB8',
  dawnLow: '#F0C9A2',
};

// ── tiny utils ───────────────────────────────────────────────────────────────
export const win = (t, a, b) => clamp((t - a) / (b - a));
/** in/out envelope: rises over [a, a+i], falls over [b-o, b] */
export function env(t, a, b, i = 0.4, o = 0.3, ei = ease.outCubic, eo = ease.inQuad) {
  if (t <= a || t >= b) return 0;
  const up = ei(clamp((t - a) / i));
  const dn = 1 - eo(clamp((t - (b - o)) / o));
  return Math.min(up, dn);
}
export function pathPoly(ctx, pts, close = true) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
export function smoothPath(ctx, pts, close = true) {
  const n = pts.length;
  if (close) {
    ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) { const p = pts[i], q = pts[i + 1]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
}
/** Partial polyline (0..1 of its length) — for lines that draw on. */
export function partialLine(ctx, pts, p) {
  if (p <= 0) return;
  let total = 0;
  const L = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); total += l; }
  let d = clamp(p) * total;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (d >= L[i - 1]) { ctx.lineTo(pts[i][0], pts[i][1]); d -= L[i - 1]; }
    else { const k = L[i - 1] ? d / L[i - 1] : 0; ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); break; }
  }
}
export function lineHead(pts, p) {
  let total = 0; const L = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); total += l; }
  let d = clamp(p) * total;
  for (let i = 1; i < pts.length; i++) {
    if (d <= L[i - 1] || i === pts.length - 1) { const k = L[i - 1] ? clamp(d / L[i - 1]) : 0; return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; }
    d -= L[i - 1];
  }
  const a = pts[pts.length - 1];
  return [a[0], a[1], 0];
}

// ── schematic arrows ─────────────────────────────────────────────────────────
/** Engineering force arrow: shaft + solid head. p draws it on from the tail. */
export function arrow(ctx, x0, y0, x1, y1, o = {}) {
  const p = o.p ?? 1;
  if (p <= 0) return;
  const lw = o.width ?? 6;
  const hl = o.head ?? lw * 4.2;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0) * ease.outCubic(clamp(p));
  const ex = x0 + Math.cos(ang) * len, ey = y0 + Math.sin(ang) * len;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur ?? 18; }
  ctx.strokeStyle = o.color || P5.xbone;
  ctx.fillStyle = o.color || P5.xbone;
  ctx.lineWidth = lw;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(ex - Math.cos(ang) * hl * 0.7, ey - Math.sin(ang) * hl * 0.7);
  ctx.stroke();
  if (len > hl * 0.5) {
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(ang - 0.42) * hl, ey - Math.sin(ang - 0.42) * hl);
    ctx.lineTo(ex - Math.cos(ang) * hl * 0.72, ey - Math.sin(ang) * hl * 0.72);
    ctx.lineTo(ex - Math.cos(ang + 0.42) * hl, ey - Math.sin(ang + 0.42) * hl);
    ctx.closePath();
    ctx.fill();
  }
  if (o.tail) { ctx.beginPath(); ctx.arc(x0, y0, lw * 1.1, 0, TAU); ctx.fill(); }
  ctx.restore();
}
/** Curved (torque) arrow along a polyline of screen points. */
export function polyArrow(ctx, pts, o = {}) {
  const p = o.p ?? 1;
  if (p <= 0 || pts.length < 2) return;
  const lw = o.width ?? 5;
  const hl = o.head ?? lw * 4.4;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur ?? 16; }
  ctx.strokeStyle = o.color || P5.xbone;
  ctx.fillStyle = o.color || P5.xbone;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath();
  partialLine(ctx, pts, p);
  ctx.stroke();
  ctx.setLineDash([]);
  const [hx, hy, ha] = lineHead(pts, p);
  if (p > 0.08) {
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ha) * hl * 0.35, hy + Math.sin(ha) * hl * 0.35);
    ctx.lineTo(hx - Math.cos(ha - 0.45) * hl, hy - Math.sin(ha - 0.45) * hl);
    ctx.lineTo(hx - Math.cos(ha) * hl * 0.45, hy - Math.sin(ha) * hl * 0.45);
    ctx.lineTo(hx - Math.cos(ha + 0.45) * hl, hy - Math.sin(ha + 0.45) * hl);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
export function arcPts(cx, cy, r, a0, a1, n = 48, ry = r) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * ry]); }
  return pts;
}
/** Fulcrum marker: hatched triangle (engineering pivot symbol). */
export function fulcrum(ctx, x, y, s, o = {}) {
  const p = o.p ?? 1;
  if (p <= 0) return;
  const e = ease.outExpo(clamp(p));
  ctx.save();
  ctx.globalAlpha *= (o.alpha ?? 1) * clamp(p * 3);
  ctx.translate(x, y);
  ctx.scale(e, e);
  ctx.strokeStyle = o.color || P5.xbone;
  ctx.lineWidth = o.width ?? 3;
  ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * 0.6, s); ctx.lineTo(s * 0.6, s); ctx.closePath();
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  ctx.stroke();
  // ground hatch
  ctx.beginPath(); ctx.moveTo(-s * 0.95, s); ctx.lineTo(s * 0.95, s); ctx.stroke();
  ctx.lineWidth = Math.max(1, (o.width ?? 3) * 0.6);
  for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * s * 0.2, s); ctx.lineTo(k * s * 0.2 - s * 0.18, s * 1.25); ctx.stroke(); }
  ctx.restore();
}
/** Dimension line with end ticks and an optional centred label. */
export function dimension(ctx, x0, y0, x1, y1, o = {}) {
  const p = o.p ?? 1;
  if (p <= 0) return;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const e = ease.outCubic(clamp(p));
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const ax = lerp(mx, x0, e), ay = lerp(my, y0, e), bx = lerp(mx, x1, e), by = lerp(my, y1, e);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = o.color || P5.xbone;
  ctx.fillStyle = o.color || P5.xbone;
  ctx.lineWidth = o.width ?? 2;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  const tk = o.tick ?? 14;
  for (const [x, y] of [[ax, ay], [bx, by]]) {
    ctx.beginPath(); ctx.moveTo(x + nx * tk, y + ny * tk); ctx.lineTo(x - nx * tk, y - ny * tk); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - Math.cos(ang + 0.8) * 9, y - Math.sin(ang + 0.8) * 9); ctx.lineTo(x + Math.cos(ang + 0.8) * 9, y + Math.sin(ang + 0.8) * 9); ctx.stroke();
  }
  if (o.label && p > 0.5) {
    ctx.save();
    ctx.translate(mx + nx * (o.labelOff ?? -26), my + ny * (o.labelOff ?? -26));
    let a = ang; if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;
    ctx.rotate(a);
    text(ctx, o.label, 0, 0, { family: o.family || 'serif', italic: o.italic ?? true, size: o.size ?? 44, color: o.color || P5.xbone, align: 'center', baseline: 'middle', alpha: clamp((p - 0.5) * 3) });
    ctx.restore();
  }
  ctx.restore();
}

// ── labels ───────────────────────────────────────────────────────────────────
/**
 * Leader-line label: dot at (x,y), elbow to (x+dx, y+dy), mono caps rising out of a mask.
 * p 0..1 entrance, q 0..1 exit (exits faster, slides and fades).
 */
export function label(ctx, x, y, str, o = {}) {
  const p = clamp(o.p ?? 1), q = clamp(o.q ?? 0);
  if (p <= 0 || q >= 1) return;
  const dx = o.dx ?? 120, dy = o.dy ?? -80;
  const col = o.color || P5.xbone;
  const size = o.size ?? 36;
  const e = ease.outCubic(clamp(p * 1.6));
  const qa = 1 - ease.inQuad(q);
  ctx.save();
  ctx.globalAlpha *= qa * (o.alpha ?? 1);
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineWidth = o.width ?? 2;
  if (o.dot !== false) { ctx.beginPath(); ctx.arc(x, y, (o.dotR ?? 6) * ease.outBack(clamp(p * 2.2), 2), 0, TAU); ctx.fill(); }
  const ex = x + dx * e, ey = y + dy * e;
  const side = dx >= 0 ? 1 : -1;
  const run = (o.run ?? 46) * clamp(p * 2 - 0.6);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(ex + side * run, ey); ctx.stroke();
  const lp = clamp((p - 0.35) / 0.65);
  if (lp > 0) {
    const tx = ex + side * (run + 14) + (o.shift ?? 0) * q * side;
    maskRise(ctx, str, tx, ey + size * 0.36, lp, { family: o.family || 'mono', size, weight: o.weight ?? 600, color: col, tracking: o.tracking ?? 0.14, align: side > 0 ? 'left' : 'right' });
    if (o.sub) text(ctx, o.sub, tx, ey + size * 0.36 + size * 1.05, { family: 'serif', italic: true, size: size * 0.95, color: col, alpha: lp * 0.75, align: side > 0 ? 'left' : 'right' });
  }
  ctx.restore();
}

// ── slot canyon environment ──────────────────────────────────────────────────
/** Jagged vertical slit between y0..y1, centred at x, width w(y) via fn, closing at ends if taper. */
export function slitShape(ctx, x, wfn, y0, y1, seed = 8, jag = 30) {
  const steps = 48;
  const L = [], R = [];
  for (let i = 0; i <= steps; i++) {
    const y = lerp(y0, y1, i / steps);
    const w = wfn(y) * (1 + noise.fbm2(y * 0.004, seed, 3) * 0.5);
    const cx = x + noise.fbm2(y * 0.0025, seed + 3, 3) * jag * 2;
    L.push([cx - w / 2 + noise.fbm2(y * 0.012, seed + 5, 3) * jag, y]);
    R.push([cx + w / 2 + noise.fbm2(y * 0.012, seed + 9, 3) * jag, y]);
  }
  ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L) ctx.lineTo(p[0], p[1]);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
}

export function wallTex(seed, ramp = ROCK.cold, w = 1024, h = 1024) {
  return sandstone(w, h, { seed, ramp, scale: 0.9, strata: 1.3, varnish: 0.7, crossbed: 0.6, tilt: 0.06 });
}

/**
 * Fill everything EXCEPT the slit with textured wall, lit from the slit.
 * o: { tex, x, wfn, y0, y1, seed, jag, shade(0..1), glow:'rgba', rim:'rgba', rimW, warmTop:{col, a, h} }
 */
export function slitWall(ctx, o) {
  const tex = o.tex;
  ctx.save();
  ctx.beginPath();
  ctx.rect(o.bx ?? -1200, o.by ?? -2400, o.bw ?? 4320, o.bh ?? 6000);
  slitShape(ctx, o.x, o.wfn, o.y0, o.y1, o.seed, o.jag);
  ctx.clip('evenodd');
  const pat = ctx.createPattern(tex, 'repeat');
  const m = new DOMMatrix(); m.translateSelf(o.texOff?.[0] ?? 0, o.texOff?.[1] ?? 0); m.scaleSelf(o.texScale ?? 1);
  pat.setTransform(m);
  ctx.fillStyle = pat;
  ctx.fillRect(o.bx ?? -1200, o.by ?? -2400, o.bw ?? 4320, o.bh ?? 6000);
  // darkness away from the slit (light comes from the slit)
  const g = ctx.createLinearGradient(o.x - 1100, 0, o.x + 1100, 0);
  const sh = o.shade ?? 0.6;
  g.addColorStop(0, `rgba(8,10,14,${sh})`);
  g.addColorStop(0.36, `rgba(8,10,14,${sh * 0.35})`);
  g.addColorStop(0.5, 'rgba(8,10,14,0)');
  g.addColorStop(0.64, `rgba(8,10,14,${sh * 0.35})`);
  g.addColorStop(1, `rgba(8,10,14,${sh})`);
  ctx.fillStyle = g;
  ctx.fillRect(o.bx ?? -1200, o.by ?? -2400, o.bw ?? 4320, o.bh ?? 6000);
  if (o.vert) { ctx.fillStyle = o.vert(ctx); ctx.fillRect(o.bx ?? -1200, o.by ?? -2400, o.bw ?? 4320, o.bh ?? 6000); }
  if (o.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.tint; ctx.fillRect(o.bx ?? -1200, o.by ?? -2400, o.bw ?? 4320, o.bh ?? 6000); ctx.globalCompositeOperation = 'source-over'; }
  // rim light hugging the slit edge (inside the wall)
  if (o.rim) {
    ctx.beginPath();
    slitShape(ctx, o.x, o.wfn, o.y0, o.y1, o.seed, o.jag);
    ctx.strokeStyle = o.rim;
    ctx.lineWidth = o.rimW ?? 14;
    ctx.filter = `blur(${o.rimBlur ?? 5}px)`;
    ctx.stroke();
    ctx.filter = 'none';
    ctx.lineWidth = 2;
    ctx.strokeStyle = o.rimLine || o.rim;
    ctx.stroke();
  }
  ctx.restore();
}

// ── breath vapour ────────────────────────────────────────────────────────────
/** Breath plume born at t0 from (x,y), drifting along dir. Pure function of t. */
export function vapour(ctx, t, t0, x, y, o = {}) {
  const lt = t - t0;
  const life = o.life ?? 2.2;
  if (lt <= 0 || lt > life) return;
  const r = rng(o.seed ?? 3);
  const n = o.count ?? 14;
  const dir = o.dir ?? [-1, -0.25];
  const sc = o.scale ?? 1;
  ctx.save();
  ctx.filter = `blur(${(o.blur ?? 10) * sc}px)`;
  for (let i = 0; i < n; i++) {
    const delay = r() * 0.35;
    const l = lt - delay;
    if (l <= 0) continue;
    const k = l / (life - delay);
    if (k >= 1) continue;
    const sp = (70 + r() * 90) * sc;
    const spread = (r() - 0.5) * 0.9;
    const d = sp * (1 - Math.exp(-l * 1.8)) * 1.4;
    const px = x + (dir[0] + spread * -dir[1]) * d + noise.n2(i * 3.1, l * 0.8) * 14 * sc;
    const py = y + (dir[1] + spread * dir[0]) * d - l * 12 * sc + noise.n2(i * 1.7 + 9, l * 0.8) * 10 * sc;
    const rad = (10 + r() * 14 + l * 34) * sc;
    const a = (o.alpha ?? 0.22) * Math.sin(Math.PI * Math.min(1, k * 1.25)) * (1 - k);
    ctx.fillStyle = `rgba(225,236,244,${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ── silhouette with rim light (character → shadow figure) ─────────────────────
/**
 * Turn whatever is drawn by `draw(ctx)` into a dark silhouette with a rim on the lit side.
 * Uses two temp canvases. light = [dx, dy] direction FROM which light comes (screen px offset).
 */
export function silhouette(ctx, tmp, draw, o = {}) {
  const a = tmp();
  draw(a.ctx);
  const b = tmp();
  // rim: full shape in rim colour, minus shape shifted toward the light
  b.ctx.drawImage(a.canvas, 0, 0);
  b.ctx.globalCompositeOperation = 'source-in';
  b.ctx.fillStyle = o.rim || 'rgba(190,215,235,1)';
  b.ctx.fillRect(0, 0, W, H);
  b.ctx.globalCompositeOperation = 'destination-out';
  const [lx, ly] = o.light || [-6, -6];
  b.ctx.drawImage(a.canvas, -lx, -ly);
  b.ctx.globalCompositeOperation = 'source-over';
  // body
  a.ctx.globalCompositeOperation = 'source-in';
  a.ctx.fillStyle = o.fill || '#0D0B0B';
  a.ctx.fillRect(0, 0, W, H);
  a.ctx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.drawImage(a.canvas, 0, 0);
  ctx.globalAlpha *= o.rimAlpha ?? 0.9;
  if (o.rimBlur) ctx.filter = `blur(${o.rimBlur}px)`;
  ctx.drawImage(b.canvas, 0, 0);
  ctx.restore();
}

// ── the multi-tool knife (real object) ───────────────────────────────────────
/**
 * The cheap multi-tool, blade open. Pivot at (x,y), blade points along `ang`, blade length L.
 * o: { light: angle light comes FROM, shadow: {dx,dy,blur,alpha}, handle: true, edgeGlint 0..1,
 *      nicks: true, cold: false, ghost: false }
 */
export function knife(ctx, x, y, ang, L, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const h = L * 0.27;
  const bladePath = (g) => {
    g.moveTo(-L * 0.06, -h * 0.5);
    g.lineTo(L * 0.62, -h * 0.5);
    g.quadraticCurveTo(L * 0.86, -h * 0.42, L, -h * 0.05); // clip point
    g.quadraticCurveTo(L * 0.8, h * 0.42, L * 0.45, h * 0.5);
    g.lineTo(-L * 0.06, h * 0.5);
    g.closePath();
  };
  const handlePath = (g) => {
    g.moveTo(-L * 0.02, -h * 0.62);
    g.lineTo(-L * 1.55, -h * 0.66);
    g.quadraticCurveTo(-L * 1.72, -h * 0.6, -L * 1.72, 0);
    g.quadraticCurveTo(-L * 1.72, h * 0.66, -L * 1.55, h * 0.7);
    g.lineTo(-L * 0.02, h * 0.66);
    g.quadraticCurveTo(L * 0.06, 0, -L * 0.02, -h * 0.62);
    g.closePath();
  };
  if (o.shadow !== false) {
    const s = o.shadow || {};
    ctx.save();
    ctx.translate(s.dx ?? 14, s.dy ?? 22);
    ctx.filter = `blur(${s.blur ?? 10}px)`;
    ctx.fillStyle = `rgba(40,22,12,${s.alpha ?? 0.35})`;
    ctx.beginPath(); bladePath(ctx); ctx.fill();
    if (o.handle !== false) { ctx.beginPath(); handlePath(ctx); ctx.fill(); }
    ctx.restore();
  }
  // handle: stamped steel channel + dark scales
  if (o.handle !== false) {
    ctx.save();
    ctx.beginPath(); handlePath(ctx);
    const hg = ctx.createLinearGradient(0, -h * 0.7, 0, h * 0.7);
    hg.addColorStop(0, '#4A4C50'); hg.addColorStop(0.45, '#2A2B2E'); hg.addColorStop(1, '#151517');
    ctx.fillStyle = hg; ctx.fill();
    ctx.clip();
    // scale texture (fine diagonal knurl)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let k = -40; k < 40; k++) { ctx.beginPath(); ctx.moveTo(-L * 1.8 + k * L * 0.05, -h); ctx.lineTo(-L * 1.8 + k * L * 0.05 + h * 1.2, h); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(-L * 1.7, -h * 0.62, L * 1.7, h * 0.14);
    ctx.restore();
    ctx.strokeStyle = 'rgba(10,8,8,0.8)'; ctx.lineWidth = Math.max(1, L * 0.008);
    ctx.beginPath(); handlePath(ctx); ctx.stroke();
    // rivets
    for (const rx of [-L * 0.12, -L * 1.45]) {
      const rg = ctx.createRadialGradient(rx - h * 0.04, -h * 0.04, 1, rx, 0, h * 0.13);
      rg.addColorStop(0, '#D9DDE0'); rg.addColorStop(1, '#5D6064');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(rx, 0, h * 0.12, 0, TAU); ctx.fill();
    }
  }
  // blade
  ctx.save();
  ctx.beginPath(); bladePath(ctx);
  const bg = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
  if (o.cold) { bg.addColorStop(0, '#C9D4DC'); bg.addColorStop(0.5, '#8A98A3'); bg.addColorStop(1, '#5A6670'); }
  else { bg.addColorStop(0, '#D8D6D0'); bg.addColorStop(0.42, '#A7A49D'); bg.addColorStop(0.62, '#7B7973'); bg.addColorStop(1, '#C5C2BA'); }
  ctx.fillStyle = bg; ctx.fill();
  ctx.clip();
  // grind bevel along the edge
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.moveTo(-L * 0.06, h * 0.18); ctx.lineTo(L * 0.5, h * 0.18); ctx.quadraticCurveTo(L * 0.82, h * 0.12, L, -h * 0.05); ctx.lineTo(L, h); ctx.lineTo(-L * 0.06, h); ctx.closePath(); ctx.fill();
  // brushed scratches
  const r = rng(o.seed ?? 31);
  ctx.strokeStyle = 'rgba(40,36,30,0.18)'; ctx.lineWidth = 0.8;
  for (let k = 0; k < 26; k++) { const yy = (r() - 0.5) * h; const xx = r() * L * 0.8; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + L * (0.05 + r() * 0.2), yy + (r() - 0.5) * 3); ctx.stroke(); }
  // rust freckles (cheap steel)
  for (let k = 0; k < 9; k++) { ctx.fillStyle = `rgba(140,70,30,${0.15 + r() * 0.2})`; ctx.beginPath(); ctx.arc(r() * L * 0.7, (r() - 0.3) * h * 0.6, 1 + r() * 2.4, 0, TAU); ctx.fill(); }
  // nail nick
  ctx.strokeStyle = 'rgba(30,28,24,0.5)'; ctx.lineWidth = Math.max(1, L * 0.012);
  ctx.beginPath(); ctx.arc(L * 0.16, -h * 0.28, h * 0.12, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  ctx.restore();
  // edge: rolled / nicked (dull)
  ctx.save();
  ctx.strokeStyle = 'rgba(30,28,25,0.75)'; ctx.lineWidth = Math.max(1, L * 0.01);
  ctx.beginPath(); bladePath(ctx); ctx.stroke();
  if (o.nicks !== false) {
    ctx.fillStyle = 'rgba(30,28,25,0.9)';
    for (const [u, s] of [[0.12, 0.012], [0.27, 0.02], [0.36, 0.01], [0.52, 0.016], [0.66, 0.012]]) {
      const ex = L * u, ey = h * 0.5 - (u > 0.45 ? (u - 0.45) * h * 0.5 : 0);
      ctx.beginPath(); ctx.moveTo(ex - L * s, ey); ctx.lineTo(ex, ey - L * s * 0.9); ctx.lineTo(ex + L * s * 0.8, ey); ctx.closePath(); ctx.fill();
    }
  }
  const gl = o.edgeGlint ?? 0;
  if (gl > 0) {
    ctx.strokeStyle = `rgba(255,245,225,${0.9 * gl})`;
    ctx.lineWidth = Math.max(1.5, L * 0.012);
    ctx.shadowColor = 'rgba(255,230,190,0.9)'; ctx.shadowBlur = 12 * gl;
    ctx.beginPath(); ctx.moveTo(-L * 0.04, h * 0.49); ctx.lineTo(L * 0.45, h * 0.49); ctx.quadraticCurveTo(L * 0.8, h * 0.42, L, -h * 0.05); ctx.stroke();
  }
  ctx.restore();
  // pivot boss
  const pg = ctx.createRadialGradient(-h * 0.05, -h * 0.05, 1, 0, 0, h * 0.24);
  pg.addColorStop(0, '#E8EAEC'); pg.addColorStop(1, '#55585C');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, h * 0.22, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(20,20,20,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

// ── chockstone outline (canonical silhouette for engraving / x-ray) ─────────────
export function chockOutline(ctx, cx, cy, size, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  const rx = size * 0.62, ry = size * 0.46;
  const pts = rockPath(ctx, 0, 0, rx, ry, { seed: 127, rough: 0.12, points: 26, flatBottom: 0.25 });
  ctx.restore();
  return pts;
}

export { clamp, lerp, ease, noise, rng, TAU, seg, mixColor, hexToRgb, rgba, C, PAL, ROCK, text, maskRise, measure, font };

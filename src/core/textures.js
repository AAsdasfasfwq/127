// ─────────────────────────────────────────────────────────────────────────────
// textures.js — procedural materials so NOTHING is a flat primitive.
// All generators are seeded + cached by key. Generate at init, reuse every frame.
//   paper()      warm paper with fibres & mottling (editorial / collage scenes)
//   sandstone()  layered Navajo sandstone with strata, cross-bedding, desert varnish
//   rockPath()   organic boulder / rock outline
//   drawChockstone()  THE boulder (canonical design, used by every section)
//   drawRockMass()    shaded textured rock silhouette (canyon walls, ledges)
//   dust()       deterministic floating dust motes with depth
//   godRays()    light shafts
//   softShadow() contact shadow ellipse
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, rng, noise, makeNoise, hexToRgb, mixColor, TAU, fract } from './util.js';
import { ROCK } from './palette.js';

const cache = new Map();
function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}
export function cached(key, build) {
  if (cache.has(key)) return cache.get(key);
  const v = build();
  cache.set(key, v);
  return v;
}

function rampSample(ramp, t) {
  t = clamp(t) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(t));
  const f = t - i;
  const a = ramp[i], b = ramp[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Warm paper. opts: { base:'#F1E8D8', seed, fibre:0..1, mottling:0..1 } */
export function paper(w = 1920, h = 1080, o = {}) {
  const key = `paper:${w}x${h}:${o.base || ''}:${o.seed || 0}:${o.fibre ?? 1}:${o.mottling ?? 1}`;
  return cached(key, () => {
    const c = mk(w, h);
    const g = c.getContext('2d');
    const sw = Math.ceil(w / 2), sh = Math.ceil(h / 2);
    const s = mk(sw, sh);
    const sg = s.getContext('2d');
    const img = sg.createImageData(sw, sh);
    const [br, bgc, bb] = hexToRgb(o.base || '#F1E8D8');
    const N = makeNoise((o.seed || 0) + 91);
    const r = rng((o.seed || 0) + 5);
    const mot = o.mottling ?? 1;
    for (let y = 0; y < sh; y++)
      for (let x = 0; x < sw; x++) {
        const m = N.fbm2(x * 0.006, y * 0.006, 4) * 10 * mot;
        const fine = (r() - 0.5) * 9;
        const v = m + fine;
        const i = (y * sw + x) * 4;
        img.data[i] = br + v; img.data[i + 1] = bgc + v * 0.95; img.data[i + 2] = bb + v * 0.85; img.data[i + 3] = 255;
      }
    sg.putImageData(img, 0, 0);
    g.imageSmoothingQuality = 'high';
    g.drawImage(s, 0, 0, w, h);
    // fibres
    const nf = Math.round((w * h) / 2600 * (o.fibre ?? 1));
    g.lineCap = 'round';
    for (let k = 0; k < nf; k++) {
      const x = r() * w, y = r() * h, len = 4 + r() * 18, a = r() * TAU;
      g.strokeStyle = r() < 0.5 ? 'rgba(120,90,60,0.07)' : 'rgba(255,255,255,0.10)';
      g.lineWidth = 0.6 + r() * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.6) * len * 0.5, y + Math.sin(a + 0.6) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
    return c;
  });
}

/**
 * Navajo sandstone. opts: { seed, ramp: ROCK.navajo | array of hex, scale:1, strata:1,
 *   varnish:0..1, crossbed:0..1, tilt: radians, speckle:0..1 }
 * Rendered at half resolution then upscaled (it is a texture, not a hero line).
 */
export function sandstone(w = 1024, h = 1024, o = {}) {
  const rampHex = o.ramp || ROCK.navajo;
  const key = `sand:${w}x${h}:${rampHex.join('')}:${o.seed || 0}:${o.scale || 1}:${o.strata ?? 1}:${o.varnish ?? 0.6}:${o.crossbed ?? 0.5}:${o.tilt || 0}`;
  return cached(key, () => {
    const ramp = rampHex.map(hexToRgb);
    const res = o.res || 0.5;
    const sw = Math.ceil(w * res), sh = Math.ceil(h * res);
    const s = mk(sw, sh);
    const sg = s.getContext('2d');
    const img = sg.createImageData(sw, sh);
    const N = makeNoise((o.seed || 0) * 13 + 7);
    const sc = (o.scale || 1) / res;
    const strata = o.strata ?? 1;
    const varn = o.varnish ?? 0.6;
    const cb = o.crossbed ?? 0.5;
    const tilt = o.tilt || 0;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const r = rng((o.seed || 0) + 3);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const X = (x * ct - y * st) / sc, Y = (x * st + y * ct) / sc;
        const warp = N.fbm2(X * 0.004, Y * 0.004, 3) * 60;
        // strata bands
        const band = Y * 0.035 * strata + warp * 0.05;
        const bandV = Math.sin(band) * 0.5 + 0.5;
        const fine = Math.sin(Y * 0.22 * strata + warp * 0.18 + N.n2(X * 0.01, Y * 0.02) * 2) * 0.5 + 0.5;
        // cross-bedding: diagonal fine lines inside thick beds
        const cross = Math.sin((X * 0.7 + Y) * 0.09 + N.n2(X * 0.003, Y * 0.01) * 4) * 0.5 + 0.5;
        const big = N.fbm2(X * 0.0018, Y * 0.0025, 4) * 0.5 + 0.5;
        let v = big * 0.5 + bandV * 0.22 + fine * 0.12 + cross * 0.1 * cb;
        // grit
        v += (N.n2(X * 0.6, Y * 0.6) * 0.04) + (r() - 0.5) * 0.05;
        let col = rampSample(ramp, clamp(v * 1.05 - 0.05));
        // desert varnish: dark vertical streaks hanging from ledges
        if (varn > 0) {
          const streak = N.n2(X * 0.025, 3.3) * 0.5 + 0.5;
          const drip = clamp((streak - 0.62) * 3.2) * clamp(N.fbm2(X * 0.02, Y * 0.0035, 3) * 0.8 + 0.6);
          const k = drip * varn * 0.55;
          col = [col[0] * (1 - k) + 34 * k, col[1] * (1 - k) + 22 * k, col[2] * (1 - k) + 18 * k];
        }
        const i = (y * sw + x) * 4;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
    }
    sg.putImageData(img, 0, 0);
    const c = mk(w, h);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(s, 0, 0, w, h);
    // speckles / pits for tactile grain
    const sp = Math.round((w * h) / 900 * (o.speckle ?? 1));
    for (let k = 0; k < sp; k++) {
      const x = r() * w, y = r() * h, rr = 0.6 + r() * 1.8;
      g.fillStyle = r() < 0.6 ? 'rgba(40,18,10,0.22)' : 'rgba(255,230,190,0.18)';
      g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
    return c;
  });
}

/** Organic rock outline. Builds a closed smooth path around (cx,cy). */
export function rockPath(ctx, cx, cy, rx, ry = rx, o = {}) {
  const n = o.points || 22;
  const seed = o.seed || 1;
  const rough = o.rough ?? 0.18;
  const flat = o.flatBottom ?? 0; // 0..1 flatten lower side (resting rock)
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (o.rot || 0);
    const k = 1 + noise.fbm2(Math.cos(a) * 1.3 + seed * 3.7, Math.sin(a) * 1.3 + seed, 3) * rough * 2.2
      + noise.n2(i * 0.9 + seed * 11, seed) * rough * 0.35;
    let x = cx + Math.cos(a) * rx * k;
    let y = cy + Math.sin(a) * ry * k;
    if (flat > 0 && y > cy) y = lerp(y, cy + ry * 0.78, flat * clamp((y - cy) / ry));
    pts.push([x, y]);
  }
  ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
  return pts;
}

/**
 * THE CHOCKSTONE — canonical boulder design (all sections use this so it reads as
 * one character). Ovoid wedge, darker desert-varnish cap, two diagonal strata bands,
 * a pale scar where it broke loose, and a lichen spot (its "eye", for recognisability).
 * opts: { seed:127, rot, light: angle(rad, where light comes FROM), palette: ROCK.*,
 *         rim:'rgba(...)', shadow:true, scar:true, cold:false }
 */
export function drawChockstone(ctx, cx, cy, size, o = {}) {
  const seed = o.seed ?? 127;
  const ramp = o.palette || (o.cold ? ROCK.cold : ROCK.navajo);
  const tex = sandstone(512, 512, { seed: seed + 1, ramp, scale: 0.55, strata: 1.6, varnish: 0.8, crossbed: 0.7, tilt: 0.5 });
  const light = o.light ?? -2.3;
  const rx = size * 0.62, ry = size * 0.46;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(o.rot || 0);
  if (o.shadow !== false) {
    ctx.save();
    ctx.filter = `blur(${(size * 0.05).toFixed(1)}px)`;
    ctx.fillStyle = 'rgba(15,6,3,0.45)';
    ctx.beginPath();
    ctx.ellipse(size * 0.06, ry * 0.95, rx * 0.95, ry * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  rockPath(ctx, 0, 0, rx, ry, { seed, rough: 0.12, points: 26, flatBottom: 0.25 });
  ctx.save();
  ctx.clip();
  // texture
  ctx.drawImage(tex, -rx * 1.3, -ry * 1.5, rx * 2.6, ry * 3);
  // two diagonal strata bands (signature)
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(120,50,25,0.35)';
  ctx.beginPath();
  ctx.moveTo(-rx * 1.2, -ry * 0.05); ctx.lineTo(rx * 1.2, -ry * 0.45); ctx.lineTo(rx * 1.2, -ry * 0.28); ctx.lineTo(-rx * 1.2, ry * 0.12);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-rx * 1.2, ry * 0.35); ctx.lineTo(rx * 1.2, -ry * 0.02); ctx.lineTo(rx * 1.2, ry * 0.08); ctx.lineTo(-rx * 1.2, ry * 0.45);
  ctx.closePath(); ctx.fill();
  // varnish cap
  const cap = ctx.createLinearGradient(0, -ry, 0, ry * 0.2);
  cap.addColorStop(0, 'rgba(30,14,10,0.75)');
  cap.addColorStop(1, 'rgba(30,14,10,0)');
  ctx.fillStyle = cap;
  ctx.fillRect(-rx * 1.5, -ry * 1.5, rx * 3, ry * 1.8);
  ctx.globalCompositeOperation = 'source-over';
  // volume shading (light direction)
  const lx = Math.cos(light) * rx * 0.7, ly = Math.sin(light) * ry * 0.7;
  const sh = ctx.createRadialGradient(lx, ly, size * 0.05, lx * 0.2, ly * 0.2, size * 0.95);
  sh.addColorStop(0, 'rgba(255,225,180,0.30)');
  sh.addColorStop(0.45, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(10,4,2,0.78)');
  ctx.fillStyle = sh;
  ctx.fillRect(-rx * 1.5, -ry * 1.5, rx * 3, ry * 3);
  // scar (pale break surface)
  if (o.scar !== false) {
    ctx.fillStyle = 'rgba(245,205,160,0.55)';
    ctx.beginPath();
    rockPath(ctx, rx * 0.38, -ry * 0.18, rx * 0.2, ry * 0.15, { seed: seed + 9, rough: 0.3, points: 12 });
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,30,15,0.5)';
    ctx.lineWidth = Math.max(1, size * 0.006);
    ctx.stroke();
  }
  // lichen spot (recognisable mark)
  const lr = rng(seed + 44);
  for (let i = 0; i < 26; i++) {
    const a = lr() * TAU, d = Math.sqrt(lr()) * size * 0.05;
    ctx.fillStyle = i % 3 ? 'rgba(170,180,120,0.75)' : 'rgba(215,205,140,0.8)';
    ctx.beginPath();
    ctx.arc(-rx * 0.42 + Math.cos(a) * d, -ry * 0.32 + Math.sin(a) * d * 0.7, size * (0.006 + lr() * 0.01), 0, TAU);
    ctx.fill();
  }
  // cracks
  ctx.strokeStyle = 'rgba(35,15,8,0.55)';
  ctx.lineWidth = Math.max(1, size * 0.005);
  ctx.beginPath();
  ctx.moveTo(-rx * 0.1, -ry * 0.9); ctx.quadraticCurveTo(-rx * 0.02, -ry * 0.4, -rx * 0.18, ry * 0.05);
  ctx.moveTo(rx * 0.55, ry * 0.2); ctx.quadraticCurveTo(rx * 0.3, ry * 0.45, rx * 0.4, ry * 0.85);
  ctx.stroke();
  ctx.restore();
  // rim light
  ctx.beginPath();
  rockPath(ctx, 0, 0, rx, ry, { seed, rough: 0.12, points: 26, flatBottom: 0.25 });
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = o.rim || 'rgba(255,205,150,0.55)';
  ctx.lineWidth = size * 0.035;
  ctx.filter = `blur(${(size * 0.012).toFixed(1)}px)`;
  ctx.translate(-Math.cos(light) * size * 0.02, -Math.sin(light) * size * 0.02);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/**
 * Textured rock mass (canyon wall, ledge, cliff) from an arbitrary closed polygon.
 * opts: { tex (canvas), light: angle, shade: 0..1, rim: color|null, edgeDark: 0..1 }
 */
export function drawRockMass(ctx, buildPath, o = {}) {
  const tex = o.tex || sandstone(1024, 1024, { seed: o.seed || 2 });
  ctx.save();
  ctx.beginPath();
  buildPath(ctx);
  ctx.save();
  ctx.clip();
  const pat = ctx.createPattern(tex, 'repeat');
  if (o.texOffset) { const m = new DOMMatrix(); m.translateSelf(o.texOffset[0], o.texOffset[1]); m.scaleSelf(o.texScale || 1); pat.setTransform(m); }
  else if (o.texScale) { const m = new DOMMatrix(); m.scaleSelf(o.texScale); pat.setTransform(m); }
  ctx.fillStyle = pat;
  ctx.fillRect(-4000, -4000, 8000, 8000);
  if (o.shade) {
    ctx.fillStyle = `rgba(15,6,3,${o.shade})`;
    ctx.fillRect(-4000, -4000, 8000, 8000);
  }
  if (o.tint) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = o.tint;
    ctx.fillRect(-4000, -4000, 8000, 8000);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (o.gradient) { ctx.fillStyle = o.gradient(ctx); ctx.fillRect(-4000, -4000, 8000, 8000); }
  ctx.restore();
  if (o.rim) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = o.rim;
    ctx.lineWidth = o.rimWidth || 10;
    ctx.filter = 'blur(3px)';
    ctx.stroke();
    ctx.restore();
  }
  if (o.outline) { ctx.strokeStyle = o.outline; ctx.lineWidth = o.outlineWidth || 2; ctx.stroke(); }
  ctx.restore();
}

/**
 * Deterministic dust motes with depth. Closed-form motion: position = f(t).
 * opts: { count, seed, color:'#rgb', area:[x,y,w,h], wind:[vx,vy] px/s, size:[min,max],
 *         depthBlur:true, alpha:0..1, swirl }
 */
export function dust(ctx, t, o = {}) {
  const n = o.count ?? 60;
  const r = rng(o.seed ?? 9);
  const [ax, ay, aw, ah] = o.area || [0, 0, 1920, 1080];
  const [wx, wy] = o.wind || [14, -4];
  const [s0, s1] = o.size || [1, 4.5];
  const col = hexToRgb(o.color || '#F3D2A2');
  ctx.save();
  for (let i = 0; i < n; i++) {
    const z = r();             // depth 0 far → 1 near
    const bx = r() * aw, by = r() * ah, ph = r() * TAU, sp = 0.4 + r() * 0.8;
    const sz = lerp(s0, s1, z * z);
    const x = ax + ((bx + wx * t * sp * (0.4 + z) + Math.sin(t * 0.7 * sp + ph) * 20 * (o.swirl ?? 1)) % aw + aw) % aw;
    const y = ay + ((by + wy * t * sp * (0.4 + z) + Math.cos(t * 0.5 * sp + ph) * 14 * (o.swirl ?? 1)) % ah + ah) % ah;
    const tw = 0.55 + 0.45 * Math.sin(t * 2.1 * sp + ph * 3);
    const a = (o.alpha ?? 0.6) * tw * lerp(0.35, 1, z);
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`;
    if (o.depthBlur !== false && z > 0.82) { ctx.filter = `blur(${((z - 0.82) * 14).toFixed(1)}px)`; }
    ctx.beginPath();
    ctx.arc(x, y, sz * (z > 0.82 ? 2 : 1), 0, TAU);
    ctx.fill();
    ctx.filter = 'none';
  }
  ctx.restore();
}

/** Light shafts from a source point. angle = direction of rays, spread in radians. */
export function godRays(ctx, x, y, angle, spread, len, t, o = {}) {
  const n = o.count ?? 7;
  const r = rng(o.seed ?? 4);
  const col = hexToRgb(o.color || '#FFE2B0');
  ctx.save();
  ctx.globalCompositeOperation = o.blend || 'screen';
  for (let i = 0; i < n; i++) {
    const a = angle + (r() - 0.5) * spread;
    const w = (0.02 + r() * 0.05) * (o.width ?? 1);
    const flick = 0.6 + 0.4 * Math.sin(t * (0.4 + r() * 0.6) + r() * TAU);
    const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
    const al = (o.alpha ?? 0.22) * flick;
    g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${al})`);
    g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - w) * len, y + Math.sin(a - w) * len);
    ctx.lineTo(x + Math.cos(a + w) * len, y + Math.sin(a + w) * len);
    ctx.closePath();
    ctx.filter = 'blur(8px)';
    ctx.fill();
  }
  ctx.restore();
}

/** Soft contact shadow (grounds every object — never leave things floating). */
export function softShadow(ctx, x, y, rx, ry, alpha = 0.35, blur = 12) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = `rgba(20,8,4,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Halftone dot field inside current clip (collage / print texture). */
export function halftone(ctx, x, y, w, h, o = {}) {
  const step = o.step || 9;
  ctx.save();
  ctx.fillStyle = o.color || 'rgba(30,15,10,0.35)';
  for (let yy = y; yy < y + h; yy += step)
    for (let xx = x + ((yy / step) % 2) * step * 0.5; xx < x + w; xx += step) {
      const v = o.fn ? o.fn(xx, yy) : 0.5;
      const rr = step * 0.5 * clamp(v);
      if (rr < 0.3) continue;
      ctx.beginPath(); ctx.arc(xx, yy, rr, 0, TAU); ctx.fill();
    }
  ctx.restore();
}

export { mixColor, fract };

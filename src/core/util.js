// ─────────────────────────────────────────────────────────────────────────────
// util.js — math, easing, keyframes, seeded randomness, noise, colour.
// Everything here is PURE: same input → same output. No Date, no Math.random.
// ─────────────────────────────────────────────────────────────────────────────

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const remap = (v, a, b, c, d, doClamp = true) => {
  let t = invLerp(a, b, v);
  if (doClamp) t = clamp(t);
  return c + (d - c) * t;
};
export const smoothstep = (a, b, v) => {
  const t = clamp(invLerp(a, b, v));
  return t * t * (3 - 2 * t);
};
export const fract = (x) => x - Math.floor(x);
export const pingpong = (t, len = 1) => {
  const m = ((t % (2 * len)) + 2 * len) % (2 * len);
  return m <= len ? m : 2 * len - m;
};
export const deg = (d) => (d * Math.PI) / 180;

// ── Easing ───────────────────────────────────────────────────────────────────
// Film signature: entrances `outExpo` / `outQuart`, camera `inOutCubic`/`inOutSine`,
// exits `inQuart`/`inExpo`. Overshoot (`outBack`) only for ironic / playful beats.
export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: (t) => t * t * t * t,
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inQuint: (t) => t * t * t * t * t,
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inCirc: (t) => 1 - Math.sqrt(1 - t * t),
  outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inOutCirc: (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  inOutBack: (t, s = 1.70158 * 1.525) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2
      : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2,
  outElastic: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  // Film signature curve — soft decelerating landing (≈ cubic-bezier(.22,1,.36,1))
  film: (t) => 1 - Math.pow(1 - t, 3.6),
};

/** Damped spring response from 0→1 in closed form (deterministic). freq in Hz, damping 0..1 */
export function spring(t, freq = 2.2, damping = 0.45) {
  if (t <= 0) return 0;
  const w = TAU * freq;
  const z = clamp(damping, 0.001, 0.999);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

/** Progress of `t` inside window [a,b] (clamped 0..1), optionally eased. */
export const seg = (t, a, b, e = ease.linear) => e(clamp(invLerp(a, b, t)));

/** Keyframe track. keys = [[time, value, easeFnToThisKey?], ...]. Values may be numbers or arrays. */
export function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    if (t <= k1[0]) {
      const k0 = keys[i - 1];
      const e = k1[2] || ease.inOutCubic;
      const p = e(invLerp(k0[0], k1[0], t));
      if (Array.isArray(k0[1])) return k0[1].map((v, j) => lerp(v, k1[1][j], p));
      return lerp(k0[1], k1[1], p);
    }
  }
  return last[1];
}

/** Stagger helper: progress for item i of n, spreading starts over `spread` fraction of the window. */
export function stagger(p, i, n, spread = 0.5, e = ease.outCubic) {
  const each = 1 - spread;
  const start = n <= 1 ? 0 : (i / (n - 1)) * spread;
  return e(clamp((p - start) / each));
}

/** Snap time to "animate on twos/threes" for a hand-made stepped feel. */
export const onTwos = (t, fps = 30, n = 2) => Math.floor(t * (fps / n)) / (fps / n);

// ── Seeded randomness ────────────────────────────────────────────────────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rng = (seed) => {
  const r = mulberry32(typeof seed === 'string' ? strHash(seed) : seed);
  const api = () => r();
  api.range = (a, b) => a + (b - a) * r();
  api.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  api.pick = (arr) => arr[Math.floor(r() * arr.length)];
  api.sign = () => (r() < 0.5 ? -1 : 1);
  api.gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
  return api;
};
export function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** Integer hash → [0,1) */
export function hash1(n) {
  n = (n << 13) ^ n;
  return (((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff);
}
export const hash2 = (x, y) => hash1((x * 73856093) ^ (y * 19349663));

// ── Noise (simplex 2D/3D, seeded permutation) ────────────────────────────────
function buildPerm(seed) {
  const r = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}
const G3 = [1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1];
export function makeNoise(seed = 1337) {
  const perm = buildPerm(seed);
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function n2(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, nn2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const g = (perm[ii + perm[jj]] % 12) * 3; t0 *= t0; n0 = t0 * t0 * (G3[g] * x0 + G3[g + 1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const g = (perm[ii + i1 + perm[jj + j1]] % 12) * 3; t1 *= t1; n1 = t1 * t1 * (G3[g] * x1 + G3[g + 1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const g = (perm[ii + 1 + perm[jj + 1]] % 12) * 3; t2 *= t2; nn2 = t2 * t2 * (G3[g] * x2 + G3[g + 1] * y2); }
    return 70 * (n0 + n1 + nn2);
  }
  function n3(x, y, z) {
    const F3 = 1 / 3, G3c = 1 / 6;
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3c;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }
    const x1 = x0 - i1 + G3c, y1 = y0 - j1 + G3c, z1 = z0 - k1 + G3c;
    const x2 = x0 - i2 + 2 * G3c, y2 = y0 - j2 + 2 * G3c, z2 = z0 - k2 + 2 * G3c;
    const x3 = x0 - 1 + 0.5, y3 = y0 - 1 + 0.5, z3 = z0 - 1 + 0.5;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    const c = (tt, gi, xx, yy, zz) => {
      if (tt < 0) return 0;
      const g = (gi % 12) * 3;
      tt *= tt;
      return tt * tt * (G3[g] * xx + G3[g + 1] * yy + G3[g + 2] * zz);
    };
    const n0 = c(0.6 - x0*x0 - y0*y0 - z0*z0, perm[ii + perm[jj + perm[kk]]], x0, y0, z0);
    const n1 = c(0.6 - x1*x1 - y1*y1 - z1*z1, perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x1, y1, z1);
    const nn2 = c(0.6 - x2*x2 - y2*y2 - z2*z2, perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x2, y2, z2);
    const n3v = c(0.6 - x3*x3 - y3*y3 - z3*z3, perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x3, y3, z3);
    return 32 * (n0 + n1 + nn2 + n3v);
  }
  function fbm2(x, y, oct = 5, lac = 2.0, gain = 0.5) {
    let a = 0.5, f = 1, s = 0, norm = 0;
    for (let o = 0; o < oct; o++) { s += a * n2(x * f, y * f); norm += a; a *= gain; f *= lac; }
    return s / norm;
  }
  function fbm3(x, y, z, oct = 4, lac = 2.0, gain = 0.5) {
    let a = 0.5, f = 1, s = 0, norm = 0;
    for (let o = 0; o < oct; o++) { s += a * n3(x * f, y * f, z * f); norm += a; a *= gain; f *= lac; }
    return s / norm;
  }
  function ridge2(x, y, oct = 5) {
    let a = 0.5, f = 1, s = 0, norm = 0;
    for (let o = 0; o < oct; o++) { s += a * (1 - Math.abs(n2(x * f, y * f))); norm += a; a *= 0.5; f *= 2; }
    return s / norm;
  }
  return { n2, n3, fbm2, fbm3, ridge2 };
}
export const noise = makeNoise(127);

/** Smooth organic wiggle (like AE wiggle): returns value in [-amp, amp]. */
export const wiggle = (t, freq = 1, amp = 1, seed = 0) => noise.n2(t * freq, seed * 17.123 + 3.7) * amp;

/** Handheld camera offset {x,y,r} — subtle by default. */
export function handheld(t, amount = 1, seed = 0) {
  return {
    x: (noise.n2(t * 0.6, seed + 11) * 6 + noise.n2(t * 2.3, seed + 23) * 1.6) * amount,
    y: (noise.n2(t * 0.55, seed + 37) * 5 + noise.n2(t * 2.1, seed + 41) * 1.4) * amount,
    r: noise.n2(t * 0.4, seed + 53) * 0.0035 * amount,
  };
}

/** Deterministic camera shake that decays after an impact at time t0. */
export function shake(t, t0, strength = 20, decay = 5, freq = 24, seed = 0) {
  if (t < t0) return { x: 0, y: 0, r: 0 };
  const k = Math.exp(-(t - t0) * decay) * strength;
  return {
    x: noise.n2((t - t0) * freq, seed + 1.3) * k,
    y: noise.n2((t - t0) * freq, seed + 7.9) * k,
    r: noise.n2((t - t0) * freq * 0.7, seed + 4.4) * k * 0.0012,
  };
}

// ── Colour ───────────────────────────────────────────────────────────────────
export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const rgba = (hex, a = 1) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};
const srgbToLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const linToSrgb = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
function toOklab([r, g, b]) {
  r = srgbToLin(r); g = srgbToLin(g); b = srgbToLin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromOklab([L, a, b]) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [linToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
          linToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
          linToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}
/** Perceptual colour mix (OKLab) — avoids muddy midpoints. Returns hex. */
export function mixColor(hexA, hexB, t) {
  const a = toOklab(hexToRgb(hexA)), b = toOklab(hexToRgb(hexB));
  const m = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  return rgbToHex(...fromOklab(m));
}
/** Lighten (amt>0) / darken (amt<0) in OKLab lightness. */
export function shade(hex, amt) {
  const c = toOklab(hexToRgb(hex));
  c[0] = clamp(c[0] + amt, 0, 1);
  return rgbToHex(...fromOklab(c));
}

/** Multi-stop gradient sample: stops = [[0,'#hex'],[0.5,'#hex'],[1,'#hex']] */
export function gradientAt(stops, t) {
  t = clamp(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const p = invLerp(stops[i - 1][0], stops[i][0], t);
      return mixColor(stops[i - 1][1], stops[i][1], p);
    }
  }
  return stops[stops.length - 1][1];
}

// ── Geometry helpers ─────────────────────────────────────────────────────────
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
/** Point along a polyline at normalized length t; returns [x,y,angle]. */
export function polylineAt(pts, t) {
  let total = 0;
  const lens = [];
  for (let i = 1; i < pts.length; i++) { const l = dist(...pts[i - 1], ...pts[i]); lens.push(l); total += l; }
  let d = clamp(t) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const p = lens[i] ? d / lens[i] : 0;
      const a = pts[i], b = pts[i + 1];
      return [lerp(a[0], b[0], p), lerp(a[1], b[1], p), Math.atan2(b[1] - a[1], b[0] - a[0])];
    }
    d -= lens[i];
  }
  return [...pts[pts.length - 1], 0];
}

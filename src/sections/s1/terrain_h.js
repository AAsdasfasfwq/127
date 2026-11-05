// S1 · height function of the procedural Canyonlands (DOM-free, shared by 2D + 3D views).
import { clamp, lerp, smoothstep, makeNoise, hexToRgb } from '../../core/util.js';

export const NZ = makeNoise(2003);

/** distance-like measure to the zero set of a noise field (n / |grad n|) */
function zeroDist(f, x, y, e = 0.004) {
  const v = f(x, y);
  const gx = (f(x + e, y) - f(x - e, y)) / (2 * e);
  const gy = (f(x, y + e) - f(x, y - e)) / (2 * e);
  return Math.abs(v) / (Math.hypot(gx, gy) + 0.6);
}
const fMesa = (x, y) => NZ.fbm2(x * 0.85 + 1.3, y * 0.85 - 0.4, 3, 2.0, 0.5) + 0.04;
const fRiver = (x, y) => NZ.fbm2(x * 1.5 - 4.0, y * 1.5 + 2.0, 2, 2.0, 0.5);
const fTrib = (x, y) => NZ.fbm2(x * 3.4 + 7.0, y * 3.4 - 3.0, 2, 2.0, 0.5);
const fTwig = (x, y) => NZ.fbm2(x * 7.3 - 2.0, y * 7.3 + 5.0, 2, 2.0, 0.5);
function signedDist(f, x, y, e = 0.004) {
  const v = f(x, y);
  const gx = (f(x + e, y) - f(x - e, y)) / (2 * e);
  const gy = (f(x, y + e) - f(x, y - e)) / (2 * e);
  return v / (Math.hypot(gx, gy) + 0.3);
}

/**
 * Height in [0..1] at normalized coords (u,v).
 * Big forms: high mesas (caprock ≈1.0) with a sheer Wingate cliff onto a broad
 * White-Rim bench (≈0.45); a meandering inner gorge (≈0.12) cuts the bench;
 * dendritic tributary "fingers" bite into the mesa edges (the maze).
 */
export function canyonH(u, v) {
  const wx = u + NZ.fbm2(u * 1.1 + 5, v * 1.1, 3) * 0.18;
  const wy = v + NZ.fbm2(u * 1.1, v * 1.1 + 9, 3) * 0.18;
  const sd = signedDist(fMesa, wx, wy);
  // tributary fingers: deep near the mesa rim, heading out into the interior
  const dt = zeroDist(fTrib, wx, wy);
  const trib = 1 - smoothstep(0.009, 0.026, dt);
  const tribDepth = smoothstep(-0.02, 0.02, sd) * (1 - smoothstep(0.06, 0.32, sd));
  const dtw = zeroDist(fTwig, wx, wy);
  const twig = (1 - smoothstep(0.004, 0.011, dtw)) * smoothstep(0.0, 0.05, sd) * (1 - smoothstep(0.06, 0.16, sd));
  const sdc = sd - trib * tribDepth * 0.11 - twig * 0.03;
  const mesa = smoothstep(0.0, 0.021, sdc);
  let h = 0.43 + 0.07 * smoothstep(-0.07, 0.0, sdc) + mesa * 0.5;
  // inner gorge meanders through the bench
  const dr = zeroDist(fRiver, wx, wy);
  const gorge = 1 - smoothstep(0.009, 0.024, dr);
  const basin = 1 - smoothstep(-0.06, -0.015, sdc);
  h -= gorge * basin * 0.31;
  // caprock roughness / bench rubble
  h += NZ.fbm2(u * 7, v * 7, 3) * 0.018 + NZ.n2(u * 31, v * 31) * 0.004;
  // gentle ledges on the slopes
  const steps = 9;
  const f = h * steps - Math.floor(h * steps);
  h = lerp(h, (Math.floor(h * steps) + smoothstep(0.35, 1, f)) / steps, 0.35);
  return clamp(h, 0, 1.1);
}

/** Strata colour ramp by height (Canyonlands: dark floor, purple slopes, pale rim bench, red cliff, cream cap). */
export const BANDS = [
  [0.00, '#5E2616'], [0.13, '#6E2E1A'], [0.18, '#7E3A24'], [0.26, '#8E4A36'], [0.34, '#9C5A44'],
  [0.41, '#C79A72'], [0.45, '#E6D2B0'], [0.49, '#D9B38A'], [0.53, '#A9452A'], [0.65, '#B9522E'],
  [0.78, '#A23E25'], [0.9, '#C2643A'], [0.95, '#D39A66'], [1.05, '#E2B585'],
];
const BANDS_RGB = BANDS.map(([h, c]) => [h, hexToRgb(c)]);
export function strataColor(h, n = 0) {
  const hh = h + n * 0.02 + Math.sin(h * 120) * 0.004;
  for (let i = 1; i < BANDS_RGB.length; i++) {
    if (hh <= BANDS_RGB[i][0]) {
      const [h0, c0] = BANDS_RGB[i - 1], [h1, c1] = BANDS_RGB[i];
      const t = clamp((hh - h0) / (h1 - h0));
      return [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)];
    }
  }
  return BANDS_RGB[BANDS_RGB.length - 1][1];
}

/** Height grid cache: res×res samples over [u0,u1]×[v0,v1] */
const gridCache = new Map();
export function heightGrid(res, u0 = -1, u1 = 1, v0 = -1, v1 = 1) {
  const key = `${res}:${u0}:${u1}:${v0}:${v1}`;
  if (gridCache.has(key)) return gridCache.get(key);
  const g = new Float32Array(res * res);
  for (let j = 0; j < res; j++)
    for (let i = 0; i < res; i++) g[j * res + i] = canyonH(lerp(u0, u1, i / (res - 1)), lerp(v0, v1, j / (res - 1)));
  const out = { g, res, u0, u1, v0, v1 };
  gridCache.set(key, out);
  return out;
}


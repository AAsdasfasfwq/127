// ─────────────────────────────────────────────────────────────────────────────
// camera.js — 2D camera + 2.5D multiplane (parallax, dolly, depth of field, haze).
//
// MULTIPLANE MODEL: every layer is authored in plain 1920×1080 frame coordinates as if
// the camera were at rest. Camera = { x, y, dolly, zoom, rot, focus, dof, haze, hazeColor }
//   x,y   pan in focal-plane pixels (z = 1 layer moves exactly x,y)
//   dolly push-in amount (0 rest, 0.3 = strong push). Near layers grow faster → real depth
//   zoom  lens zoom (uniform, no parallax change) — use dolly for "3D" feel, zoom for flat
//   rot   roll in radians
// Layer depth z: 0.35 = foreground occluder, 1 = subject plane, 2–6 = background, 20 = sky.
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp } from './util.js';

const W = 1920, H = 1080;

export function cam(o = {}) {
  return { x: 0, y: 0, dolly: 0, zoom: 1, rot: 0, focus: 1, dof: 0, haze: 0, hazeColor: '#E9C9A0', ...o };
}

/** Transform for a layer at depth z. Returns scale factor actually applied. */
export function applyPlane(ctx, c, z = 1, ox = W / 2, oy = H / 2) {
  const d = clamp(c.dolly || 0, -2, 0.92 * z);
  const s = (1 / (1 - d / z)) * (c.zoom || 1);
  ctx.translate(ox, oy);
  if (c.rot) ctx.rotate(c.rot / Math.max(0.6, Math.sqrt(z)));
  ctx.scale(s, s);
  ctx.translate(-ox - (c.x || 0) / z, -oy - (c.y || 0) / z);
  return s;
}

/**
 * Draw one plane. draw(ctx) paints in frame coordinates.
 * opts: { blur (override), haze (override 0..1), tmp: info.tmp, alpha }
 */
export function plane(ctx, c, z, draw, o = {}) {
  const blur = o.blur ?? (c.dof ? Math.abs(1 / z - 1 / (c.focus || 1)) * c.dof : 0);
  const haze = o.haze ?? (c.haze ? clamp((z - 1) / 6) * c.haze : 0);
  const needBuffer = (blur > 0.6 || haze > 0.01) && o.tmp;
  if (!needBuffer) {
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    applyPlane(ctx, c, z);
    draw(ctx);
    ctx.restore();
    return;
  }
  const b = o.tmp();
  b.ctx.save();
  applyPlane(b.ctx, c, z);
  draw(b.ctx);
  b.ctx.restore();
  if (haze > 0.01) {
    b.ctx.save();
    b.ctx.globalCompositeOperation = 'source-atop';
    b.ctx.globalAlpha = clamp(haze);
    b.ctx.fillStyle = c.hazeColor || '#E9C9A0';
    b.ctx.fillRect(0, 0, W, H);
    b.ctx.restore();
  }
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (blur > 0.6) ctx.filter = `blur(${Math.min(40, blur).toFixed(1)}px)`;
  ctx.drawImage(b.canvas, 0, 0);
  ctx.restore();
}

/** layers: [{ z, draw(ctx), blur?, haze?, alpha? }] — drawn far → near automatically. */
export function multiplane(ctx, c, layers, tmp) {
  const sorted = layers.slice().sort((a, b) => b.z - a.z);
  for (const L of sorted) plane(ctx, c, L.z, L.draw, { blur: L.blur, haze: L.haze, alpha: L.alpha, tmp });
}

/** Simple 2D camera on a world larger than the frame. */
export function apply2D(ctx, { x = W / 2, y = H / 2, zoom = 1, rot = 0 } = {}) {
  ctx.translate(W / 2, H / 2);
  if (rot) ctx.rotate(rot);
  ctx.scale(zoom, zoom);
  ctx.translate(-x, -y);
}

/** Interpolate two camera states. */
export function mixCam(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) o[k] = typeof a[k] === 'number' && typeof b[k] === 'number' ? lerp(a[k], b[k], t) : t < 0.5 ? a[k] : b[k];
  return o;
}

/** Pseudo-3D projection for drawing points in a simple perspective world (2.5D sets). */
export function project(x, y, z, view = {}) {
  const f = view.f ?? 900;
  const cx = view.cx ?? W / 2, cy = view.cy ?? H / 2;
  const camX = view.x ?? 0, camY = view.y ?? 0, camZ = view.z ?? -900;
  const yaw = view.yaw ?? 0, pitch = view.pitch ?? 0;
  let X = x - camX, Y = y - camY, Z = z - camZ;
  const cyw = Math.cos(yaw), syw = Math.sin(yaw);
  [X, Z] = [X * cyw - Z * syw, X * syw + Z * cyw];
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  [Y, Z] = [Y * cp - Z * sp, Y * sp + Z * cp];
  if (Z <= 1) return null;
  const s = f / Z;
  return { x: cx + X * s, y: cy + Y * s, s, z: Z };
}

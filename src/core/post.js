// ─────────────────────────────────────────────────────────────────────────────
// post.js — the finishing layer applied to every frame (after overlays).
// Per-scene control via scene.post = { grain, vignette, letterbox, tint, tintAmt, ca }.
// Grain is ALWAYS animated (per frame), midtone-weighted via 'overlay' blending.
// ─────────────────────────────────────────────────────────────────────────────
import { mulberry32, clamp } from './util.js';

const W = 1920, H = 1080;
export const DEFAULT_POST = {
  grain: 0.075,     // 0..0.25 film grain strength
  vignette: 0.32,   // 0..1 corner darkening
  letterbox: 0,     // 0..1 → bars up to 2.39:1
  tint: null,       // '#hex' colour grade wash (soft-light)
  tintAmt: 0,       // 0..1
  ca: 0,            // 0..1 chromatic aberration at the edges (costly – use for moments)
};

let grainTiles = null;
function buildGrain() {
  grainTiles = [];
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const g = c.getContext('2d');
    const img = g.createImageData(512, 512);
    const r = mulberry32(9001 + k * 77);
    for (let i = 0; i < 512 * 512; i++) {
      // slightly clumped grain: average two samples
      const v = ((r() + r() + r()) / 3) * 255;
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainTiles.push(c);
  }
}

let vignetteCanvas = null;
function buildVignette() {
  vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = W; vignetteCanvas.height = H;
  const g = vignetteCanvas.getContext('2d');
  const grad = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 1.05);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.55, 'rgba(18,8,4,0.25)');
  grad.addColorStop(1, 'rgba(10,4,2,1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
}

export function applyPost(ctx, t, post, acquire) {
  if (!grainTiles) buildGrain();
  if (!vignetteCanvas) buildVignette();
  const frame = Math.round(t * 30);

  if (post.ca > 0.001) {
    const tmp = acquire();
    tmp.ctx.drawImage(ctx.canvas, 0, 0);
    const s = 1 + 0.004 * post.ca;
    ctx.save();
    ctx.globalCompositeOperation = 'lighten';
    ctx.globalAlpha = 0.35 * post.ca;
    ctx.translate(W / 2, H / 2);
    ctx.scale(s, s);
    ctx.translate(-W / 2, -H / 2);
    ctx.filter = 'sepia(1) saturate(6) hue-rotate(-50deg)';
    ctx.drawImage(tmp.canvas, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighten';
    ctx.globalAlpha = 0.25 * post.ca;
    const s2 = 1 - 0.003 * post.ca;
    ctx.translate(W / 2, H / 2);
    ctx.scale(s2, s2);
    ctx.translate(-W / 2, -H / 2);
    ctx.filter = 'sepia(1) saturate(6) hue-rotate(160deg)';
    ctx.drawImage(tmp.canvas, 0, 0);
    ctx.restore();
    ctx.filter = 'none';
  }

  if (post.tint && post.tintAmt > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = clamp(post.tintAmt);
    ctx.fillStyle = post.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (post.vignette > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = clamp(post.vignette);
    ctx.drawImage(vignetteCanvas, 0, 0);
    ctx.restore();
  }

  if (post.letterbox > 0) {
    const bar = Math.round(((H - W / 2.39) / 2) * clamp(post.letterbox));
    ctx.fillStyle = '#0b0807';
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
  }

  if (post.grain > 0) {
    const tile = grainTiles[frame % grainTiles.length];
    const r = mulberry32(frame * 7919 + 13);
    const ox = Math.floor(r() * 512), oy = Math.floor(r() * 512);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = clamp(post.grain * 1.6);
    for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) ctx.drawImage(tile, x, y);
    ctx.restore();
  }
}

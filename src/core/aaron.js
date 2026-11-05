// ─────────────────────────────────────────────────────────────────────────────
// aaron.js — the canonical ARON character rig (model sheet in code).
// Every section draws Aron with THIS rig so he is one recognisable character.
//
// DESIGN (docs/ART_BIBLE.md §Characters): tall, lanky, long limbs, big hands & feet;
// angular jaw with a cleft chin, big hooked nose with a bump, thick dark straight brows,
// short dark-brown hair with a COWLICK tuft that always sticks up (signature silhouette),
// hazel-grey eyes, sunburnt nose/cheeks. Outfit 'climb': mustard tee, olive cargo shorts,
// grey approach shoes with RED laces, slate-teal hydration pack with a blue drinking tube,
// black wrist watch. Outfit 'office': pale sage shirt, dark tie, ID lanyard, charcoal slacks.
//
// API
//   drawAaron(ctx, { x, y, scale, facing, pose, expr, outfit, light, beard, dirt, sunburn,
//                    rightArm: 'normal'|'hidden'|'stump', lineColor, rim })
//      x,y = point between the feet on the ground (pose.root offsets the pelvis)
//      scale: 1 → ~1000 px tall standing. facing: 1 right, -1 left.
//   drawHead(ctx, x, y, size, { yaw, tilt, nod, expr, beard, dirt, sunburn, light, rim })
//      for close-ups (size = head height in px). yaw -1..1 (1 = turned to screen-right).
//   POSES.stand / walk(ph) / run(ph) / chimney(ph) / reachDown / fall / trapped /
//         slump / stagger(ph) / rappel(ph) / armsUp / crouch / cameraSelfie
//   mixPose(a, b, t)   — interpolate poses.  EXPR.neutral / smile / grin / worried / pain /
//         scream / determined / exhausted / delirious / awe / tender / grit
// Angles: radians. Arm `sh` 0 = hanging down, + = swings toward facing direction.
// `el` elbow bend (+ bends forearm forward/up). Leg `hip` 0 = straight down, + = forward.
// `knee` + bends shin backward. Torso `lean` + = leans toward facing direction.
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, TAU, rng } from './util.js';

const COL = {
  skin: '#E2A27A', skinSh: '#B66E4C', skinHi: '#F6C8A4', blush: '#D9705A',
  hair: '#3A2216', hairHi: '#6E4429', brow: '#2C1A11',
  iris: '#6C8A86', sclera: '#F5EDE2', line: '#2A1712',
  shirt: '#D9A521', shirtSh: '#A9760F', shirtHi: '#EFC24E',
  shorts: '#6B6A3A', shortsSh: '#4A4924', shortsHi: '#868552',
  sock: '#D8D2C4', shoe: '#5B5F63', shoeSh: '#3B3E42', sole: '#2A2624', lace: '#C8371F',
  pack: '#2F5D73', packSh: '#1E3E4F', tube: '#5FB8E6', watch: '#1D1A18',
  office: '#C9D3C2', officeSh: '#97A495', tie: '#2D3440', slacks: '#3B3D42', slacksSh: '#26282C',
  bandage: '#EDE3D0', bandageSh: '#C7B79C', blood: '#8E1F14',
};
export const AARON_COLORS = COL;

// ── poses ────────────────────────────────────────────────────────────────────
const P = (o) => ({
  root: [0, 0], lean: 0, twist: 0, neck: 0, head: 0, yaw: 0.35, nod: 0,
  armL: { sh: -0.1, el: 0.25, wr: 0, hand: 'relaxed' },
  armR: { sh: 0.12, el: 0.2, wr: 0, hand: 'relaxed' },
  legL: { hip: -0.06, knee: 0.05, ank: 0 },
  legR: { hip: 0.08, knee: 0.08, ank: 0 },
  ...o,
});
export const POSES = {
  stand: P({}),
  proud: P({ lean: -0.04, yaw: 0.25, nod: -0.06, armL: { sh: -0.35, el: 1.9, wr: 0.2, hand: 'fist' }, armR: { sh: 0.35, el: 1.9, wr: 0.2, hand: 'fist' }, legL: { hip: -0.14, knee: 0.02 }, legR: { hip: 0.14, knee: 0.02 } }),
  walk(ph) {
    const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
    return P({ root: [0, -Math.abs(c) * 14], lean: 0.06, yaw: 0.45,
      armL: { sh: -0.45 * s, el: 0.35 + 0.2 * Math.max(0, s), hand: 'relaxed' },
      armR: { sh: 0.45 * s, el: 0.35 + 0.2 * Math.max(0, -s), hand: 'relaxed' },
      legL: { hip: 0.42 * s, knee: 0.15 + 0.55 * Math.max(0, -c * s > 0 ? c : 0) + 0.25 * Math.max(0, -s), ank: -0.1 * s },
      legR: { hip: -0.42 * s, knee: 0.15 + 0.25 * Math.max(0, s), ank: 0.1 * s } });
  },
  run(ph) {
    const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
    return P({ root: [0, -Math.abs(c) * 36 - 10], lean: 0.22, yaw: 0.55,
      armL: { sh: -0.9 * s, el: 1.5, hand: 'fist' }, armR: { sh: 0.9 * s, el: 1.5, hand: 'fist' },
      legL: { hip: 0.75 * s, knee: 0.4 + 1.2 * Math.max(0, -s), ank: -0.2 }, legR: { hip: -0.75 * s, knee: 0.4 + 1.2 * Math.max(0, s), ank: -0.2 } });
  },
  /** stemming between two walls (slot canyon technique) */
  chimney(ph = 0) {
    const s = Math.sin(ph * TAU);
    return P({ root: [0, -120], lean: 0.02, yaw: 0.1,
      armL: { sh: -1.75 + 0.15 * s, el: 0.5, wr: 0.4, hand: 'open' }, armR: { sh: 1.75 - 0.15 * s, el: 0.5, wr: 0.4, hand: 'open' },
      legL: { hip: -1.05 - 0.12 * s, knee: 0.9, ank: 0.5 }, legR: { hip: 1.05 + 0.12 * s, knee: 0.9, ank: -0.5 } });
  },
  reachDown: P({ lean: 0.35, yaw: 0.5, nod: 0.25, armL: { sh: 0.3, el: 0.4, hand: 'open' }, armR: { sh: 0.9, el: 0.2, wr: -0.3, hand: 'open' }, legL: { hip: 0.5, knee: 1.2 }, legR: { hip: -0.2, knee: 0.4 } }),
  fall: P({ root: [0, -60], lean: -0.5, yaw: 0.2, nod: -0.3, armL: { sh: -2.4, el: 0.6, hand: 'open' }, armR: { sh: 2.2, el: 0.4, hand: 'open' }, legL: { hip: 0.9, knee: 1.1 }, legR: { hip: 0.3, knee: 0.4 } }),
  /** wedged: right arm up-forward into the boulder, body slumped against the wall */
  trapped: P({ root: [0, 60], lean: 0.12, yaw: 0.25, nod: 0.12, armL: { sh: 0.2, el: 1.2, hand: 'fist' }, armR: { sh: 2.0, el: 0.15, wr: 0, hand: 'grip' }, legL: { hip: 0.5, knee: 0.9 }, legR: { hip: 0.2, knee: 0.5 } }),
  slump: P({ root: [0, 260], lean: -0.1, yaw: 0.15, nod: 0.35, head: 0.15, armL: { sh: 0.1, el: 0.9, hand: 'relaxed' }, armR: { sh: 1.9, el: 0.2, hand: 'grip' }, legL: { hip: 1.4, knee: 2.0, ank: 0.3 }, legR: { hip: 1.2, knee: 1.6, ank: 0.2 } }),
  stagger(ph) {
    const s = Math.sin(ph * TAU);
    return P({ root: [0, -Math.abs(Math.cos(ph * TAU)) * 8], lean: 0.16 + 0.05 * s, yaw: 0.4, nod: 0.2, head: 0.08 * s,
      armL: { sh: 0.3 + 0.2 * s, el: 0.5, hand: 'relaxed' }, armR: { sh: 0.6, el: 1.7, hand: 'relaxed' },
      legL: { hip: 0.3 * s, knee: 0.3 + 0.3 * Math.max(0, -s) }, legR: { hip: -0.3 * s, knee: 0.3 + 0.3 * Math.max(0, s) } });
  },
  rappel(ph = 0) {
    const s = Math.sin(ph * TAU);
    return P({ root: [0, 0], lean: -0.55, yaw: 0.3, nod: -0.25, armL: { sh: 1.2, el: 1.0, wr: 0.2, hand: 'grip' }, armR: { sh: 0.6, el: 1.6, hand: 'relaxed' },
      legL: { hip: 1.35 + 0.1 * s, knee: 0.3, ank: -0.9 }, legR: { hip: 1.15 - 0.1 * s, knee: 0.4, ank: -0.9 } });
  },
  armsUp: P({ lean: -0.08, yaw: 0.2, nod: -0.25, armL: { sh: -2.8, el: 0.25, hand: 'fist' }, armR: { sh: 2.8, el: 0.25, hand: 'fist' }, legL: { hip: -0.18 }, legR: { hip: 0.18 } }),
  crouch: P({ root: [0, 230], lean: 0.45, yaw: 0.4, armL: { sh: 0.5, el: 1.1, hand: 'relaxed' }, armR: { sh: 0.9, el: 0.9, hand: 'open' }, legL: { hip: 1.5, knee: 2.4, ank: 0.4 }, legR: { hip: 0.9, knee: 2.1, ank: 0.6 } }),
  cameraSelfie: P({ root: [0, 260], lean: 0.05, yaw: 0.05, nod: 0.1, armL: { sh: 1.15, el: 1.35, wr: -0.4, hand: 'grip' }, armR: { sh: 1.9, el: 0.2, hand: 'grip' }, legL: { hip: 1.4, knee: 2.0 }, legR: { hip: 1.2, knee: 1.6 } }),
};

function mixLimb(a, b, t) { const o = {}; for (const k of Object.keys(a)) o[k] = typeof a[k] === 'number' ? lerp(a[k], b[k] ?? a[k], t) : t < 0.5 ? a[k] : b[k] ?? a[k]; return o; }
export function mixPose(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) {
    if (k === 'root') o.root = [lerp(a.root[0], b.root[0], t), lerp(a.root[1], b.root[1], t)];
    else if (typeof a[k] === 'number') o[k] = lerp(a[k], b[k] ?? a[k], t);
    else if (a[k] && typeof a[k] === 'object') o[k] = mixLimb(a[k], b[k] || a[k], t);
  }
  return o;
}

// ── expressions ──────────────────────────────────────────────────────────────
// brow: -1 down/angry .. 1 raised ; browTilt: + inner ends up (worry/sad), - inner down (anger)
// eyes: openness 0..1.3 ; squint 0..1 ; look: [x,y] -1..1 ; mouth: smile -1..1, open 0..1, wide 0..1, teeth 0..1
const E = (o) => ({ brow: 0, browTilt: 0, eyes: 1, squint: 0, look: [0.2, 0], smile: 0.1, open: 0, wide: 0.5, teeth: 0, blink: 0, ...o });
export const EXPR = {
  neutral: E({}),
  smile: E({ smile: 0.75, squint: 0.25, brow: 0.15 }),
  grin: E({ smile: 1, open: 0.35, teeth: 1, wide: 0.9, squint: 0.4, brow: 0.3 }),
  cocky: E({ smile: 0.55, brow: 0.2, browTilt: -0.3, squint: 0.3, look: [0.6, 0], wide: 0.7 }),
  worried: E({ brow: 0.3, browTilt: 0.8, smile: -0.35, eyes: 1.1, look: [0.3, 0.2] }),
  pain: E({ brow: -0.4, browTilt: 0.9, squint: 0.9, eyes: 0.35, smile: -0.7, open: 0.45, teeth: 1, wide: 0.95 }),
  scream: E({ brow: 0.2, browTilt: 1, eyes: 1.25, smile: -0.5, open: 1, wide: 0.6, teeth: 0.6 }),
  shock: E({ brow: 0.9, browTilt: 0.3, eyes: 1.3, smile: -0.2, open: 0.55, wide: 0.35, look: [0, 0] }),
  determined: E({ brow: -0.45, browTilt: -0.35, squint: 0.35, smile: -0.1, wide: 0.6, look: [0.5, 0] }),
  grit: E({ brow: -0.5, browTilt: 0.2, squint: 0.8, eyes: 0.5, smile: -0.4, open: 0.2, teeth: 1, wide: 1 }),
  exhausted: E({ brow: -0.1, browTilt: 0.5, eyes: 0.45, smile: -0.25, open: 0.12, look: [0.1, 0.4] }),
  delirious: E({ brow: 0.5, browTilt: 0.6, eyes: 0.8, smile: 0.25, open: 0.2, look: [-0.4, -0.5] }),
  awe: E({ brow: 0.7, browTilt: 0.35, eyes: 1.2, smile: 0.2, open: 0.3, wide: 0.4, look: [0.3, -0.4] }),
  tender: E({ brow: 0.25, browTilt: 0.45, eyes: 0.8, squint: 0.3, smile: 0.45, look: [0.2, 0.1] }),
  sad: E({ brow: 0.1, browTilt: 1, eyes: 0.7, smile: -0.55, look: [0, 0.5] }),
};
export function mixExpr(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) o[k] = Array.isArray(a[k]) ? [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)] : lerp(a[k], b[k] ?? a[k], t);
  return o;
}

// ── drawing primitives ───────────────────────────────────────────────────────
/** Cel-shaded fill of a path: base, shadow crescent away from light, soft roundness, rim. */
function cel(ctx, build, base, sh, light, off, o = {}) {
  ctx.save();
  ctx.beginPath(); build(ctx);
  ctx.fillStyle = base; ctx.fill();
  ctx.clip();
  // shadow = shape minus shape shifted toward the light
  ctx.save();
  ctx.translate(-light[0] * off, -light[1] * off);
  ctx.beginPath(); ctx.rect(-5000, -5000, 10000, 10000); build(ctx);
  ctx.restore();
  ctx.fillStyle = sh;
  ctx.fill('evenodd');
  if (o.hi) {
    ctx.save();
    ctx.translate(light[0] * off * 0.9, light[1] * off * 0.9);
    ctx.beginPath(); ctx.rect(-5000, -5000, 10000, 10000); build(ctx);
    ctx.restore();
    ctx.globalAlpha = 0.0;
  }
  ctx.restore();
  if (o.line) {
    ctx.save();
    ctx.beginPath(); build(ctx);
    ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 2; ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }
  if (o.rim) {
    ctx.save();
    ctx.beginPath(); build(ctx);
    ctx.clip();
    ctx.translate(light[0] * off * 0.5, light[1] * off * 0.5);
    ctx.beginPath(); ctx.rect(-5000, -5000, 10000, 10000); build(ctx);
    ctx.fillStyle = o.rim;
    ctx.globalAlpha = 0.0;
    ctx.restore();
    // thin rim: stroke shifted toward light, clipped inside
    ctx.save();
    ctx.beginPath(); build(ctx); ctx.clip();
    ctx.translate(light[0] * off * 0.35, light[1] * off * 0.35);
    ctx.beginPath(); build(ctx);
    ctx.strokeStyle = o.rim; ctx.lineWidth = off * 0.55; ctx.globalAlpha = 0.85;
    ctx.translate(-light[0] * off * 0.7, -light[1] * off * 0.7);
    ctx.stroke();
    ctx.restore();
  }
}

/** Tapered organic limb outline from A to B (with a slight muscle bulge). */
function limbPath(ctx, ax, ay, bx, by, wa, wb, bulge = 0.12) {
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const wm = (wa + wb) / 2 * (1 + bulge);
  const ang = Math.atan2(dy, dx);
  ctx.moveTo(ax + nx * wa, ay + ny * wa);
  ctx.quadraticCurveTo(mx + nx * wm * 1.05, my + ny * wm * 1.05, bx + nx * wb, by + ny * wb);
  ctx.arc(bx, by, wb, ang + Math.PI / 2, ang - Math.PI / 2, true);
  ctx.quadraticCurveTo(mx - nx * wm, my - ny * wm, ax - nx * wa, ay - ny * wa);
  ctx.arc(ax, ay, wa, ang - Math.PI / 2, ang + Math.PI / 2, true);
  ctx.closePath();
}

/** Continuous organic limb through several joints (no visible segment seams). */
function chainPath(ctx, pts, widths, bulge = 0.14) {
  // densify: add bulged midpoints
  const P = [], Wd = [];
  for (let i = 0; i < pts.length; i++) {
    P.push(pts[i]); Wd.push(widths[i]);
    if (i < pts.length - 1) {
      P.push([(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]);
      Wd.push(((widths[i] + widths[i + 1]) / 2) * (1 + bulge * (i === 0 ? 1 : 0.6)));
    }
  }
  const n = P.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    L.push([P[i][0] - dy * Wd[i], P[i][1] + dx * Wd[i]]);
    R.push([P[i][0] + dy * Wd[i], P[i][1] - dx * Wd[i]]);
  }
  const angEnd = Math.atan2(P[n - 1][1] - P[n - 2][1], P[n - 1][0] - P[n - 2][0]);
  const angSt = Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0]);
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
  ctx.lineTo(L[n - 1][0], L[n - 1][1]);
  ctx.arc(P[n - 1][0], P[n - 1][1], Wd[n - 1], angEnd + Math.PI / 2, angEnd - Math.PI / 2, true);
  for (let i = n - 2; i > 0; i--) ctx.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + R[i - 1][0]) / 2, (R[i][1] + R[i - 1][1]) / 2);
  ctx.lineTo(R[0][0], R[0][1]);
  ctx.arc(P[0][0], P[0][1], Wd[0], angSt - Math.PI / 2, angSt + Math.PI / 2, true);
  ctx.closePath();
}

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// ── hands ────────────────────────────────────────────────────────────────────
/** Hand at wrist (x,y) pointing along angle `a`. size ≈ palm length. shape: open|relaxed|fist|grip|point */
export function drawHand(ctx, x, y, a, size, shape = 'relaxed', o = {}) {
  const light = o.light || [0.6, 0.8];
  const skin = o.skin || COL.skin, sh = o.skinSh || COL.skinSh;
  const line = o.lineColor || COL.line;
  const lw = Math.max(1, size * 0.045);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a - Math.PI / 2); // local: +y along the hand
  const curl = { open: 0.08, relaxed: 0.55, fist: 1.6, grip: 1.15, point: 1.5 }[shape] ?? 0.5;
  const spread = shape === 'open' ? 0.16 : 0.05;
  const pw = size * 0.52, pl = size * 0.62;
  // fingers (drawn before palm for fist so knuckles overlap correctly)
  const fingers = [[-0.36, 0.86], [-0.12, 1.0], [0.12, 0.95], [0.34, 0.78]];
  const drawFinger = (fx, len, k) => {
    const c = shape === 'point' && k === 1 ? 0.05 : curl;
    let px = fx * pw, py = pl;
    let ang = Math.PI / 2 + (fx * spread * 3);
    const seg = [0.45, 0.32, 0.26].map((s) => s * size * len);
    const w0 = size * 0.105;
    for (let j = 0; j < 3; j++) {
      const na = ang + c * (j === 0 ? 0.6 : 0.75);
      const nx = px + Math.cos(na) * seg[j], ny = py + Math.sin(na) * seg[j];
      cel(ctx, (g) => limbPath(g, px, py, nx, ny, w0 * (1 - j * 0.12), w0 * (0.9 - j * 0.12), 0.05), skin, sh, light, size * 0.05, { line, lw });
      px = nx; py = ny; ang = na;
    }
  };
  if (shape === 'fist' || shape === 'grip' || shape === 'point') fingers.forEach(([fx, len], k) => drawFinger(fx, len, k));
  // palm
  cel(ctx, (g) => {
    g.moveTo(-pw * 0.5, 0);
    g.quadraticCurveTo(-pw * 0.62, pl * 0.6, -pw * 0.5, pl);
    g.quadraticCurveTo(0, pl * 1.12, pw * 0.5, pl * 0.98);
    g.quadraticCurveTo(pw * 0.6, pl * 0.5, pw * 0.42, 0);
    g.closePath();
  }, skin, sh, light, size * 0.07, { line, lw });
  if (!(shape === 'fist' || shape === 'grip' || shape === 'point')) fingers.forEach(([fx, len], k) => drawFinger(fx, len, k));
  else {
    // knuckle line
    ctx.strokeStyle = line; ctx.lineWidth = lw * 0.8; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(-pw * 0.4, pl * 0.95); ctx.quadraticCurveTo(0, pl * 1.08, pw * 0.42, pl * 0.92); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // thumb
  const side = o.thumbSide ?? 1;
  const tc = shape === 'open' ? 0.15 : shape === 'relaxed' ? 0.5 : 0.95;
  let tx = side * pw * 0.45, ty = pl * 0.25;
  let ta = Math.PI / 2 - side * (0.9 - tc * 0.6);
  for (let j = 0; j < 2; j++) {
    const L = size * (j ? 0.3 : 0.38);
    const na = ta + side * tc * 0.5;
    const nx = tx + Math.cos(na) * L, ny = ty + Math.sin(na) * L;
    cel(ctx, (g) => limbPath(g, tx, ty, nx, ny, size * 0.13 * (1 - j * 0.15), size * 0.11, 0.05), skin, sh, light, size * 0.05, { line, lw });
    tx = nx; ty = ny; ta = na;
  }
  ctx.restore();
}

// ── head ─────────────────────────────────────────────────────────────────────
// 3D head model in head-height units (y down, z toward the face direction).
// Long face, narrow cranium, strong angular jaw, cleft chin.
const HEAD_PTS = (() => {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    for (const el of [-1.0, -0.7, -0.4, -0.1, 0.12]) {
      const r = Math.cos(el);
      pts.push([Math.cos(a) * 0.355 * r, -0.13 + Math.sin(el) * 0.36, Math.sin(a) * 0.41 * r]);
    }
  }
  pts.push([0.35, 0.02, 0.13], [-0.35, 0.02, 0.13], [0.31, 0.21, -0.04], [-0.31, 0.21, -0.04],
    [0.24, 0.31, 0.12], [-0.24, 0.31, 0.12], [0.095, 0.4, 0.27], [-0.095, 0.4, 0.27], [0, 0.415, 0.26]);
  return pts;
})();
function hullOf(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}
function smoothClosed(ctx, pts) {
  const n = pts.length;
  ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  ctx.closePath();
}

/**
 * Close-up / body head. (x,y) = head centre, size = head height px.
 * o: { yaw, tilt, nod, expr, beard 0..1 (days of stubble), dirt 0..1, sunburn 0..1, tired 0..1,
 *      sweat, light:[lx,ly] direction the light TRAVELS (e.g. [0.6,0.8] = from upper-left),
 *      rim: color|null, hairColor }
 */
export function drawHead(ctx, x, y, size, o = {}) {
  const ex = { ...EXPR.neutral, ...(o.expr || {}) };
  const yawA = clamp(o.yaw ?? 0.3, -1, 1) * 1.05;
  const nod = o.nod || 0;
  const Lt = o.light || [0.6, 0.8];          // light travel direction
  const s = size;
  const lw = Math.max(1.2, s * 0.011);
  const line = o.lineColor || COL.line;
  const cy = Math.cos(yawA), sy = Math.sin(yawA);
  const cn = Math.cos(nod), sn = Math.sin(nod);
  const proj = (p) => {
    const X = p[0] * cy + p[2] * sy, Z = -p[0] * sy + p[2] * cy, Y = p[1];
    return [X * s, (Y * cn - Z * sn) * s, Y * sn + Z * cn];
  };
  const skin = o.skin || COL.skin, skinSh = o.skinSh || COL.skinSh;
  const hairC = o.hairColor || COL.hair;
  const nearSide = sy >= 0 ? -1 : 1; // head-space x sign of the side facing the camera more

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.tilt || 0);

  // 1. back hair mass (behind everything)
  const backHair = hullOf(HEAD_PTS.filter((p) => p[1] < 0.06).map((p) => { const q = proj([p[0] * 1.07, p[1] * 1.05 - 0.015, p[2] * 1.07]); return [q[0], q[1]]; }));
  cel(ctx, (g) => smoothClosed(g, backHair), hairC, '#22130B', Lt, s * 0.05, { line, lw });

  // 2. cowlick tuft at the crown (signature silhouette): three curled strands
  {
    const strands = [[-0.13, -0.5, -0.02, -0.23, -0.71, 0.05, 0.075], [-0.05, -0.52, 0.0, -0.06, -0.74, 0.1, 0.06], [0.03, -0.5, 0.0, 0.1, -0.66, 0.12, 0.05]];
    ctx.fillStyle = hairC; ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    for (const [bx, by, bz, tx, ty, curl, w] of strands) {
      const b = proj([bx, by + 0.04, bz]), t = proj([tx, ty, bz - 0.04]);
      const c = proj([bx + curl, (by + ty) / 2 - 0.06, bz]);
      ctx.beginPath();
      ctx.moveTo(b[0] - s * w * 0.5, b[1]);
      ctx.quadraticCurveTo(c[0] - s * w * 0.3, c[1], t[0], t[1]);
      ctx.quadraticCurveTo(c[0] + s * w * 0.6, c[1] + s * w * 0.6, b[0] + s * w * 0.5, b[1]);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }

  // 3. far ear peeks out behind the head when nearly frontal
  const drawEar = (side) => {
    const ep = proj([side * 0.37, 0.04, -0.03]);
    const w = s * 0.062 * clamp(Math.abs(proj([side, 0, 0])[0] / s) * 0.6 + 0.45, 0.45, 1), h = s * 0.115;
    const ox = ep[0] + side * (Math.abs(sy) < 0.3 ? s * 0.018 : 0);
    cel(ctx, (g) => { g.ellipse(ox, ep[1], w, h, side * 0.12, 0, TAU); }, skin, skinSh, Lt, s * 0.03, { line, lw });
    ctx.strokeStyle = skinSh; ctx.lineWidth = lw * 1.4;
    ctx.beginPath(); ctx.ellipse(ox, ep[1] + h * 0.05, w * 0.5, h * 0.6, side * 0.12, -1.3, 1.6); ctx.stroke();
  };
  if (Math.abs(sy) < 0.55) drawEar(-nearSide);

  // 4. face silhouette
  const fp = hullOf(HEAD_PTS.map((p) => { const q = proj(p); return [q[0], q[1]]; }));
  const facePath = (g) => smoothClosed(g, fp);
  cel(ctx, facePath, skin, skinSh, Lt, s * 0.07, { line, lw });

  ctx.save();
  ctx.beginPath(); facePath(ctx); ctx.clip();
  // roundness + cheek warmth
  const rg = ctx.createRadialGradient(-Lt[0] * s * 0.2, -Lt[1] * s * 0.2, s * 0.05, 0, 0, s * 0.6);
  rg.addColorStop(0, 'rgba(255,232,210,0.25)'); rg.addColorStop(1, 'rgba(90,30,15,0.12)');
  ctx.fillStyle = rg; ctx.fillRect(-s, -s, s * 2, s * 2);
  const sb = o.sunburn ?? 0.45;
  for (const side of [-1, 1]) {
    const c = proj([side * 0.2, 0.13, 0.32]);
    if (c[2] < 0.05 || sb <= 0) continue;
    const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], s * 0.11);
    g.addColorStop(0, `rgba(217,112,90,${0.42 * sb})`); g.addColorStop(1, 'rgba(217,112,90,0)');
    ctx.fillStyle = g; ctx.fillRect(c[0] - s * 0.2, c[1] - s * 0.2, s * 0.4, s * 0.4);
  }
  // stubble / beard growth
  const bd = o.beard ?? 0.1;
  if (bd > 0.02) {
    const jc = proj([0, 0.3, 0.24]);
    const g = ctx.createRadialGradient(jc[0], jc[1], s * 0.05, jc[0], jc[1], s * (0.24 + bd * 0.08));
    g.addColorStop(0, `rgba(55,32,20,${0.28 * bd + 0.04})`); g.addColorStop(0.7, `rgba(55,32,20,${0.22 * bd})`); g.addColorStop(1, 'rgba(55,32,20,0)');
    ctx.fillStyle = g; ctx.fillRect(jc[0] - s * 0.5, jc[1] - s * 0.5, s, s);
    const r = rng(17);
    ctx.fillStyle = `rgba(45,26,16,${0.25 + 0.4 * bd})`;
    const n = Math.round(160 + 420 * bd);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, v = r();
      const p = [u * (0.31 - v * 0.15), 0.15 + v * 0.27, 0.22 + (1 - Math.abs(u)) * 0.07];
      if (Math.abs(u) < 0.32 && p[1] > 0.2 && p[1] < 0.29 && Math.abs(u) < 0.12 + (0.29 - p[1])) { /* keep mouth area lighter */ if (r() < 0.6) continue; }
      const q = proj(p);
      if (q[2] < 0.02) continue;
      const d = s * (0.004 + 0.004 * bd);
      ctx.fillRect(q[0], q[1], d, d * 1.6);
    }
  }
  const dt = o.dirt ?? 0;
  if (dt > 0) {
    const r = rng(23);
    for (let i = 0; i < 10; i++) {
      const q = proj([(r() * 2 - 1) * 0.3, -0.15 + r() * 0.5, 0.33]);
      if (q[2] < 0) continue;
      const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], s * (0.03 + r() * 0.06));
      g.addColorStop(0, `rgba(125,62,32,${0.38 * dt})`); g.addColorStop(1, 'rgba(125,62,32,0)');
      ctx.fillStyle = g; ctx.fillRect(q[0] - s * 0.1, q[1] - s * 0.1, s * 0.2, s * 0.2);
    }
  }
  // fringe: hair over the forehead with a clumpy hairline (clipped to the face)
  {
    const hlPts = [];
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const u = -1 + (i / N) * 2;
      const ang = u * 1.5;
      const tipK = i % 2 === 1 ? 1 : 0;             // odd points = strand tips (pointing down)
      const part = u > 0.18 && u < 0.32 ? -0.03 : 0;   // a slight parting
      const yv = -0.29 + Math.abs(u) * 0.13 + tipK * (0.055 + 0.02 * Math.sin(i * 2.3)) + part;
      hlPts.push(proj([Math.sin(ang) * 0.36 + tipK * 0.015, yv, Math.cos(ang) * 0.4]));
    }
    ctx.beginPath();
    ctx.moveTo(-s, -s);
    ctx.lineTo(hlPts[0][0] - s * 0.3, -s);
    ctx.lineTo(hlPts[0][0] - s * 0.05, hlPts[0][1]);
    hlPts.forEach((p, i) => { if (i === 0) ctx.lineTo(p[0], p[1]); else { const q = hlPts[i - 1]; ctx.quadraticCurveTo((p[0] + q[0]) / 2, Math.min(p[1], q[1]), p[0], p[1]); } });
    ctx.lineTo(hlPts[N][0] + s * 0.05, hlPts[N][1]);
    ctx.lineTo(hlPts[N][0] + s * 0.3, -s);
    ctx.closePath();
    ctx.fillStyle = hairC; ctx.fill();
    ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke();
    // shadow the hair casts on the forehead
    ctx.strokeStyle = 'rgba(120,50,30,0.25)'; ctx.lineWidth = s * 0.03;
    ctx.translate(0, s * 0.02); ctx.stroke(); ctx.translate(0, -s * 0.02);
  }
  ctx.restore();

  // hair highlight streaks on top (inside the back-hair hull, above the face)
  ctx.save();
  ctx.beginPath(); smoothClosed(ctx, backHair); ctx.clip();
  ctx.strokeStyle = COL.hairHi; ctx.lineWidth = lw * 1.3; ctx.lineCap = 'round'; ctx.globalAlpha = 0.55;
  for (const u of [-0.17, -0.02, 0.14]) {
    const a = proj([u - 0.03, -0.5, -0.02]), b = proj([u + 0.04, -0.42, 0.18]);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] + s * 0.02, (a[1] + b[1]) / 2, b[0], b[1]); ctx.stroke();
  }
  ctx.restore();

  // near ear on top of the face edge when turned
  if (Math.abs(sy) >= 0.12) drawEar(nearSide);
  // sideburn just in front of the near ear
  {
    const sbp = proj([nearSide * 0.335, -0.02, 0.06]);
    if (sbp[2] > -0.1) {
      ctx.fillStyle = hairC;
      ctx.beginPath(); ctx.moveTo(sbp[0] - s * 0.02, sbp[1] - s * 0.06); ctx.lineTo(sbp[0] + s * 0.02, sbp[1] - s * 0.06); ctx.lineTo(sbp[0] + s * 0.012, sbp[1] + s * 0.05); ctx.lineTo(sbp[0] - s * 0.008, sbp[1] + s * 0.06); ctx.closePath(); ctx.fill();
    }
  }

  // ── eyes & brows (clipped to the face so far-side features never float) ──
  ctx.save();
  ctx.beginPath(); facePath(ctx); ctx.clip();
  const eyeOpen = clamp(ex.eyes * (1 - ex.blink), 0, 1.4);
  for (const side of [-1, 1]) {
    const c = proj([side * 0.15, -0.02, 0.355]);
    const z = c[2];
    if (z < 0.13) continue;
    const fore = clamp(z / 0.355, 0.25, 1);
    const w = s * 0.07 * fore, h = s * 0.048 * eyeOpen * (1 - ex.squint * 0.45);
    // socket shadow
    const sg = ctx.createRadialGradient(c[0], c[1] - h * 0.3, 0, c[0], c[1], w * 1.8);
    sg.addColorStop(0, 'rgba(140,60,40,0.22)'); sg.addColorStop(1, 'rgba(140,60,40,0)');
    ctx.fillStyle = sg; ctx.fillRect(c[0] - w * 2, c[1] - w * 2, w * 4, w * 4);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(c[0] - w, c[1]);
    ctx.quadraticCurveTo(c[0], c[1] - h * 1.5, c[0] + w, c[1] - h * 0.1);
    ctx.quadraticCurveTo(c[0], c[1] + h * (1.1 - ex.squint * 0.5), c[0] - w, c[1]);
    ctx.closePath();
    ctx.fillStyle = COL.sclera; ctx.fill();
    ctx.clip();
    if (h > 0.5) {
      const ir = s * 0.033;
      const ix = c[0] + ex.look[0] * w * 0.45 + sy * w * 0.2, iy = c[1] + ex.look[1] * h * 0.5 - h * 0.1;
      ctx.fillStyle = COL.iris; ctx.beginPath(); ctx.ellipse(ix, iy, ir * fore, ir, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3E5552'; ctx.lineWidth = lw * 0.6; ctx.stroke();
      ctx.fillStyle = '#17100C'; ctx.beginPath(); ctx.ellipse(ix, iy, ir * 0.48 * fore, ir * 0.48, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(ix - ir * 0.32, iy - ir * 0.38, ir * 0.24, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(110,50,35,0.28)'; ctx.fillRect(c[0] - w, c[1] - h * 1.6, w * 2, h * 0.75);
    }
    ctx.restore();
    ctx.strokeStyle = line; ctx.lineCap = 'round';
    ctx.lineWidth = lw * 2.2;
    ctx.beginPath(); ctx.moveTo(c[0] - w * 1.1, c[1] + h * 0.05); ctx.quadraticCurveTo(c[0], c[1] - h * 1.55, c[0] + w * 1.05, c[1] - h * 0.15); ctx.stroke();
    ctx.lineWidth = lw * 0.9; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(c[0] - w * 0.8, c[1] + h * 0.55); ctx.quadraticCurveTo(c[0], c[1] + h * (1.25 - ex.squint * 0.5), c[0] + w * 0.85, c[1] + h * 0.3); ctx.stroke();
    ctx.globalAlpha = 1;
    if ((o.tired ?? 0) > 0) {
      ctx.strokeStyle = `rgba(105,45,58,${0.55 * o.tired})`; ctx.lineWidth = lw * 1.5;
      ctx.beginPath(); ctx.moveTo(c[0] - w * 0.75, c[1] + h + s * 0.02); ctx.quadraticCurveTo(c[0], c[1] + h + s * 0.045, c[0] + w * 0.75, c[1] + h + s * 0.015); ctx.stroke();
    }
    // brow — thick, straight, angular
    const bY = c[1] - s * 0.072 - ex.brow * s * 0.035;
    const innerIsRight = side < 0;
    const yIn = bY - ex.browTilt * s * 0.03, yOut = bY + ex.browTilt * s * 0.012;
    const yL = innerIsRight ? yOut : yIn, yR = innerIsRight ? yIn : yOut;
    const bx0 = c[0] - w * 1.25, bx1 = c[0] + w * 1.25;
    const th = s * 0.032;
    ctx.fillStyle = COL.brow;
    ctx.beginPath();
    ctx.moveTo(bx0, yL + th * 0.35);
    ctx.quadraticCurveTo((bx0 + bx1) / 2, Math.min(yL, yR) - th * 0.8, bx1, yR);
    ctx.lineTo(bx1 - side * w * 0.05, yR + th * 0.95);
    ctx.quadraticCurveTo((bx0 + bx1) / 2, Math.min(yL, yR) + th * 0.25, bx0, yL + th * 1.15);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
  // ── nose: big, hooked, with a bump ──
  {
    const br = proj([0, -0.04, 0.39]), bump = proj([0, 0.035, 0.46]), tip = proj([0, 0.13, 0.49]), base = proj([0, 0.16, 0.41]);
    const wl = proj([-0.065, 0.145, 0.38]), wr = proj([0.065, 0.145, 0.38]);
    const dir = Math.abs(sy) < 0.08 ? 0 : Math.sign(sy);
    const far = dir >= 0 ? wl : wr, near = dir >= 0 ? wr : wl;
    // shadow side plane of the nose
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(br[0], br[1]);
    ctx.quadraticCurveTo(bump[0] + dir * s * 0.014, bump[1], tip[0] + dir * s * 0.022, tip[1]);
    ctx.quadraticCurveTo(tip[0] + dir * s * 0.03, base[1] + s * 0.012, base[0], base[1]);
    ctx.quadraticCurveTo(far[0], far[1] + s * 0.012, far[0] - dir * s * 0.008, far[1] - s * 0.025);
    ctx.quadraticCurveTo(br[0] - dir * s * 0.035, (br[1] + base[1]) / 2, br[0], br[1]);
    ctx.closePath();
    ctx.fillStyle = skin; ctx.fill();
    ctx.fillStyle = `rgba(170,85,55,${0.28 + 0.12 * (o.sunburn ?? 0.45)})`; ctx.fill();
    ctx.restore();
    // cast shadow under the nose
    ctx.fillStyle = 'rgba(120,50,30,0.22)';
    ctx.beginPath(); ctx.ellipse(base[0] + Lt[0] * s * 0.03, base[1] + s * 0.025, s * 0.05, s * 0.016, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = line; ctx.lineWidth = lw * 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(br[0] + dir * s * 0.006, br[1] + s * 0.03);
    ctx.quadraticCurveTo(bump[0] + dir * s * 0.017, bump[1], tip[0] + dir * s * 0.023, tip[1]);
    ctx.quadraticCurveTo(tip[0] + dir * s * 0.03, base[1] + s * 0.013, base[0] - dir * s * 0.01, base[1] + s * 0.004);
    ctx.stroke();
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath(); ctx.arc(far[0] + dir * s * 0.005, far[1], s * 0.02, -0.5 - (dir < 0 ? 2 : 0), 1.6 - (dir < 0 ? 2 : 0)); ctx.stroke();
    ctx.fillStyle = 'rgba(55,18,10,0.75)';
    ctx.beginPath(); ctx.ellipse((far[0] + base[0]) / 2, base[1] - s * 0.002, s * 0.014, s * 0.007, 0.25 * dir, 0, TAU); ctx.fill();
    if (dir === 0 || Math.abs(sy) < 0.5) { ctx.beginPath(); ctx.ellipse((near[0] + base[0]) / 2, base[1] - s * 0.002, s * 0.013, s * 0.0065, -0.25 * dir, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,228,205,0.65)'; ctx.lineWidth = lw * 1.3;
    ctx.beginPath(); ctx.moveTo(br[0] - dir * s * 0.008, br[1] + s * 0.035); ctx.lineTo(bump[0] - dir * s * 0.004, bump[1] + s * 0.025); ctx.stroke();
  }

  // ── mouth ──
  {
    const mc = proj([0, 0.255, 0.355]);
    if (mc[2] > 0.0) {
      const L = proj([-0.11 * (0.7 + ex.wide * 0.4), 0.255 - ex.smile * 0.03, 0.325]);
      const R = proj([0.11 * (0.7 + ex.wide * 0.4), 0.255 - ex.smile * 0.03, 0.325]);
      const open = ex.open * s * 0.09;
      const mid = mc[1] + ex.smile * s * 0.022;
      ctx.lineCap = 'round';
      if (open > s * 0.01) {
        ctx.beginPath();
        ctx.moveTo(L[0], L[1]);
        ctx.quadraticCurveTo(mc[0], mid - open * 0.35, R[0], R[1]);
        ctx.quadraticCurveTo(mc[0], mid + open * 1.3, L[0], L[1]);
        ctx.closePath();
        ctx.fillStyle = '#4A1A14'; ctx.fill();
        ctx.save(); ctx.clip();
        if (ex.teeth > 0) { ctx.fillStyle = `rgba(242,234,220,${ex.teeth})`; ctx.fillRect(L[0] - s, mid - open * 0.5 - s * 0.012, s * 2, open * 0.45); }
        ctx.fillStyle = '#B5474A'; ctx.beginPath(); ctx.ellipse(mc[0], mid + open * 1.0, Math.abs(R[0] - L[0]) * 0.28, open * 0.35, 0, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = line; ctx.lineWidth = lw * 1.5; ctx.stroke();
      } else {
        ctx.strokeStyle = line; ctx.lineWidth = lw * 1.9;
        ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.quadraticCurveTo(mc[0], mid + ex.smile * s * 0.02, R[0], R[1]); ctx.stroke();
        if (ex.smile > 0.3) {
          ctx.lineWidth = lw; ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.arc(L[0] - s * 0.006, L[1] - s * 0.012, s * 0.02, 1.8, 3.6); ctx.stroke();
          ctx.beginPath(); ctx.arc(R[0] + s * 0.006, R[1] - s * 0.012, s * 0.02, -0.5, 1.3); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.strokeStyle = 'rgba(120,50,30,0.45)'; ctx.lineWidth = lw * 1.2;
      ctx.beginPath(); ctx.moveTo(mc[0] - s * 0.035, mid + open * 1.3 + s * 0.035); ctx.quadraticCurveTo(mc[0], mid + open * 1.3 + s * 0.05, mc[0] + s * 0.035, mid + open * 1.3 + s * 0.035); ctx.stroke();
      const ch = proj([0, 0.385, 0.27]);
      ctx.beginPath(); ctx.moveTo(ch[0], ch[1] - s * 0.022); ctx.lineTo(ch[0], ch[1] + s * 0.004); ctx.stroke();
    }
  }
  if ((o.sweat ?? 0) > 0) {
    ctx.fillStyle = 'rgba(225,242,250,0.85)';
    const p = proj([0.24, -0.18, 0.3]);
    ctx.beginPath(); ctx.moveTo(p[0], p[1] - s * 0.03); ctx.quadraticCurveTo(p[0] + s * 0.02, p[1], p[0], p[1] + s * 0.015); ctx.quadraticCurveTo(p[0] - s * 0.02, p[1], p[0], p[1] - s * 0.03); ctx.fill();
  }
  // soft rim light hugging the silhouette on the side away from the key light
  if (o.rim) {
    ctx.save();
    ctx.beginPath(); facePath(ctx); ctx.clip();
    const gr = ctx.createLinearGradient(-Lt[0] * s * 0.5, -Lt[1] * s * 0.5, Lt[0] * s * 0.5, Lt[1] * s * 0.5);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.62, 'rgba(0,0,0,0)'); gr.addColorStop(1, o.rim);
    ctx.beginPath(); facePath(ctx);
    ctx.strokeStyle = gr; ctx.lineWidth = s * 0.045;
    ctx.filter = `blur(${(s * 0.006).toFixed(1)}px)`;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ── full body ────────────────────────────────────────────────────────────────
const BONES = { neck: 34, torso: 290, upper: 190, fore: 172, hand: 80, thigh: 250, shin: 236, head: 225, shoulder: 92, hip: 54 };
export const AARON_BONES = BONES;

/**
 * Full-body Aron. Returns joint positions in screen px to attach props:
 *   { head, handL, handR, elbowL, elbowR, shoulderL, shoulderR, hipL, hipR, footL, footR }
 */
export function drawAaron(ctx, o = {}) {
  const pose = { ...POSES.stand, ...(o.pose || {}) };
  const sc = o.scale ?? 0.5;
  const facing = o.facing ?? 1;
  const Lt0 = o.light || [0.6, 0.8];
  const Lt = [Lt0[0] * facing, Lt0[1]];      // light travel dir in local (mirrored) space
  const outfit = o.outfit || 'climb';
  const line = o.lineColor || COL.line;
  const lw = 2.4;
  const office = outfit === 'office';
  const shirt = office ? COL.office : COL.shirt, shirtSh = office ? COL.officeSh : COL.shirtSh;
  const pants = office ? COL.slacks : COL.shorts, pantsSh = office ? COL.slacksSh : COL.shortsSh;
  const out = {};

  ctx.save();
  ctx.translate(o.x ?? 960, o.y ?? 1000);
  ctx.scale(sc * facing, sc);
  const toScreen = (lx, ly) => { const m = ctx.getTransform(); return [m.a * lx + m.c * ly + m.e, m.b * lx + m.d * ly + m.f]; };

  const legLen = BONES.thigh + BONES.shin + 38;
  const hipX = pose.root[0], hipY = -legLen + pose.root[1];
  const lean = pose.lean;
  const up = [Math.sin(lean), -Math.cos(lean)];
  const perp = [Math.cos(lean), Math.sin(lean)];
  const shoulderC = [hipX + up[0] * BONES.torso, hipY + up[1] * BONES.torso];
  const tw = pose.twist || 0;
  const shW = BONES.shoulder;
  const shL = [shoulderC[0] - perp[0] * shW * (1 - tw * 0.4) - up[0] * 14, shoulderC[1] - perp[1] * shW - up[1] * 14];
  const shR = [shoulderC[0] + perp[0] * shW * (1 + tw * 0.4) - up[0] * 14, shoulderC[1] + perp[1] * shW - up[1] * 14];
  const hpL = [hipX - perp[0] * BONES.hip, hipY - perp[1] * BONES.hip];
  const hpR = [hipX + perp[0] * BONES.hip, hipY + perp[1] * BONES.hip];
  const downAng = lean + Math.PI / 2;

  const armJ = (sh, a) => {
    const a1 = downAng - a.sh;
    const el = [sh[0] + Math.cos(a1) * BONES.upper, sh[1] + Math.sin(a1) * BONES.upper];
    const a2 = a1 - (a.el || 0);
    const wr = [el[0] + Math.cos(a2) * BONES.fore, el[1] + Math.sin(a2) * BONES.fore];
    return { el, wr, a1, a2, a3: a2 - (a.wr || 0) };
  };
  const legJ = (hp, l) => {
    const a1 = Math.PI / 2 - (l.hip || 0);
    const kn = [hp[0] + Math.cos(a1) * BONES.thigh, hp[1] + Math.sin(a1) * BONES.thigh];
    const a2 = a1 + (l.knee || 0);
    const an = [kn[0] + Math.cos(a2) * BONES.shin, kn[1] + Math.sin(a2) * BONES.shin];
    return { kn, an, a1, a2, a3: a2 - Math.PI / 2 - (l.ank || 0) };
  };
  const AL = armJ(shL, pose.armL), AR = armJ(shR, pose.armR);
  const LL = legJ(hpL, pose.legL), LR = legJ(hpR, pose.legR);
  const lerpP = (A, B, t) => [lerp(A[0], B[0], t), lerp(A[1], B[1], t)];

  const drawLeg = (hp, J, far) => {
    const sk = far ? '#C98A64' : COL.skin, skS = far ? '#985A3C' : COL.skinSh;
    // shoe first (shin overlaps its collar)
    ctx.save();
    ctx.translate(J.an[0], J.an[1]);
    ctx.rotate(J.a3);
    const shoe = far ? COL.shoeSh : COL.shoe;
    cel(ctx, (g) => { g.moveTo(-30, -26); g.quadraticCurveTo(-36, 6, -28, 16); g.lineTo(82, 16); g.quadraticCurveTo(98, 10, 90, -6); g.quadraticCurveTo(56, -20, 22, -30); g.closePath(); }, shoe, '#2A2D31', Lt, 9, { line, lw });
    ctx.fillStyle = COL.sole; ctx.beginPath(); ctx.roundRect(-30, 11, 124, 11, 5); ctx.fill();
    ctx.strokeStyle = COL.lace; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(8 + k * 13, -22 + k * 4); ctx.lineTo(18 + k * 13, -11 + k * 4); ctx.stroke(); }
    ctx.restore();
    if (office) {
      cel(ctx, (g) => chainPath(g, [hp, J.kn, J.an], [48, 36, 28], 0.06), far ? pantsSh : pants, far ? '#18191C' : pantsSh, Lt, 16, { line, lw });
    } else {
      cel(ctx, (g) => chainPath(g, [hp, J.kn, J.an], [44, 30, 19], 0.18), sk, skS, Lt, 14, { line, lw });
      // knee hint
      ctx.strokeStyle = skS; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(J.kn[0], J.kn[1], 16, J.a1 - 0.6, J.a1 + 0.9); ctx.stroke(); ctx.globalAlpha = 1;
      const sockTop = lerpP(J.kn, J.an, 0.74);
      cel(ctx, (g) => limbPath(g, sockTop[0], sockTop[1], J.an[0], J.an[1], 22, 21, 0), far ? '#B5AE9F' : COL.sock, '#9E9787', Lt, 8, { line, lw });
      // shorts leg
      const sEnd = lerpP(hp, J.kn, 0.66);
      cel(ctx, (g) => chainPath(g, [lerpP(hp, J.kn, -0.08), sEnd], [56, 44], 0.05), far ? pantsSh : pants, far ? '#33321A' : pantsSh, Lt, 18, { line, lw });
      const pc = lerpP(hp, J.kn, 0.4);
      ctx.save(); ctx.translate(pc[0], pc[1]); ctx.rotate(J.a1 - Math.PI / 2);
      ctx.fillStyle = far ? '#3F3E21' : COL.shortsHi; ctx.strokeStyle = line; ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.roundRect(4, -20, 38, 44, 6); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(42, -8); ctx.stroke();
      ctx.restore();
    }
    out[far ? 'footL' : 'footR'] = toScreen(J.an[0], J.an[1]);
  };

  const drawArm = (sh, J, a, far, isRight) => {
    const sk = far ? '#C98A64' : COL.skin, skS = far ? '#985A3C' : COL.skinSh;
    const state = isRight ? (o.rightArm || 'normal') : 'normal';
    if (state === 'hidden') return;
    if (state === 'stump') {
      const cut = lerpP(J.el, J.wr, 0.5);
      cel(ctx, (g) => chainPath(g, [sh, J.el, cut], [33, 26, 23], 0.16), sk, skS, Lt, 12, { line, lw });
      cel(ctx, (g) => limbPath(g, ...lerpP(J.el, cut, 0.3), cut[0], cut[1], 28, 29, 0.12), COL.bandage, COL.bandageSh, Lt, 9, { line, lw });
      ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = COL.blood;
      ctx.beginPath(); ctx.ellipse(cut[0], cut[1], 21, 19, J.a2, 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = COL.bandageSh; ctx.lineWidth = 2.2;
      for (let k = 0; k < 3; k++) { const p = lerpP(J.el, cut, 0.42 + k * 0.18); ctx.beginPath(); ctx.arc(p[0], p[1], 27, J.a2 + 1.1, J.a2 + 2.1); ctx.stroke(); }
    } else {
      if (office) cel(ctx, (g) => chainPath(g, [sh, J.el, J.wr], [38, 30, 22], 0.1), far ? shirtSh : shirt, far ? '#7A8676' : shirtSh, Lt, 13, { line, lw });
      else cel(ctx, (g) => chainPath(g, [sh, J.el, J.wr], [33, 26, 18], 0.2), sk, skS, Lt, 12, { line, lw });
      if (!office && !isRight) {
        const wp = lerpP(J.el, J.wr, 0.86);
        ctx.save(); ctx.translate(wp[0], wp[1]); ctx.rotate(J.a2);
        ctx.fillStyle = COL.watch; ctx.beginPath(); ctx.roundRect(-10, -21, 20, 42, 4); ctx.fill();
        ctx.fillStyle = '#9FB2B8'; ctx.fillRect(-6, -8, 12, 16);
        ctx.restore();
      }
      drawHand(ctx, J.wr[0], J.wr[1], J.a3, BONES.hand, a.hand || 'relaxed', { light: Lt, skin: sk, skinSh: skS, lineColor: line, thumbSide: 1 });
    }
    if (!office) {
      // t-shirt sleeve continues from the torso
      const se = lerpP(sh, J.el, 0.5);
      cel(ctx, (g) => chainPath(g, [lerpP(sh, J.el, -0.02), se], [37, 33], 0.04), far ? shirtSh : shirt, far ? '#7E5A0C' : shirtSh, Lt, 16, { line, lw });
      ctx.strokeStyle = far ? '#6E4E0A' : shirtSh; ctx.lineWidth = 3;
      const hem = lerpP(sh, J.el, 0.44);
      ctx.beginPath(); ctx.arc(hem[0], hem[1], 31, J.a1 + 1.3, J.a1 + 1.9); ctx.stroke();
    }
    out[isRight ? 'handR' : 'handL'] = toScreen(J.wr[0], J.wr[1]);
    out[isRight ? 'elbowR' : 'elbowL'] = toScreen(J.el[0], J.el[1]);
  };

  // backpack (behind torso)
  if (!office && o.pack !== false) {
    const bc = [lerp(hipX, shoulderC[0], 0.58) - perp[0] * 62, lerp(hipY, shoulderC[1], 0.58) - perp[1] * 62];
    ctx.save(); ctx.translate(bc[0], bc[1]); ctx.rotate(lean);
    cel(ctx, (g) => { g.roundRect(-74, -128, 128, 232, 44); }, COL.pack, COL.packSh, Lt, 16, { line, lw });
    ctx.strokeStyle = COL.packSh; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-64, 18); ctx.lineTo(44, 18); ctx.stroke();
    ctx.restore();
  }
  drawLeg(hpL, LL, true);
  drawArm(shL, AL, pose.armL, true, false);
  drawLeg(hpR, LR, false);

  // pelvis / shorts seat (unifies both legs)
  {
    const fp = (u, v) => [hipX + up[0] * v + perp[0] * u, hipY + up[1] * v + perp[1] * u];
    const seat = (g) => {
      const a = fp(-86, 46), b = fp(88, 46), c = fp(70, -40), d = fp(0, -54), e = fp(-72, -40);
      g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
      g.quadraticCurveTo(fp(96, 0)[0], fp(96, 0)[1], c[0], c[1]);
      g.quadraticCurveTo(d[0], d[1] + 6, e[0], e[1]);
      g.quadraticCurveTo(fp(-96, 0)[0], fp(-96, 0)[1], a[0], a[1]);
      g.closePath();
    };
    cel(ctx, seat, pants, pantsSh, Lt, 18, { line, lw });
  }

  // torso — tapered shirt with shoulder slope and chest
  {
    const fp = (u, v) => [hipX + up[0] * v + perp[0] * u, hipY + up[1] * v + perp[1] * u];
    const torso = (g) => {
      const P = (u, v) => fp(u, v);
      const pts = [
        P(-30, BONES.torso + 10), P(-80, BONES.torso - 2), P(-104, BONES.torso - 30), P(-100, BONES.torso - 110),
        P(-86, 150), P(-84, 70), P(-90, 30), P(0, 22), P(92, 30), P(86, 70), P(90, 150), P(104, BONES.torso - 110),
        P(108, BONES.torso - 30), P(84, BONES.torso - 2), P(30, BONES.torso + 10), P(0, BONES.torso - 8),
      ];
      smoothClosed(g, pts);
    };
    cel(ctx, torso, shirt, shirtSh, Lt, 28, { line, lw });
    ctx.save();
    ctx.beginPath(); torso(ctx); ctx.clip();
    ctx.strokeStyle = shirtSh; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
    [[[-50, 70], [-6, 120]], [[34, 50], [70, 116]], [[-70, 196], [-30, 236]], [[40, 200], [82, 214]]].forEach(([a, b]) => {
      const A = fp(...a), B = fp(...b);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo((A[0] + B[0]) / 2 + 9, (A[1] + B[1]) / 2, B[0], B[1]); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    if (office) {
      const tTop = fp(0, BONES.torso - 6), tBot = fp(6, 70);
      ctx.fillStyle = COL.tie;
      ctx.beginPath(); ctx.moveTo(tTop[0] - 13, tTop[1]); ctx.lineTo(tTop[0] + 13, tTop[1]); ctx.lineTo(tBot[0] + 21, tBot[1]); ctx.lineTo(tBot[0], tBot[1] + 32); ctx.lineTo(tBot[0] - 21, tBot[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2E5E7E'; ctx.lineWidth = 4.5;
      const l1 = fp(-40, BONES.torso - 2), l2 = fp(34, 150), l3 = fp(40, BONES.torso - 2);
      ctx.beginPath(); ctx.moveTo(l1[0], l1[1]); ctx.lineTo(l2[0], l2[1]); ctx.lineTo(l3[0], l3[1]); ctx.stroke();
      ctx.fillStyle = '#F2F0EA'; ctx.beginPath(); ctx.roundRect(l2[0] - 20, l2[1], 40, 52, 4); ctx.fill();
      ctx.fillStyle = '#2E5E7E'; ctx.fillRect(l2[0] - 20, l2[1], 40, 11);
    } else if (o.pack !== false) {
      ctx.strokeStyle = COL.packSh; ctx.lineWidth = 17; ctx.lineCap = 'round';
      const s1 = fp(-40, BONES.torso + 4), s2 = fp(-58, 110);
      ctx.beginPath(); ctx.moveTo(s1[0], s1[1]); ctx.quadraticCurveTo(s1[0] + 12, (s1[1] + s2[1]) / 2, s2[0], s2[1]); ctx.stroke();
      ctx.strokeStyle = COL.tube; ctx.lineWidth = 6.5;
      const t1 = fp(30, BONES.torso + 6), t2 = fp(58, 190), t3 = fp(40, 150);
      ctx.beginPath(); ctx.moveTo(t1[0], t1[1]); ctx.quadraticCurveTo(t2[0] + 10, t2[1], t3[0], t3[1]); ctx.stroke();
    }
    // collar
    ctx.strokeStyle = shirtSh; ctx.lineWidth = 6;
    const c1 = fp(-38, BONES.torso + 6), c2 = fp(0, BONES.torso - 30), c3 = fp(38, BONES.torso + 6);
    ctx.beginPath(); ctx.moveTo(c1[0], c1[1]); ctx.quadraticCurveTo(c2[0], c2[1], c3[0], c3[1]); ctx.stroke();
    // hem shadow over the shorts
    ctx.restore();
  }

  // neck + head
  const neckBase = [shoulderC[0] - up[0] * 4, shoulderC[1] - up[1] * 4];
  const na = lean + (pose.neck || 0);
  const neckTop = [neckBase[0] + Math.sin(na) * BONES.neck, neckBase[1] - Math.cos(na) * BONES.neck];
  cel(ctx, (g) => limbPath(g, neckBase[0], neckBase[1], neckTop[0], neckTop[1], 34, 31, 0), COL.skin, COL.skinSh, Lt, 13, { line, lw });
  const ha = na + (pose.head || 0);
  const headC = [neckTop[0] + Math.sin(ha) * BONES.head * 0.36, neckTop[1] - Math.cos(ha) * BONES.head * 0.36];
  drawHead(ctx, headC[0], headC[1], BONES.head, {
    yaw: pose.yaw, tilt: ha * 0.85, nod: pose.nod, expr: o.expr, beard: o.beard, dirt: o.dirt, sunburn: o.sunburn,
    light: Lt, rim: o.rim, lineColor: line, tired: o.tired, sweat: o.sweat,
  });
  out.head = toScreen(headC[0], headC[1]);
  drawArm(shR, AR, pose.armR, false, true);
  out.hipL = toScreen(...hpL); out.hipR = toScreen(...hpR);
  out.shoulderR = toScreen(...shR); out.shoulderL = toScreen(...shL);
  ctx.restore();
  return out;
}

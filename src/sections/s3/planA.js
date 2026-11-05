// S3 · Plan A — B2 match (multi-tool → brownprint), Sheet A, macro chipping.
import { scene } from '../../core/engine.js';
import { clamp, lerp, ease, seg, kf, rng, noise, TAU, rgba } from '../../core/util.js';
import { C, ROCK } from '../../core/palette.js';
import { text, maskRise } from '../../core/text.js';
import { sandstone } from '../../core/textures.js';
import { drawHand, AARON_COLORS } from '../../core/aaron.js';
import { cam, plane } from '../../core/camera.js';
import {
  W, H, DR, brownprint, lampPool, ink, polyPath, chockPts, hatch, dim, leader, planTitle, titleBlock,
  toolReal, toolDraft, toolPts, TOOL, PHANTOM, HIDDEN, CENTER, skinLimb, hour, win,
} from './lib.js';

const ROT0 = (-8 * Math.PI) / 180;

// ── Sheet A geometry (world = sheet coordinates) ────────────────────────────
const LW_IN = [[985, 100], [1000, 290], [1030, 450], [1058, 600], [1072, 760], [1088, 920]];
const RW_IN = [[1530, 100], [1505, 290], [1468, 450], [1424, 600], [1385, 760], [1352, 920]];
const LEFT_WALL = [[835, 100], ...LW_IN, [835, 920]];
const RIGHT_WALL = [[1690, 100], ...RW_IN.slice().reverse().reverse(), [1690, 920]].length ? [[1690, 100], [1530, 100], [1505, 290], [1468, 450], [1424, 600], [1385, 760], [1352, 920], [1690, 920]] : null;
const CH = { x: 1250, y: 452, size: 332 };
const CHOCK = chockPts(CH.x, CH.y, CH.size, 0);
// Aron phantom figure (stands on the floor under the boulder, right arm up into the pinch)
const AR = {
  head: [1168, 676], headR: 24,
  neck: [1172, 702], hip: [1180, 812],
  footL: [1150, 918], footR: [1214, 918], kneeL: [1160, 866], kneeR: [1206, 866],
  shL: [1150, 716], elL: [1136, 768], wrL: [1144, 818],
  shR: [1196, 714], elR: [1290, 664], wrR: [1418, 588],
};
const PINCH = [1440, 575];
const REMOVE = [[1350, 548], [1384, 520], [1430, 512], [1458, 532], [1450, 566], [1418, 584], [1380, 590], [1352, 576]];
const REMOVE_C = [1404, 552];

// camera keys: [t, [focusX, focusY, zoom, rot]]
const TOOL_SHEET = [372, 822];
const TOOL_S = 0.36;
const Z0 = 1 / TOOL_S;
const F0 = [TOOL_SHEET[0] - (960 - 960) / Z0, TOOL_SHEET[1] - (560 - 540) / Z0];
// final push: REMOVE_C lands at screen (1290, 700)
const Z1 = 2.05;
const F1 = [REMOVE_C[0] - (1290 - 960) / Z1, REMOVE_C[1] - (700 - 540) / Z1];
function camAt(t) {
  const k = kf(t, [
    [303.45, [F0[0], F0[1], Z0, ROT0]],
    [305.35, [960, 540, 1.0, 0], ease.inOutCubic],
    [307.55, [968, 536, 1.03, 0], ease.inOutSine],
    [309.05, [F1[0], F1[1], Z1, 0], ease.inOutCubic],
    [312.5, [F1[0] + 6, F1[1] - 4, Z1 * 1.025, 0], ease.linear],
  ]);
  return { fx: k[0], fy: k[1], z: k[2], rot: k[3] };
}
function applyCam(ctx, c, par = 1) {
  ctx.translate(960, 540);
  ctx.rotate(c.rot);
  const z = Math.pow(c.z, par);
  ctx.scale(z, z);
  ctx.translate(-c.fx, -c.fy);
}
const toScreen = (c, P) => {
  const dx = (P[0] - c.fx) * c.z, dy = (P[1] - c.fy) * c.z;
  const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  return [960 + dx * cs - dy * sn, 540 + dx * sn + dy * cs];
};

function pathOf(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }

function slateGround(ctx) {
  ctx.fillStyle = '#2E3A48'; ctx.fillRect(0, 0, W, H);
  const tex = sandstone(1024, 1024, { seed: 61, ramp: ROCK.cold, scale: 0.8, strata: 0.4, varnish: 0.2, crossbed: 0.2 });
  ctx.save(); ctx.globalAlpha = 0.22; ctx.globalCompositeOperation = 'soft-light';
  ctx.drawImage(tex, 0, 0, W, W); ctx.restore();
  const g = ctx.createRadialGradient(960, 300, 60, 960, 520, 1150);
  g.addColorStop(0, 'rgba(255,196,140,0.20)'); g.addColorStop(0.5, 'rgba(255,196,140,0.05)'); g.addColorStop(1, 'rgba(5,8,12,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// world-space grid + border (vector, crisp at any zoom)
function sheetGrid(ctx, c) {
  const z = c.z;
  ctx.save();
  ctx.lineWidth = 1 / z;
  ctx.strokeStyle = 'rgba(233,223,204,0.045)';
  ctx.beginPath();
  for (let x = 0; x <= W; x += 24) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 24) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(233,223,204,0.085)';
  ctx.beginPath();
  for (let x = 0; x <= W; x += 120) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 120) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(233,223,204,0.5)'; ctx.lineWidth = 2.2;
  ctx.strokeRect(56, 46, W - 112, H - 92);
  ctx.strokeStyle = 'rgba(233,223,204,0.25)'; ctx.lineWidth = 1;
  ctx.strokeRect(68, 58, W - 136, H - 116);
  ctx.restore();
}

/** The trap section drawing (Sheet A content). pr = draw-on progress map fn(name) → 0..1 */
export function drawTrapSection(ctx, t, pr, o = {}) {
  const fade = o.focusFade ?? 0; // dims everything except the pinch zone
  const dimA = 1 - fade * 0.72;
  ctx.save();
  // walls
  ctx.globalAlpha = dimA;
  const wp = pr('walls');
  ink(ctx, LW_IN, wp, { width: 2.6, pen: true });
  ink(ctx, RW_IN, wp, { width: 2.6, pen: true });
  ink(ctx, [[835, 100], [835, 920], [1088, 920]], wp, { width: 1.4, alpha: 0.5 });
  ink(ctx, [[1690, 100], [1690, 920], [1352, 920]], wp, { width: 1.4, alpha: 0.5 });
  const hp = pr('hatch');
  if (hp > 0) {
    hatch(ctx, (g) => pathOf(g, LEFT_WALL), { gap: 15, p: hp, color: 'rgba(233,223,204,0.26)', bbox: [835, 100, 260, 820] });
    hatch(ctx, (g) => pathOf(g, RIGHT_WALL), { gap: 15, p: hp, color: 'rgba(233,223,204,0.26)', bbox: [1350, 100, 340, 820] });
    // strata contour lines inside walls
    ctx.save();
    ctx.globalAlpha *= hp;
    for (const wall of [LEFT_WALL, RIGHT_WALL]) {
      ctx.save(); ctx.beginPath(); pathOf(ctx, wall); ctx.clip();
      ctx.strokeStyle = 'rgba(233,223,204,0.32)'; ctx.lineWidth = 1.3;
      for (let k = 0; k < 9; k++) {
        ctx.beginPath();
        for (let x = 820; x <= 1700; x += 16) {
          const y = 150 + k * 92 + noise.fbm2(x * 0.004 + k, k * 1.7, 3) * 26;
          x === 820 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // floor
  ink(ctx, [[1088, 920], [1352, 920]], wp, { width: 2.2 });
  // chockstone
  const cp = pr('chock');
  ctx.globalAlpha = 1;
  if (cp > 0) {
    // knock out walls behind the stone
    ctx.save(); ctx.globalAlpha = clamp(cp * 3); ctx.beginPath(); pathOf(ctx, CHOCK); ctx.fillStyle = 'rgba(36,23,15,0.94)'; ctx.fill(); ctx.restore();
    ctx.globalAlpha = lerp(dimA, 1, fade);
    ink(ctx, CHOCK, cp, { width: 3, closed: true, pen: true });
    const bp = seg(cp, 0.55, 1);
    if (bp > 0) {
      ctx.save(); ctx.beginPath(); pathOf(ctx, CHOCK); ctx.clip();
      const rx = CH.size * 0.62, ry = CH.size * 0.46;
      ink(ctx, [[CH.x - rx * 1.2, CH.y - ry * 0.05], [CH.x + rx * 1.2, CH.y - ry * 0.45]], bp, { width: 1.4, dash: HIDDEN, alpha: 0.6 });
      ink(ctx, [[CH.x - rx * 1.2, CH.y + ry * 0.12], [CH.x + rx * 1.2, CH.y - ry * 0.28]], bp, { width: 1.4, dash: HIDDEN, alpha: 0.6 });
      ink(ctx, [[CH.x - rx * 1.2, CH.y + ry * 0.35], [CH.x + rx * 1.2, CH.y - ry * 0.02]], bp, { width: 1.4, dash: HIDDEN, alpha: 0.6 });
      // lichen spot (its "eye")
      ctx.globalAlpha *= bp;
      ctx.strokeStyle = DR.line; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(CH.x - rx * 0.42, CH.y - ry * 0.32, 12, 0, TAU); ctx.stroke();
      ctx.fillStyle = DR.line; ctx.beginPath(); ctx.arc(CH.x - rx * 0.42, CH.y - ry * 0.32, 3.5, 0, TAU); ctx.fill();
      ctx.restore();
      // centre mark
      ink(ctx, [[CH.x - 30, CH.y], [CH.x + 30, CH.y]], bp, { width: 1, alpha: 0.5 });
      ink(ctx, [[CH.x, CH.y - 30], [CH.x, CH.y + 30]], bp, { width: 1, alpha: 0.5 });
    }
  }
  // Aron — phantom line figure
  const ap = pr('aron');
  if (ap > 0) {
    ctx.globalAlpha = dimA;
    const lw = 2;
    ctx.save();
    ctx.globalAlpha *= clamp(ap * 2);
    ctx.strokeStyle = DR.line; ctx.lineWidth = lw; ctx.setLineDash(PHANTOM);
    ctx.beginPath(); ctx.arc(AR.head[0], AR.head[1], AR.headR, 0, TAU * ap); ctx.stroke();
    ctx.restore();
    const lim = (pts, a, b) => ink(ctx, pts, seg(ap, a, b), { width: lw, dash: PHANTOM, cap: 'butt' });
    lim([AR.neck, AR.hip], 0.1, 0.45);
    lim([AR.hip, AR.kneeL, AR.footL], 0.3, 0.7);
    lim([AR.hip, AR.kneeR, AR.footR], 0.35, 0.75);
    lim([AR.shL, AR.elL, AR.wrL], 0.4, 0.8);
    lim([AR.shL, AR.shR], 0.3, 0.5);
    ctx.globalAlpha = 1;
    // the trapped right arm — solid outline (subject)
    const armP = seg(ap, 0.5, 1);
    ink(ctx, [AR.shR, AR.elR], armP, { width: 2.6 });
    ink(ctx, [AR.elR, AR.wrR], seg(armP, 0.4, 1), { width: 2.6 });
    // forearm thickness lines
    const off = (P, d) => { const dx = AR.wrR[0] - AR.elR[0], dy = AR.wrR[1] - AR.elR[1], L = Math.hypot(dx, dy); return [P[0] - dy / L * d, P[1] + dx / L * d]; };
    ink(ctx, [off(AR.elR, 13), off(AR.wrR, 11)], seg(armP, 0.5, 1), { width: 1.6, alpha: 0.8 });
    ink(ctx, [off(AR.elR, -13), off(AR.wrR, -11)], seg(armP, 0.5, 1), { width: 1.6, alpha: 0.8 });
    // pressure zone at the pinch
    if (armP > 0.9) {
      const pz = clamp((armP - 0.9) * 10);
      const pulse = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.save();
      ctx.globalAlpha = pz * (0.55 + 0.25 * pulse);
      const g = ctx.createRadialGradient(PINCH[0] - 14, PINCH[1] + 6, 2, PINCH[0] - 14, PINCH[1] + 6, 46);
      g.addColorStop(0, 'rgba(210,48,30,0.8)'); g.addColorStop(1, 'rgba(210,48,30,0)');
      ctx.fillStyle = g; ctx.fillRect(PINCH[0] - 80, PINCH[1] - 70, 160, 140);
      ctx.restore();
    }
  }
  ctx.globalAlpha = dimA;
  dim(ctx, [1088, 920], [1352, 920], '< 3 FT', pr('dim'), { off: 46, size: 24 });
  leader(ctx, 1150, 400, 960, 232, 'CHOCKSTONE', pr('lead1'), { size: 22, shelf: 60 });
  ctx.globalAlpha = lerp(dimA, 1, fade * 0.6);
  leader(ctx, 1352, 628, 1560, 760, 'R. FOREARM', pr('lead2'), { size: 22, shelf: 60 });
  ctx.globalAlpha = dimA;
  // section label
  const sp = pr('label');
  if (sp > 0) {
    maskRise(ctx, 'SECTION  A–A', 1262, 1006, sp, { family: 'mono', size: 22, weight: 600, color: DR.line, align: 'center', tracking: 0.3 });
    text(ctx, 'scale 1 : 20', 1262, 1040 - 4, { family: 'serif', italic: true, size: 24, color: DR.line, align: 'center', alpha: 0.6 * sp });
  }
  ctx.restore();
}

/** Inventory column (left): tool + mini drawings of rope, carabiners, bottle. */
function inventory(ctx, t, p, fade = 0) {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = 1 - fade * 0.75;
  text(ctx, 'INVENTORY', 120, 470, { family: 'mono', size: 18, weight: 600, color: DR.line, tracking: 0.35, alpha: seg(p, 0, 0.3) });
  ink(ctx, [[120, 486], [620, 486]], seg(p, 0, 0.4), { width: 1.2, alpha: 0.6 });
  // rope coil
  const rp = seg(p, 0.1, 0.6);
  for (let k = 0; k < 4; k++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU; pts.push([200 + Math.cos(a) * (46 - k * 6), 600 + Math.sin(a) * (30 - k * 3)]); }
    ink(ctx, pts, rp, { width: 1.6, alpha: 0.85 });
  }
  // carabiners
  const cbp = seg(p, 0.25, 0.75);
  for (let k = 0; k < 3; k++) {
    const cx = 330 + k * 46, cy = 600;
    const pts = [];
    for (let i = 0; i <= 30; i++) { const a = (i / 30) * TAU; pts.push([cx + Math.cos(a) * 15 * (a > Math.PI ? 0.8 : 1), cy + Math.sin(a) * 30]); }
    ink(ctx, pts, cbp, { width: 1.6, alpha: 0.85 });
    ink(ctx, [[cx + 15, cy - 10], [cx + 15, cy + 10]], cbp, { width: 1.1, alpha: 0.6 });
  }
  // bottle
  const bp = seg(p, 0.4, 0.9);
  ink(ctx, [[520, 560], [520, 548], [536, 548], [536, 560], [548, 574], [548, 642], [508, 642], [508, 574], [520, 560]], bp, { width: 1.6, alpha: 0.85 });
  ink(ctx, [[508, 616], [548, 616]], bp, { width: 1, alpha: 0.6, dash: [4, 4] });
  const lp = seg(p, 0.5, 1);
  const lbl = (s, x) => text(ctx, s, x, 680, { family: 'mono', size: 14, weight: 600, color: DR.line, alpha: 0.7 * lp, tracking: 0.2, align: 'center' });
  lbl('01', 200); lbl('02 ×3', 376); lbl('03', 528);
  text(ctx, '04', 120, 884, { family: 'mono', size: 14, weight: 600, color: DR.line, alpha: 0.7 * lp, tracking: 0.2 });
  ctx.restore();
}

// draw-on schedule for the sheet
const SCHED = {
  walls: [303.55, 304.35], hatch: [303.95, 304.85], chock: [304.3, 305.15], aron: [304.85, 305.8],
  dim: [305.45, 306.15], lead1: [305.75, 306.5], lead2: [306.05, 306.8], label: [306.3, 306.9],
  inv: [305.0, 306.4], tblock: [306.4, 307.3],
};
const prAt = (t) => (name) => { const s = SCHED[name]; return s ? seg(t, s[0], s[1], ease.inOutSine) : 1; };

/** Full Sheet A frame (world-space content under a camera). Exported for the "dull" scene. */
export function sheetA(ctx, t, c, o = {}) {
  ctx.save();
  applyCam(ctx, c);
  ctx.drawImage(brownprint(3, { border: 0 }), 0, 0);
  sheetGrid(ctx, c);
  const pr = o.pr || prAt(t);
  inventory(ctx, t, o.inv ?? pr('inv'), o.focusFade || 0);
  toolDraft(ctx, TOOL_SHEET[0], TOOL_SHEET[1], TOOL_S, 0, 1, { width: 2.2 / TOOL_S * 0.45 });
  drawTrapSection(ctx, t, pr, { focusFade: o.focusFade || 0 });
  // REMOVE zone (red)
  const rp = o.remove ?? 0;
  if (rp > 0) {
    ink(ctx, REMOVE, ease.inOutCubic(clamp(rp * 1.6)), { closed: true, color: DR.red, width: 3, dash: [9, 6] });
    hatch(ctx, (g) => pathOf(g, REMOVE), { angle: Math.PI / 4, gap: 7, color: 'rgba(210,48,30,0.75)', width: 1.4, p: seg(rp, 0.35, 1), bbox: [1340, 500, 130, 100] });
    if (o.progress) {
      // the pathetic actual progress: a tiny notch filled
      ctx.save(); ctx.beginPath(); pathOf(ctx, REMOVE); ctx.clip();
      ctx.fillStyle = 'rgba(210,48,30,0.9)';
      ctx.beginPath(); ctx.ellipse(1438, 560, 7 * o.progress, 4 * o.progress, -0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  titleBlock(ctx, 1488, 936, 352, 76, [['PROJECT', 'ESCAPE · BLUE JOHN', 15], ['SHEET', 'A-01   APR 26 2003', 15]], o.tblock ?? pr('tblock'));
  ctx.restore();
  lampPool(ctx, t);
}

scene({
  id: 's3-draft', start: 302.25, end: 310.5,
  post: { grain: 0.06, vignette: 0.34 },
  render(ctx, lt, info) {
    const t = info.t;
    const c = camAt(t);
    const sweep = seg(t, 302.62, 303.62, ease.inOutSine);
    // the section plane is perpendicular to the tool axis
    const sx = lerp(-260, W + 260, sweep);
    const sweepPath = (g) => {
      const dx = Math.tan(-ROT0) * 700;
      g.moveTo(-400, -100); g.lineTo(sx + dx * 0.15, -100); g.lineTo(sx - dx * 0.15 * 1.2, H + 100); g.lineTo(-400, H + 100); g.closePath();
    };
    // 1. real tool on slate (contract frame)
    if (sweep < 1) {
      slateGround(ctx);
      const breathe = Math.sin(lt * 1.3) * 0.004;
      toolReal(ctx, 960, 560, 1 + breathe, ROT0, { light: 1 });
    }
    // 2. brownprint world, revealed left of the section plane
    ctx.save();
    if (sweep < 1) { ctx.beginPath(); sweepPath(ctx); ctx.clip(); }
    const focus = seg(t, 307.75, 308.9, ease.inOutCubic);
    sheetA(ctx, t, c, { focusFade: focus, remove: seg(t, 309.4, 310.25) });
    ctx.restore();
    // 3. the section plane light
    if (sweep > 0 && sweep < 1) {
      ctx.save();
      const dx = Math.tan(-ROT0) * 700 * 0.15;
      const g = ctx.createLinearGradient(sx - 90, 0, sx + 30, 0);
      g.addColorStop(0, 'rgba(233,223,204,0)'); g.addColorStop(0.85, 'rgba(255,236,206,0.18)'); g.addColorStop(1, 'rgba(255,236,206,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx - 90 + dx, -100); ctx.lineTo(sx + 30 + dx, -100); ctx.lineTo(sx + 30 - dx * 1.2, H + 100); ctx.lineTo(sx - 90 - dx * 1.2, H + 100); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,215,0.95)'; ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(255,220,170,0.9)'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(sx + dx, -100); ctx.lineTo(sx - dx * 1.2, H + 100); ctx.stroke();
      ctx.restore();
    }
    // 4. title (screen space)
    const tp = seg(t, 308.3, 309.3);
    planTitle(ctx, 132, 214, 'A', 'CHIP THE ROCK', tp, 0);
    // REMOVE label near the zone once pushed in
    const rl = seg(t, 309.7, 310.4);
    if (rl > 0) {
      const S = toScreen(c, [1430, 520]);
      leader(ctx, S[0], S[1], S[0] + 150, S[1] - 150, 'REMOVE', rl, { color: DR.red, size: 34, shelf: 50 });
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MACRO — chipping the chockstone beside the pinned forearm.
// ─────────────────────────────────────────────────────────────────────────────
const CT = [1290, 700];                 // blade contact on the boulder
const BLADE_DIR = [Math.cos(-0.62), Math.sin(-0.62)];   // tool axis pointing up-right
// strike schedule (absolute times): normal rhythm, time-lapse burst, normal
const STRIKES = (() => {
  const s = [];
  let t = 310.95;
  while (t < 318.4) {
    s.push(t);
    let per = 0.62;
    if (t > 313.35 && t < 314.85) per = 0.2;          // hour after hour (fast-forward)
    else if (t > 316.6) per = 0.7;
    t += per;
  }
  return s;
})();
export const CHIP_STRIKES = STRIKES;

function strikeState(t) {
  // returns { d (offset along blade dir, <=0), k index of last strike, since }
  let k = -1;
  for (let i = 0; i < STRIKES.length; i++) if (STRIKES[i] <= t) k = i;
  const next = STRIKES[k + 1] ?? STRIKES[k] + 0.62;
  const prev = k >= 0 ? STRIKES[k] : 310.3;
  const per = next - prev;
  const u = clamp((t - prev) / per);
  // after impact: scrape (0..0.3), recoil back (0.3..0.75 slowly), strike fast (0.85..1)
  let d;
  if (u < 0.28) d = -ease.outQuad(u / 0.28) * 10;                         // scrape drag
  else if (u < 0.8) d = lerp(-10, -54, ease.outCubic((u - 0.28) / 0.52));   // anticipation
  else d = lerp(-54, 0, ease.inQuart((u - 0.8) / 0.2));                    // strike
  const scrape = u < 0.28 ? ease.outQuad(u / 0.28) : 1;
  return { d, k, since: t - prev, scrape, per };
}

function boulderMacro(info) {
  const b = info.buf('boulder');
  if (b.drawn) return b;
  const g = b.getContext('2d');
  const size = 2200, cx = 420, cy = 120;
  const pts = chockPts(cx, cy, size, 0);
  const tex = sandstone(1400, 1100, { seed: 128, ramp: ROCK.navajo, scale: 1.25, strata: 1.6, varnish: 0.8, crossbed: 0.7, tilt: 0.5 });
  g.save();
  g.beginPath(); pathOf(g, pts); g.clip();
  g.drawImage(tex, -60, -60, 2000, 1571);
  const rx = size * 0.62, ry = size * 0.46;
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgba(120,50,25,0.35)';
  g.beginPath(); g.moveTo(cx - rx * 1.2, cy - ry * 0.05); g.lineTo(cx + rx * 1.2, cy - ry * 0.45); g.lineTo(cx + rx * 1.2, cy - ry * 0.28); g.lineTo(cx - rx * 1.2, cy + ry * 0.12); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(cx - rx * 1.2, cy + ry * 0.35); g.lineTo(cx + rx * 1.2, cy - ry * 0.02); g.lineTo(cx + rx * 1.2, cy + ry * 0.08); g.lineTo(cx - rx * 1.2, cy + ry * 0.45); g.closePath(); g.fill();
  g.globalCompositeOperation = 'source-over';
  // volume: darker towards the lower-right edge (turning away), varnish top
  const vg = g.createRadialGradient(560, 260, 200, 700, 380, 1300);
  vg.addColorStop(0, 'rgba(255,220,170,0.12)'); vg.addColorStop(0.55, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(12,5,2,0.72)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const cap = g.createLinearGradient(0, 0, 0, 380);
  cap.addColorStop(0, 'rgba(30,14,10,0.6)'); cap.addColorStop(1, 'rgba(30,14,10,0)');
  g.fillStyle = cap; g.fillRect(0, 0, W, 380);
  // micro pits & fractures
  const r = rng(77);
  for (let k = 0; k < 260; k++) {
    const x = r() * W, y = r() * H, rr = 1 + r() * 4;
    g.fillStyle = r() < 0.6 ? 'rgba(40,16,8,0.35)' : 'rgba(255,225,185,0.25)';
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(35,14,6,0.5)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(980, 120); g.quadraticCurveTo(1040, 380, 960, 560); g.moveTo(1400, 300); g.quadraticCurveTo(1300, 420, 1340, 540); g.stroke();
  g.restore();
  // rim along the silhouette (warm bounce from the opposite wall)
  g.save(); g.beginPath(); pathOf(g, pts); g.clip();
  g.strokeStyle = 'rgba(255,190,130,0.35)'; g.lineWidth = 26; g.filter = 'blur(10px)';
  g.beginPath(); pathOf(g, pts); g.stroke();
  g.restore();
  b.drawn = true;
  return b;
}
function wallMacro(info) {
  const b = info.buf('wall');
  if (b.drawn) return b;
  const g = b.getContext('2d');
  const tex = sandstone(1024, 1024, { seed: 31, ramp: ROCK.shade, scale: 1.1, strata: 1.2, varnish: 0.9 });
  g.filter = 'blur(3px)';
  g.drawImage(tex, 900, -100, 1200, 1200);
  g.filter = 'none';
  const sh = g.createLinearGradient(1250, 0, 1920, 0);
  sh.addColorStop(0, 'rgba(8,3,2,0.95)'); sh.addColorStop(0.25, 'rgba(8,3,2,0.55)'); sh.addColorStop(1, 'rgba(60,30,18,0.1)');
  g.fillStyle = sh; g.fillRect(900, 0, 1100, H);
  b.drawn = true;
  return b;
}

/** chips emitted from strike k: closed-form ballistic */
function drawChips(ctx, t, light) {
  const ramp = ['#8A3A1F', '#B4542C', '#CF7A45', '#E4A66E', '#F0C995'];
  for (let k = 0; k < STRIKES.length; k++) {
    const t0 = STRIKES[k];
    const dt = t - t0;
    if (dt < 0 || dt > 1.3) continue;
    const r = rng(1000 + k * 17);
    const n = 5 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const ang = -2.2 + r() * 1.9;     // fan up-left .. up-right
      const sp = 380 + r() * 620;
      const vx = Math.cos(ang) * sp - 160, vy = Math.sin(ang) * sp;
      const x = CT[0] + vx * dt, y = CT[1] + vy * dt + 0.5 * 2600 * dt * dt;
      const sz = 2.5 + r() * 6.5;
      const rot = r() * TAU + dt * (r() - 0.5) * 30;
      const a = clamp(1 - dt / 1.2);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = ramp[Math.floor(r() * ramp.length)];
      ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.4); ctx.lineTo(sz * 0.3, -sz * 0.8); ctx.lineTo(sz, sz * 0.2); ctx.lineTo(-sz * 0.2, sz * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,190,0.5)'; ctx.fillRect(-sz * 0.5, -sz * 0.5, sz * 0.5, sz * 0.3);
      ctx.restore();
    }
    // dust puff
    if (dt < 0.9) {
      for (let j = 0; j < 4; j++) {
        const rr = 12 + 70 * ease.outCubic(dt / 0.9) * (0.6 + j * 0.2);
        const px = CT[0] - 30 * j * dt - 20 * dt, py = CT[1] - 26 * dt * (j + 1);
        const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
        const al = 0.28 * (1 - dt / 0.9);
        g.addColorStop(0, `rgba(235,190,140,${al})`); g.addColorStop(1, 'rgba(235,190,140,0)');
        ctx.fillStyle = g; ctx.fillRect(px - rr, py - rr, rr * 2, rr * 2);
      }
    }
  }
}

function drawHandTool(ctx, t, st, o = {}) {
  const off = [BLADE_DIR[0] * st.d, BLADE_DIR[1] * st.d];
  const jitter = noise.n2(t * 9, 3) * 1.6;
  ctx.save();
  ctx.translate(off[0] + jitter, off[1]);
  // left forearm (from lower-left, out of frame)
  const wr = [CT[0] - BLADE_DIR[0] * 380 - 40, CT[1] - BLADE_DIR[1] * 380 + 70];
  const L = o.light || [0.55, 0.8];
  skinLimb(ctx, wr[0] - 380, wr[1] + 330, wr[0], wr[1], 72, 54, { light: L, dirt: 0.45, rim: 'rgba(255,200,150,0.45)', lw: 3.4 });
  // the tool: handle in the fist, blade to the contact
  const tipLocal = -500;              // blade tip in tool local units
  const s = 0.62;
  const ang = Math.atan2(BLADE_DIR[1], BLADE_DIR[0]) + Math.PI;  // tool local -x points along blade dir
  const tx = CT[0] + BLADE_DIR[0] * tipLocal * s * -1 * -1;      // placeholder (recomputed below)
  // place so the blade tip sits at CT
  const cx = CT[0] - BLADE_DIR[0] * (500 * s), cy = CT[1] - BLADE_DIR[1] * (500 * s);
  toolReal(ctx, cx, cy, s, ang, { light: 0.6, shadow: false });
  // fist around the handle
  const fist = [cx + BLADE_DIR[0] * 40 * s * -1 * -1 - BLADE_DIR[0] * 120 * s, cy - BLADE_DIR[1] * 120 * s];
  drawHand(ctx, wr[0], wr[1], Math.atan2(fist[1] - wr[1], fist[0] - wr[0]) - 0.35, 118, 'grip', { light: L, thumbSide: -1 });
  ctx.restore();
  return tx;
}

function chipFrame(ctx, t, info) {
  const st = strikeState(t);
  // time-lapse light swing during "hour after hour"
  const tl = seg(t, 313.35, 314.9, ease.inOutSine);
  const lightA = lerp(-2.35, -1.0, tl) + Math.sin(t * 0.3) * 0.03;
  const L = [Math.cos(lightA + Math.PI) * -1, Math.sin(lightA + Math.PI) * -1];
  const travel = [-Math.cos(lightA), -Math.sin(lightA)];
  // camera
  const zk = kf(t, [
    [310.5, [0, 0, 1.0]], [313.3, [10, -6, 1.05], ease.inOutSine],
    [314.75, [20, -10, 1.06], ease.linear], [315.3, [CT[0] - 960 - 60, CT[1] - 540 + 10, 1.52], ease.outExpo],
    [317.2, [CT[0] - 960 - 40, CT[1] - 540 + 4, 1.6], ease.linear], [317.85, [80, 60, 0.98], ease.inOutCubic],
    [318.05, [80, 60, 0.98], ease.linear], [318.32, [CT[0] - 960 - 180, CT[1] - 540 - 180, 2.6], ease.inQuart], [320.5, [CT[0] - 960 - 190, CT[1] - 540 - 190, 2.7]],
  ]);
  const c = cam({ x: zk[0], y: zk[1], zoom: zk[2] });
  const boulder = boulderMacro(info), wall = wallMacro(info);
  ctx.fillStyle = '#1A0E0A'; ctx.fillRect(0, 0, W, H);
  plane(ctx, c, 1.7, (g) => g.drawImage(wall, 0, 0));
  // pinned right forearm (behind boulder edge)
  plane(ctx, c, 1.12, (g) => {
    skinLimb(g, 960, 1190, 1585, 690, 92, 74, { light: travel, dirt: 0.55, rim: 'rgba(255,190,140,0.35)', lw: 3.6 });
    // vein tension + scrape marks
    g.strokeStyle = 'rgba(120,40,30,0.35)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(1120, 1040); g.quadraticCurveTo(1260, 930, 1400, 840); g.stroke();
  });
  plane(ctx, c, 1.1, (g) => {
    g.drawImage(boulder, 0, 0);
    // crevice shadow where the stone meets the wall, and occlusion over the forearm end
    const cg = g.createLinearGradient(1380, 820, 1620, 640);
    cg.addColorStop(0, 'rgba(10,4,2,0)'); cg.addColorStop(1, 'rgba(10,4,2,0.65)');
    g.fillStyle = cg; g.beginPath(); g.moveTo(1400, 1080); g.lineTo(1500, 760); g.lineTo(1700, 500); g.lineTo(1920, 560); g.lineTo(1920, 1080); g.closePath(); g.fill();
    // light swing across the boulder
    const lg = g.createLinearGradient(960 + Math.cos(lightA) * 900, 540 + Math.sin(lightA) * 900, 960 - Math.cos(lightA) * 900, 540 - Math.sin(lightA) * 900);
    lg.addColorStop(0, `rgba(255,200,130,${0.16 + 0.1 * tl})`); lg.addColorStop(0.5, 'rgba(255,200,130,0)'); lg.addColorStop(1, 'rgba(20,8,4,0.32)');
    g.fillStyle = lg; g.fillRect(-200, -200, W + 400, H + 400);
    // groove (grows imperceptibly)
    const n = STRIKES.filter((s) => s <= t).length;
    const gl = 18 + n * 1.1;
    g.save(); g.translate(CT[0], CT[1]); g.rotate(-0.62 + Math.PI);
    g.fillStyle = 'rgba(245,214,170,0.55)'; g.beginPath(); g.ellipse(gl * 0.4, 0, gl, 7, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(70,28,12,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-4, 0); g.lineTo(gl * 1.2, 1); g.stroke();
    g.restore();
  });
  // shadow of hand+tool on the boulder, then hand+tool
  const tmp = info.tmp();
  plane(tmp.ctx, c, 1.0, (g) => drawHandTool(g, t, st, { light: travel }));
  ctx.save();
  ctx.filter = 'brightness(0) blur(9px)';
  ctx.globalAlpha = 0.45;
  ctx.drawImage(tmp.canvas, travel[0] * 36, travel[1] * 36);
  ctx.restore();
  // time-lapse motion blur ghost
  if (tl > 0 && tl < 1) { ctx.save(); ctx.globalAlpha = 0.35; ctx.drawImage(tmp.canvas, -BLADE_DIR[0] * 22, -BLADE_DIR[1] * 22); ctx.restore(); }
  ctx.drawImage(tmp.canvas, 0, 0);
  plane(ctx, c, 1.0, (g) => drawChips(g, t, travel));
  // foreground occluder rock (bottom-right), blurred
  plane(ctx, c, 0.55, (g) => {
    g.fillStyle = '#140A07';
    g.beginPath(); g.moveTo(1560, 1100); g.quadraticCurveTo(1640, 940, 1800, 910); g.quadraticCurveTo(1900, 900, 2000, 960); g.lineTo(2000, 1100); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,170,110,0.4)'; g.lineWidth = 6; g.stroke();
  }, { blur: 14, tmp: info.tmp });
  // legibility veil top-left for the HOUR counter
  const vg = ctx.createRadialGradient(140, 120, 20, 140, 120, 520);
  vg.addColorStop(0, 'rgba(14,6,4,0.55)'); vg.addColorStop(1, 'rgba(14,6,4,0)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, 700, 600);
  // REMOVE outline carried over the cut
  const rc = 1 - seg(t, 310.9, 311.7, ease.inQuart);
  if (rc > 0) {
    const pts = [[-56, -4], [-20, -32], [26, -40], [54, -20], [46, 14], [14, 32], [-24, 38], [-52, 24]].map(([x, y]) => [CT[0] + 4 + x * 2.05, CT[1] - 6 + y * 2.05]);
    ink(ctx, pts, 1, { closed: true, color: DR.red, width: 3.4, dash: [10, 7], alpha: rc });
  }
  const hrs = 3 + seg(t, 313.4, 314.75, ease.inOutCubic) * 1.0 + seg(t, 314.75, 318.3) * 0.12;
  hour(ctx, t, hrs, 312.6, 318.1);
  // grade: warm late-afternoon, deepening in the time-lapse
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.25 + 0.15 * tl; ctx.fillStyle = '#C46A2A'; ctx.fillRect(0, 0, W, H); ctx.restore();
  // motion blur on the final push
  return c;
}

scene({
  id: 's3-chip', start: 310.5, end: 318.32,
  post: { grain: 0.07, vignette: 0.38 },
  init(info) { boulderMacro(info); wallMacro(info); },
  render(ctx, lt, info) {
    const t = info.t;
    const push = seg(t, 318.0, 318.32, ease.inQuart);
    if (push > 0.02) {
      const tmp = info.tmp();
      chipFrame(tmp.ctx, t, info);
      ctx.filter = `blur(${(push * 10).toFixed(1)}px)`;
      ctx.drawImage(tmp.canvas, 0, 0);
      ctx.filter = 'none';
    } else chipFrame(ctx, t, info);
  },
});

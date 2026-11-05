// S6 · Part I-a — 717.05 → 734.85: title → the dull blade → dying tissue → pain.
import { scene } from '../../core/engine.js';
import { clamp, lerp, ease, seg, kf, rng, noise, TAU, handheld, wiggle, mixColor, rgba } from '../../core/util.js';
import { C, ROCK } from '../../core/palette.js';
import { text, maskRise, richLine, measure } from '../../core/text.js';
import { drawChockstone, softShadow } from '../../core/textures.js';
import { drawHead, EXPR, mixExpr } from '../../core/aaron.js';
import { K, darkGround, label, polyPartial, glow, dimension, cornerMarks, hairStrata } from './common.js';
import { drawMultiTool, drawBlade, edgePoints, drawLoupeEdge } from './tool.js';
import { hud } from './hour.js';
import { aronFace, closeUpBody, strainLines } from './face.js';

const T0 = 717.05;
const lineY = 640;

// tool pose helpers -----------------------------------------------------------
const armTop = (x, dy = 0) => { const u = (x + 60) / 1620; return 742 + dy - Math.sin(u * Math.PI * 0.9) * 26 + u * 34; };
const SPEC = { x: 940, y: 520, s: 2.2, rot: 0 };
const CUT = (() => {
  const rot = 0.42, s = 1.5;
  const pts = edgeWorld({ x: 0, y: 0, s, rot });
  let lo = pts[0];
  for (const p of pts) if (p[1] > lo[1]) lo = p;
  const X = 1060;
  return { x: X - lo[0], y: armTop(X) + 5 - lo[1], s, rot };
})();
function toolPose(lt) {
  const k = seg(lt, 5.55, 6.55, ease.inOutCubic);
  const saw = seg(lt, 6.6, 7.0) * Math.sin((lt - 6.6) * TAU * 1.4) * 9;
  return {
    x: lerp(SPEC.x, CUT.x, k) + saw * Math.cos(CUT.rot),
    y: lerp(SPEC.y, CUT.y, k) + saw * Math.sin(CUT.rot),
    s: lerp(SPEC.s, CUT.s, k),
    rot: lerp(SPEC.rot, CUT.rot, k),
  };
}
function edgeWorld(pose) {
  return edgePoints(210, 30).map(([x, y]) => {
    const c = Math.cos(pose.rot), s = Math.sin(pose.rot);
    return [pose.x + (x * c - y * s) * pose.s, pose.y + (x * s + y * c) * pose.s];
  });
}

// arm line-art (schematic forearm running into the boulder at the right)
function armContours(dy = 0) {
  const top = [], bot = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const x = lerp(-60, 1560, u);
    const bulge = Math.sin(u * Math.PI * 0.9) * 26;
    top.push([x, armTop(x, dy)]);
    bot.push([x, 930 + dy + bulge * 0.5 - u * 30]);
  }
  return { top, bot };
}

scene({
  id: 's6-blade', start: T0, end: 725.35,
  post: { grain: 0.08, vignette: 0.45 },
  render(ctx, lt, info) {
    const t = info.t;
    darkGround(ctx, { glowA: lerp(0.0, 0.45, seg(lt, 2.4, 3.6)), cy: 560 });
    // ── TITLE ───────────────────────────────────────────────────────────────
    const tOut = seg(lt, 2.0, 2.5, ease.inQuart);
    if (tOut < 1) {
      ctx.save();
      const drift = lt * -6;
      ctx.globalAlpha = 1 - tOut;
      ctx.translate(0, -tOut * 40);
      maskRise(ctx, 'now came', 960, 470 + drift * 0.5, seg(lt, 0.12, 0.85), { family: 'serif', italic: true, size: 58, color: C.dust, align: 'center' });
      richLine(ctx, [
        { t: 'the', family: 'title', italic: true, weight: 300, size: 132, color: C.dust },
        { t: 'hardest', family: 'title', weight: 800, size: 132, color: C.bone },
        { t: 'part.', family: 'title', italic: true, weight: 300, size: 132, color: C.dust },
      ], 960, 604 + drift, { align: 'center', gap: 30, p: seg(lt, 0.98, 1.85), stagger: 0.45 });
      ctx.restore();
    }
    // ── the incision line → blade edge ─────────────────────────────────────
    const pose = toolPose(lt);
    const drawP = seg(lt, 0.95, 1.85, ease.inOutCubic);
    const morph = seg(lt, 2.45, 3.3, ease.inOutCubic);
    const edge = edgeWorld(pose);
    const straight = edge.map((_, i) => [lerp(300, 1620, i / (edge.length - 1)), lineY]);
    const pts = straight.map((p, i) => [lerp(p[0], edge[i][0], morph), lerp(p[1], edge[i][1], morph)]);
    // blade + handle reveal
    const reveal = seg(lt, 2.95, 3.75, ease.outCubic);
    if (reveal > 0) {
      ctx.save();
      ctx.globalAlpha = reveal;
      // soft warm top light pool
      const lg = ctx.createRadialGradient(pose.x + 120, pose.y - 200, 20, pose.x + 120, pose.y, 700);
      lg.addColorStop(0, 'rgba(255,190,140,0.10)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, 1920, 1080);
      ctx.restore();
      // the arm (cutting phase) drawn behind the tool
      const armIn = seg(lt, 5.45, 6.4, ease.outCubic);
      if (armIn > 0) drawArm(ctx, lt, armIn, t);
      ctx.save();
      // reveal mask rising from the edge
      ctx.beginPath();
      const rh = 900 * reveal;
      ctx.save();
      ctx.translate(pose.x, pose.y); ctx.rotate(pose.rot);
      ctx.rect(-1200, 60 * pose.s - rh, 2400, rh + 40);
      ctx.restore();
      ctx.clip();
      drawMultiTool(ctx, pose.x, pose.y, pose.s, pose.rot, { fold: 0, stain: seg(lt, 6.4, 7.6) });
      ctx.restore();
    }
    // the hot line (on top until the blade fully exists)
    const lineA = 1 - seg(lt, 3.4, 3.9);
    if (drawP > 0 && lineA > 0) {
      glow(ctx, (g) => polyPartial(g, pts, drawP), K.red, 3.2, { core: '#FFD9C4', alpha: lineA, blur: 8 });
    }
    // ── spec callouts: DULL loupe, 2 IN dimension ──────────────────────────
    const lo = seg(lt, 5.35, 5.75, ease.inQuart);
    const loIn = seg(lt, 3.45, 4.1);
    if (loIn > 0 && lo < 1) {
      const ep = edge[17];
      const lx = 1500, ly = 810, lr = 150;
      ctx.save();
      ctx.globalAlpha = 1 - lo;
      ctx.strokeStyle = 'rgba(233,223,204,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ep[0], ep[1], 16 * ease.outExpo(loIn), 0, TAU); ctx.stroke();
      const lp = ease.outCubic(clamp(loIn * 1.4));
      ctx.beginPath(); ctx.moveTo(ep[0] + 11, ep[1] + 11); ctx.lineTo(lerp(ep[0], lx - lr * 0.72, lp), lerp(ep[1], ly - lr * 0.72, lp)); ctx.stroke();
      drawLoupeEdge(ctx, lx, ly, lr, clamp(loIn * 1.3 - 0.25), t);
      label(ctx, 'DULL', lx - lr - 36, ly + 20, seg(lt, 3.75, 4.3), 0, { size: 30, color: C.bone, tracking: 0.4, align: 'right' });
      label(ctx, 'rolled · chipped', lx - lr - 36, ly + 64, seg(lt, 3.95, 4.5), 0, { family: 'serif', italic: true, size: 32, weight: 400, tracking: 0, color: C.dust, align: 'right' });
      ctx.restore();
    }
    const dimIn = seg(lt, 4.15, 4.95);
    if (dimIn > 0 && lo < 1) {
      ctx.save(); ctx.globalAlpha = 1 - lo;
      const y = pose.y - 44 * pose.s - 60;
      dimension(ctx, pose.x, y, pose.x + 210 * pose.s, y, dimIn, { label: '2 IN', off: -34, labelStyle: { family: 'display', weight: 800, size: 86 }, color: C.bone });
      ctx.restore();
    }
    // ── HOUR hud during cutting ─────────────────────────────────────────────
    const hudA = seg(lt, 5.7, 6.3);
    if (hudA > 0) hud(ctx, 126, t, { alpha: hudA * 0.92 });
  },
});

function drawArm(ctx, lt, a, t) {
  const { top, bot } = armContours(lerp(160, 0, a));
  ctx.save();
  ctx.globalAlpha *= a;
  // body fill (dark, warm) with an inner gradient so it reads as volume
  ctx.beginPath();
  top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 720, 0, 940);
  g.addColorStop(0, 'rgba(90,50,38,0.55)'); g.addColorStop(0.5, 'rgba(48,26,20,0.5)'); g.addColorStop(1, 'rgba(25,14,11,0.6)');
  ctx.fillStyle = g; ctx.fill();
  // contour lines (bone, technical)
  ctx.strokeStyle = 'rgba(233,223,204,0.85)'; ctx.lineWidth = 2.4;
  ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  ctx.beginPath(); bot.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  // inner bones (dashed, x-ray memory)
  ctx.setLineDash([10, 9]); ctx.strokeStyle = 'rgba(233,223,204,0.25)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-60, 800); ctx.bezierCurveTo(500, 790, 1000, 805, 1560, 805); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-60, 870); ctx.bezierCurveTo(500, 868, 1000, 860, 1560, 856); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // boulder at the right edge, cold
  ctx.save();
  ctx.globalAlpha *= a;
  drawChockstone(ctx, 1850, 760, 880, { palette: ROCK.shade, light: -2.3, rim: 'rgba(255,150,110,0.22)' });
  const bg = ctx.createLinearGradient(1300, 0, 1920, 0);
  bg.addColorStop(0, 'rgba(12,8,7,0)'); bg.addColorStop(1, 'rgba(12,8,7,0.55)');
  ctx.fillStyle = bg; ctx.fillRect(1300, 0, 620, 1080);
  ctx.restore();
  // the incision: thin red glowing line along the top contour where the blade meets it
  const cut = seg(lt, 6.45, 7.35, ease.inOutCubic);
  if (cut > 0) {
    const i0 = Math.round((1000 + 60) / 1620 * 40), i1 = i0 + Math.max(1, Math.round(4 * cut));
    const seg2 = top.slice(i0, i1 + 1).map(([x, y]) => [x, y + 2]);
    if (seg2.length > 1) {
      const pulse = 0.75 + 0.25 * Math.sin(t * 6.5);
      glow(ctx, (g) => { g.moveTo(seg2[0][0], seg2[0][1]); seg2.forEach((p) => g.lineTo(p[0], p[1])); }, K.red, 2.6 * pulse, { core: '#FF9C80', blur: 10 });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 725.35 → 731.10  six days without circulation → the tissue dies
// ─────────────────────────────────────────────────────────────────────────────
const DAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU'];
scene({
  id: 's6-tissue', start: 725.35, end: 731.10,
  post: { grain: 0.08, vignette: 0.4 },
  render(ctx, lt, info) {
    const t = info.t;
    darkGround(ctx, { glowA: 0.35, cy: 600 });
    hairStrata(ctx, t, { alpha: 0.035, count: 14 });
    const camX = lerp(0, -40, seg(lt, 0, 6, ease.inOutSine));
    ctx.save();
    ctx.translate(camX, 0);
    // day strip
    const dayP = (k) => seg(lt, 0.62 + k * 0.2, 0.62 + k * 0.2 + 0.25, ease.outExpo); // 725.97 …
    const stripY = 300;
    const x0 = 300, dx = 172;
    for (let k = 0; k < 6; k++) {
      const x = x0 + k * dx;
      const p = dayP(k);
      const inA = seg(lt, 0.05 + k * 0.05, 0.5 + k * 0.05);
      ctx.save();
      ctx.globalAlpha = inA;
      ctx.strokeStyle = 'rgba(233,223,204,0.35)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 66, stripY - 50, 132, 76);
      if (p > 0) { ctx.fillStyle = rgba(K.red, 0.85 * p); ctx.fillRect(x - 66, stripY - 50, 132 * p, 76); }
      text(ctx, DAYS[k], x, stripY, { family: 'mono', size: 28, weight: 600, align: 'center', color: p > 0.5 ? C.paper : C.dust, tracking: 0.2 });
      ctx.restore();
    }
    // the strip's rule and the count
    ctx.save();
    ctx.globalAlpha = seg(lt, 0.0, 0.5);
    ctx.strokeStyle = 'rgba(233,223,204,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0 - 70, stripY + 56); ctx.lineTo(x0 + 5 * dx + 70, stripY + 56); ctx.stroke();
    ctx.restore();
    const nDays = Math.max(1, Math.round(seg(lt, 0.62, 1.87) * 6));
    label(ctx, `${nDays} DAYS · NO CIRCULATION`, x0 - 70, stripY + 102, seg(lt, 0.7, 1.2), 0, { size: 22, color: C.dust, tracking: 0.3 });

    // ── the arm, flowing cells, the pinch, dying tissue ───────────────────
    const decay = seg(lt, 0.62, 5.4, ease.inOutSine); // necrosis front advance
    drawTissueArm(ctx, lt, t, decay);
    ctx.restore();
    // legend LIVING → DYING
    const lgIn = seg(lt, 4.1, 4.7);
    if (lgIn > 0) {
      const lx = 1240, ly = 930, lw = 420;
      ctx.save();
      ctx.globalAlpha = lgIn;
      const gr = ctx.createLinearGradient(lx, 0, lx + lw, 0);
      gr.addColorStop(0, '#C9805E'); gr.addColorStop(0.5, '#8E6A6C'); gr.addColorStop(1, '#4C4352');
      ctx.fillStyle = gr; ctx.fillRect(lx, ly, lw * ease.outExpo(lgIn), 14);
      text(ctx, 'LIVING', lx, ly - 16, { family: 'mono', size: 18, weight: 600, color: C.dust, tracking: 0.3 });
      text(ctx, 'DYING', lx + lw, ly - 16, { family: 'mono', size: 18, weight: 600, color: C.dust, tracking: 0.3, align: 'right' });
      const mk = lerp(0.15, 0.92, seg(lt, 4.5, 5.45, ease.inOutCubic));
      ctx.fillStyle = C.bone;
      ctx.beginPath(); ctx.moveTo(lx + lw * mk, ly + 18); ctx.lineTo(lx + lw * mk - 9, ly + 34); ctx.lineTo(lx + lw * mk + 9, ly + 34); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },
});

function drawTissueArm(ctx, lt, t, decay) {
  const yT = 520, yB = 700;
  const pinch = 1430;
  const top = (x) => yT - Math.sin(clamp(x / 1500) * Math.PI) * 22 + (x > pinch - 90 ? Math.min(40, (x - pinch + 90) * 0.4) : 0);
  const bot = (x) => yB + Math.sin(clamp(x / 1500) * Math.PI) * 12 - (x > pinch - 90 ? Math.min(30, (x - pinch + 90) * 0.3) : 0);
  const path = (g) => {
    g.moveTo(-80, top(-80));
    for (let x = -80; x <= 1700; x += 20) g.lineTo(x, top(x));
    for (let x = 1700; x >= -80; x -= 20) g.lineTo(x, bot(x));
    g.closePath();
  };
  // necrosis front: from the pinch leftward
  const front = lerp(pinch + 80, 820, decay);
  ctx.save();
  ctx.beginPath(); path(ctx);
  const g = ctx.createLinearGradient(front - 260, 0, front + 120, 0);
  g.addColorStop(0, '#B8735A'); g.addColorStop(0.55, '#7A5D5E'); g.addColorStop(1, '#4B4246');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // muscle fibre hairlines
  ctx.strokeStyle = 'rgba(40,18,14,0.28)'; ctx.lineWidth = 1.4;
  for (let k = 0; k < 16; k++) {
    ctx.beginPath();
    for (let x = -80; x <= 1700; x += 30) { const y = lerp(yT, yB, (k + 0.5) / 16) + noise.n2(x * 0.004, k) * 8; x === -80 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // vessel
  const vy = (x) => lerp(top(x), bot(x), 0.42);
  ctx.strokeStyle = 'rgba(120,20,14,0.55)'; ctx.lineWidth = 16;
  ctx.beginPath(); for (let x = -80; x <= pinch - 20; x += 20) x === -80 ? ctx.moveTo(x, vy(x)) : ctx.lineTo(x, vy(x)); ctx.stroke();
  ctx.strokeStyle = 'rgba(70,30,40,0.5)'; ctx.lineWidth = 10;
  ctx.beginPath(); for (let x = pinch + 20; x <= 1700; x += 20) x === pinch + 20 ? ctx.moveTo(x, vy(x)) : ctx.lineTo(x, vy(x)); ctx.stroke();
  // flowing red cells: move right, pile up before the pinch, then nothing beyond
  const r = rng(9);
  for (let i = 0; i < 46; i++) {
    const base = r() * 1500, sp = 140 + r() * 60, off = (r() - 0.5) * 9;
    let x = ((base + t * sp) % 1500) - 80;
    // compression near the pinch: cells slow and stack
    const q = clamp((x - (pinch - 360)) / 340);
    x = lerp(x, pinch - 40 - (1 - q) * 300 - i % 7 * 9, q * q * 0.9);
    if (x > pinch - 26) continue;
    const y = vy(x) + off;
    const stall = clamp((x - (pinch - 300)) / 280);
    ctx.fillStyle = mixColor('#E0473A', '#6B2230', stall);
    ctx.beginPath(); ctx.ellipse(x, y, 7, 4.5, 0, 0, TAU); ctx.fill();
  }
  // stalled dark cells beyond the pinch (dead, still)
  for (let i = 0; i < 12; i++) { const x = pinch + 40 + i * 30 + (i % 3) * 7; ctx.fillStyle = 'rgba(60,40,52,0.8)'; ctx.beginPath(); ctx.ellipse(x, vy(x) + ((i % 2) - 0.5) * 6, 6.5, 4, 0.3, 0, TAU); ctx.fill(); }
  // cold vignette over the dying region
  const dg = ctx.createLinearGradient(front - 200, 0, 1700, 0);
  dg.addColorStop(0, 'rgba(40,36,44,0)'); dg.addColorStop(1, 'rgba(30,26,32,0.35)');
  ctx.fillStyle = dg; ctx.fillRect(front - 200, 0, 2000, 1080);
  ctx.restore();
  // outline
  ctx.strokeStyle = 'rgba(233,223,204,0.85)'; ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let x = -80; x <= 1700; x += 20) x === -80 ? ctx.moveTo(x, top(x)) : ctx.lineTo(x, top(x));
  ctx.stroke();
  ctx.beginPath();
  for (let x = -80; x <= 1700; x += 20) x === -80 ? ctx.moveTo(x, bot(x)) : ctx.lineTo(x, bot(x));
  ctx.stroke();
  ctx.restore();
  // the boulder pinching from above-right
  drawChockstone(ctx, 1790, 420, 640, { palette: ROCK.shade, light: -2.3, rim: 'rgba(255,150,110,0.25)' });
  { const bg = ctx.createLinearGradient(1380, 0, 1920, 0); bg.addColorStop(0, 'rgba(14,9,8,0)'); bg.addColorStop(1, 'rgba(14,9,8,0.5)'); ctx.fillStyle = bg; ctx.fillRect(1380, 0, 540, 1080); }
  // the trapped hand, implied: dashed x-ray memory over the boulder
  ctx.save();
  ctx.globalAlpha = 0.35; ctx.setLineDash([9, 8]); ctx.strokeStyle = C.bone; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pinch + 20, 548); ctx.quadraticCurveTo(pinch + 120, 530, pinch + 190, 540);
  for (let f = 0; f < 4; f++) { const fy = 548 + f * 26; ctx.lineTo(pinch + 290 - Math.abs(f - 1.3) * 18, fy); ctx.quadraticCurveTo(pinch + 305 - Math.abs(f - 1.3) * 18, fy + 11, pinch + 285 - Math.abs(f - 1.3) * 18, fy + 22); }
  ctx.quadraticCurveTo(pinch + 160, 680, pinch + 20, 664);
  ctx.stroke();
  ctx.restore();
  // pressure arrows at the pinch
  const pa = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.save();
  ctx.strokeStyle = rgba(K.red, 0.8 * pa); ctx.fillStyle = rgba(K.red, 0.8 * pa); ctx.lineWidth = 3;
  for (const dx of [-30, 20]) {
    const x = pinch + dx, y0 = 380, y1 = top(x) - 16;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y1 + 6); ctx.lineTo(x - 8, y1 - 8); ctx.lineTo(x + 8, y1 - 8); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // TISSUE callout on the dying zone
  const cp = seg(lt, 4.3, 4.9);
  if (cp > 0) {
    const x = lerp(front, 1380, 0.45), y = lerp(top(x), bot(x), 0.7);
    ctx.save();
    ctx.strokeStyle = C.bone; ctx.fillStyle = C.bone; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 5 * cp, 0, TAU); ctx.fill();
    const e = ease.outCubic(cp);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 80 * e, y + 120 * e); ctx.lineTo(x - 80 * e - 90 * clamp(cp * 2 - 1), y + 120 * e); ctx.stroke();
    ctx.restore();
    label(ctx, 'TISSUE', x - 190, y + 112, clamp(cp * 2 - 1), 0, { size: 26, align: 'right', color: C.bone });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 731.10 → 734.85  "…enough to make a person pass out" — face + pain ruler
// ─────────────────────────────────────────────────────────────────────────────
scene({
  id: 's6-pain', start: 731.10, end: 734.85,
  post: { grain: 0.09, vignette: 0.5 },
  render(ctx, lt, info) {
    const t = info.t;
    darkGround(ctx, { base: '#160E0C', glow: '#5A1A12', glowA: 0.5, cx: 760, cy: 640 });
    const hh = handheld(t, 2.2 + seg(lt, 2.0, 3.2) * 2.5, 6);
    const beat = Math.pow(Math.max(0, Math.sin((t * 1.42) * Math.PI)), 12); // heartbeat thump
    ctx.save();
    ctx.translate(hh.x, hh.y); ctx.rotate(hh.r);
    const push = lerp(1, 1.08, seg(lt, 0, 3.75, ease.inOutSine)) + beat * 0.006;
    ctx.translate(790, 560); ctx.scale(push, push); ctx.translate(-790, -560);
    // under-light glow on the face side
    const ug = ctx.createRadialGradient(760, 900, 40, 760, 760, 620);
    ug.addColorStop(0, 'rgba(210,48,30,0.35)'); ug.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ug; ctx.fillRect(0, 0, 1920, 1080);
    const AGONY = { ...EXPR.pain, brow: -0.6, browTilt: 0.95, eyes: 0.22, squint: 1, smile: -0.65, open: 0.3, wide: 1, teeth: 1 };
    const ex = mixExpr(mixExpr(EXPR.determined, EXPR.pain, seg(lt, 0.75, 1.3)), AGONY, seg(lt, 2.0, 2.9));
    const yaw = 0.42 + wiggle(t, 0.4, 0.04, 2), tilt = -0.06 + wiggle(t, 0.5, 0.03, 4);
    closeUpBody(ctx, 790, 540, 940, { yaw, tilt, dirt: 0.6 });
    aronFace(ctx, 790, 540, 940, { yaw, tilt, nod: 0.06, expr: ex, beard: 0.95, dirt: 0.85, grime: 0.7, tired: 0.85, sunburn: 0.55, sweat: 1, light: [-0.4, -0.9], rim: 'rgba(255,90,60,0.85)',
      grade: { from: [-0.4, -0.5], to: [0.3, 0.5], a: 'rgba(20,8,6,0.35)', b: 'rgba(210,48,30,0.18)' } });
    strainLines(ctx, 790, 540, 940, { yaw, tilt, nod: 0.06 }, seg(lt, 0.7, 1.4));
    // sliding sweat beads
    for (let k = 0; k < 3; k++) {
      const ph = ((lt * 0.35 + k * 0.33) % 1);
      const x = 790 + [-190, 150, 250][k], y = 540 - 300 + ph * 260 + k * 36;
      ctx.fillStyle = `rgba(230,240,245,${0.7 * Math.sin(ph * Math.PI)})`;
      ctx.beginPath(); ctx.ellipse(x, y, 5, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.8 * Math.sin(ph * Math.PI)})`; ctx.beginPath(); ctx.arc(x - 1.5, y - 3, 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // pain ruler ------------------------------------------------------------
    const rx = 1560, y0 = 860, y1 = 220;
    const inA = seg(lt, 0.1, 0.6);
    const lvl = kf(lt, [[0.5, 1.5], [0.95, 5.2, ease.outCubic], [1.8, 6.4], [2.6, 8.4, ease.inOutCubic], [3.15, 10.6, ease.inQuad]]);
    const yOf = (v) => lerp(y0, y1, v / 10.5);
    ctx.save();
    ctx.globalAlpha = inA;
    ctx.strokeStyle = 'rgba(233,223,204,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(rx, y0); ctx.lineTo(rx, y1 - 30); ctx.stroke();
    for (let v = 0; v <= 10; v++) {
      const y = yOf(v);
      ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + (v % 5 ? 14 : 26), y); ctx.stroke();
      if (v % 5 === 0) text(ctx, String(v), rx + 40, y + 8, { family: 'mono', size: 20, color: C.dust, weight: 400 });
    }
    // fill
    const fy = yOf(Math.min(lvl, 10.5));
    const fg = ctx.createLinearGradient(0, y0, 0, y1);
    fg.addColorStop(0, '#5A1A12'); fg.addColorStop(0.6, K.red); fg.addColorStop(1, '#FF8A5C');
    ctx.fillStyle = fg; ctx.fillRect(rx - 22, fy, 16, y0 - fy);
    ctx.shadowColor = K.red; ctx.shadowBlur = 20; ctx.fillRect(rx - 22, fy, 16, 3); ctx.shadowBlur = 0;
    // PASS OUT threshold
    const ty = yOf(9);
    const crossed = lvl > 9;
    const fl = crossed ? 0.5 + 0.5 * Math.sign(Math.sin(t * 22)) : 1;
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = rgba(K.red, 0.9 * fl); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rx - 170, ty); ctx.lineTo(rx + 30, ty); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    label(ctx, 'PASS OUT', rx - 180, ty - 14, seg(lt, 1.6, 2.2), 0, { size: 24, align: 'right', color: crossed ? K.red : C.bone });
    label(ctx, 'PAIN', rx - 30, y0 + 52, seg(lt, 0.3, 0.8), 0, { size: 20, color: C.dust });
    // faint: vignette closing like losing consciousness, then the iris hand-off
    const faint = seg(lt, 3.0, 3.75, ease.inCubic);
    if (faint > 0) {
      const r = lerp(1400, 120, faint);
      const g = ctx.createRadialGradient(960, 540, r * 0.55, 960, 540, r);
      g.addColorStop(0, 'rgba(10,6,5,0)'); g.addColorStop(1, 'rgba(10,6,5,1)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = `rgba(10,6,5,${faint * 0.5})`; ctx.fillRect(0, 0, 1920, 1080);
    }
  },
});

// S7 cast — everything drawn in the same cel-shaded, #2A1712-outlined style as aaron.js.
//   drawProsthetic(ctx, joints, sc, o)   carbon socket + quick-release + terminal device
//   greyBeard(ctx, head, sc, o)           fuller grey-flecked beard for older Aron (2010+)
//   drawDonna(ctx, o)                     the mother (waist-up), cordless phone
//   drawLeo(ctx, o)                       the son (~3 y), run / lifted poses
//   drawRescuer(ctx, o)                   helmeted rescuer, small scale
//   drawFigurine(ctx, x, y, h, kind, o)   sky-blue tabletop figurines (finale)
import { clamp, lerp, TAU, rng, cel, limbPath, chainPath, smoothClosed, smoothOpen, LINE } from './lib.js';
import { drawHand } from '../../core/aaron.js';

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// ── prosthetic ───────────────────────────────────────────────────────────────
/**
 * joints = return value of drawAaron(...{ rightArm:'stump' }). sc = the rig scale.
 * o: { tool:'hook'|'axe'|'clamp'|'none', light:[x,y], swing (rad extra wrist angle), cuff:true }
 */
export function drawProsthetic(ctx, j, sc, o = {}) {
  const el = j.elbowR, wr = j.handR;
  if (!el || !wr) return;
  const ang = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
  const L = Math.hypot(wr[0] - el[0], wr[1] - el[1]);
  const k = L / 172; // rig units → px
  const lt = o.light || [0.6, 0.8];
  const ll = rot(lt[0], lt[1], -ang); // light in local frame
  ctx.save();
  ctx.translate(el[0], el[1]);
  ctx.rotate(ang);
  const lw = Math.max(1, 2.2 * k);
  // liner cuff (grey-blue technical fabric) over the forearm stump
  cel(ctx, (g) => limbPath(g, L * 0.16, 0, L * 0.3, 0, 30 * k, 31 * k, 0.02), '#55626B', '#3A444B', ll, 6 * k, { line: LINE, lw });
  // carbon socket
  const sock = (g) => {
    g.moveTo(L * 0.24, -33 * k);
    g.quadraticCurveTo(L * 0.45, -36 * k, L * 0.66, -27 * k);
    g.lineTo(L * 0.66, 27 * k);
    g.quadraticCurveTo(L * 0.45, 36 * k, L * 0.24, 33 * k);
    g.quadraticCurveTo(L * 0.2, 0, L * 0.24, -33 * k);
    g.closePath();
  };
  cel(ctx, sock, '#2B2E33', '#16181B', ll, 10 * k, { line: LINE, lw, hi: '#5B626B', hiA: 0.7 });
  // carbon weave hatch
  ctx.save();
  ctx.beginPath(); sock(ctx); ctx.clip();
  ctx.strokeStyle = 'rgba(160,170,180,0.13)'; ctx.lineWidth = Math.max(0.6, 1.4 * k);
  for (let x = L * 0.18; x < L * 0.72; x += 7 * k) {
    ctx.beginPath(); ctx.moveTo(x, -40 * k); ctx.lineTo(x + 30 * k, 40 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 30 * k, -40 * k); ctx.lineTo(x, 40 * k); ctx.stroke();
  }
  // specular band
  const sg = ctx.createLinearGradient(0, -34 * k, 0, 34 * k);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.28, 'rgba(255,255,255,0.22)'); sg.addColorStop(0.36, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(L * 0.2, -40 * k, L * 0.5, 80 * k);
  ctx.restore();
  // strap
  ctx.fillStyle = '#1D1F22';
  ctx.fillRect(L * 0.34, -36 * k, 9 * k, 72 * k);
  // quick-release ring (ember anodised) + lever
  cel(ctx, (g) => g.roundRect(L * 0.64, -24 * k, 14 * k, 48 * k, 3 * k), '#E0632A', '#A8401A', ll, 4 * k, { line: LINE, lw });
  cel(ctx, (g) => { g.moveTo(L * 0.66, -24 * k); g.lineTo(L * 0.6, -40 * k); g.lineTo(L * 0.63, -42 * k); g.lineTo(L * 0.71, -24 * k); g.closePath(); }, '#E0632A', '#A8401A', ll, 3 * k, { line: LINE, lw: lw * 0.8 });
  // pylon
  cel(ctx, (g) => g.roundRect(L * 0.72, -9 * k, L * 0.3, 18 * k, 5 * k), '#A9B2B8', '#6E777D', ll, 4 * k, { line: LINE, lw, hi: '#E6ECEF', hiA: 0.8 });
  // terminal device
  const tool = o.tool || 'hook';
  ctx.translate(L * 1.0, 0);
  ctx.rotate(o.swing || 0);
  if (tool === 'hook') {
    const hk = (g) => {
      g.moveTo(-4 * k, -10 * k);
      g.quadraticCurveTo(40 * k, -16 * k, 52 * k, 10 * k);
      g.quadraticCurveTo(58 * k, 34 * k, 34 * k, 40 * k);
      g.quadraticCurveTo(22 * k, 42 * k, 18 * k, 32 * k);
      g.lineTo(26 * k, 28 * k);
      g.quadraticCurveTo(40 * k, 30 * k, 40 * k, 14 * k);
      g.quadraticCurveTo(34 * k, -2 * k, -4 * k, 6 * k);
      g.closePath();
    };
    cel(ctx, hk, '#B8C0C5', '#727B81', ll, 5 * k, { line: LINE, lw, hi: '#F2F5F6', hiA: 0.8 });
  } else if (tool === 'axe') {
    // head: pick curving down-forward with teeth, small adze behind
    cel(ctx, (g) => g.roundRect(-6 * k, -14 * k, 22 * k, 28 * k, 4 * k), '#3A3E43', '#1F2226', ll, 4 * k, { line: LINE, lw });
    const pick = (g) => {
      g.moveTo(10 * k, -12 * k);
      g.quadraticCurveTo(70 * k, -10 * k, 112 * k, 26 * k);
      g.lineTo(108 * k, 32 * k);
      g.quadraticCurveTo(66 * k, 8 * k, 12 * k, 8 * k);
      g.closePath();
    };
    cel(ctx, pick, '#C3CACE', '#7D868C', ll, 5 * k, { line: LINE, lw, hi: '#FFFFFF', hiA: 0.7 });
    ctx.strokeStyle = LINE; ctx.lineWidth = lw * 0.8;
    for (let i = 0; i < 6; i++) {
      const u = 0.35 + i * 0.1;
      const px = lerp(12, 108, u) * k, py = lerp(8, 30, u * u) * k;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 4 * k, py + 6 * k); ctx.lineTo(px + 8 * k, py + 1 * k); ctx.stroke();
    }
    cel(ctx, (g) => { g.moveTo(4 * k, -12 * k); g.lineTo(-30 * k, -26 * k); g.lineTo(-34 * k, -14 * k); g.lineTo(2 * k, 0); g.closePath(); }, '#C3CACE', '#7D868C', ll, 4 * k, { line: LINE, lw });
  } else if (tool === 'clamp') {
    for (const s of [-1, 1]) {
      cel(ctx, (g) => { g.moveTo(0, s * 4 * k); g.quadraticCurveTo(30 * k, s * 22 * k, 46 * k, s * 8 * k); g.lineTo(44 * k, s * 2 * k); g.quadraticCurveTo(26 * k, s * 10 * k, 0, s * 12 * k); g.closePath(); }, '#B8C0C5', '#727B81', ll, 4 * k, { line: LINE, lw });
    }
  }
  ctx.restore();
}

/** Same head projection as aaron.js drawHead (for overlays that must stick to the face). */
export function headProjector(head, size, o = {}) {
  const yawA = clamp(o.yaw ?? 0.3, -1, 1) * 1.05;
  const nod = o.nod || 0, tilt = o.tilt || 0, f = o.facing ?? 1;
  const cy = Math.cos(yawA), sy = Math.sin(yawA), cn = Math.cos(nod), sn = Math.sin(nod);
  const ta = f * tilt, ct = Math.cos(ta), st = Math.sin(ta);
  return (p) => {
    const X = p[0] * cy + p[2] * sy, Z = -p[0] * sy + p[2] * cy, Y = p[1];
    const lx = f * X * size, ly = (Y * cn - Z * sn) * size;
    return [head[0] + lx * ct - ly * st, head[1] + lx * st + ly * ct, Y * sn + Z * cn];
  };
}
/** pose → the head transform drawAaron uses (yaw, nod, tilt) */
export function headOpts(pose, facing = 1) {
  const ha = (pose.lean || 0) + (pose.neck || 0) + (pose.head || 0);
  return { yaw: pose.yaw ?? 0.35, nod: pose.nod || 0, tilt: ha * 0.85, facing };
}
/** Fuller beard with grey flecks + grey temples for older Aron. sizePx = 225 * sc */
export function greyBeard(ctx, head, sizePx, o = {}) {
  const pr = headProjector(head, sizePx, o);
  const r = rng(808);
  ctx.save();
  // soft beard mass
  const jaw = [[-0.33, 0.04, 0.08], [-0.31, 0.18, 0.12], [-0.24, 0.32, 0.17], [-0.12, 0.42, 0.24], [0, 0.445, 0.26], [0.12, 0.42, 0.24], [0.24, 0.32, 0.17], [0.31, 0.18, 0.12], [0.33, 0.04, 0.08],
    [0.26, 0.13, 0.28], [0.14, 0.2, 0.34], [0.07, 0.31, 0.36], [-0.07, 0.31, 0.36], [-0.14, 0.2, 0.34], [-0.26, 0.13, 0.28]].map(pr);
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#4A3226';
  ctx.beginPath(); smoothClosed(ctx, jaw.map((q) => [q[0], q[1]])); ctx.fill();
  ctx.globalAlpha = 1;
  // flecks
  const n = 260;
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, v = r();
    const p = [u * (0.32 - v * 0.15), 0.12 + v * 0.31, 0.23 + (1 - Math.abs(u)) * 0.08];
    if (Math.abs(u) < 0.3 && p[1] > 0.22 && p[1] < 0.3) continue; // mouth
    const q = pr(p);
    if (q[2] < 0.03) continue;
    const g = r();
    ctx.strokeStyle = g < 0.42 ? 'rgba(214,208,198,0.85)' : g < 0.55 ? 'rgba(150,140,128,0.8)' : 'rgba(58,36,24,0.7)';
    ctx.lineWidth = Math.max(0.7, sizePx * 0.006);
    const a = (r() - 0.5) * 0.8 + Math.PI / 2;
    const len = sizePx * (0.012 + r() * 0.012);
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + Math.cos(a) * len, q[1] + Math.sin(a) * len); ctx.stroke();
  }
  // grey temples
  for (const side of [-1, 1]) {
    for (let i = 0; i < 26; i++) {
      const q = pr([side * (0.33 + r() * 0.03), -0.2 + r() * 0.2, 0.02 + r() * 0.1]);
      if (q[2] < -0.05) continue;
      ctx.strokeStyle = 'rgba(205,200,192,0.7)';
      ctx.lineWidth = Math.max(0.6, sizePx * 0.005);
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + sizePx * 0.004 * side, q[1] + sizePx * 0.025); ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Donna (mother) ───────────────────────────────────────────────────────────
const DC = {
  skin: '#EDB894', skinSh: '#C98A68', blush: '#E08A78',
  hair: '#CFCBC6', hairSh: '#9E9993', hairHi: '#F1EFEB',
  card: '#5FB8E6', cardSh: '#3A8DC0', cardHi: '#9AD3F0',
  blouse: '#F4EEE3', blouseSh: '#D8CDBA',
  frame: '#5B3417', frameHi: '#A8682E',
  phone: '#3B4045', phoneSh: '#22262A',
};
/**
 * Donna waist-up. o: { x, y (neck base), s (scale; head ≈ 240*s), t, talk 0..1, yaw, worry 0..1,
 *   tap (0..1 phase of the finger tap), point:true, blink 0..1, light:[x,y], nod }
 */
export function drawDonna(ctx, o = {}) {
  const s = o.s ?? 1;
  const t = o.t ?? 0;
  const yaw = o.yaw ?? 0.22;
  const Lt = o.light || [-0.55, 0.8];
  const lw = 2.4;
  ctx.save();
  ctx.translate(o.x ?? 600, o.y ?? 700);
  ctx.scale(s, s);
  const breathe = Math.sin(t * 1.7) * 3;
  // ── far arm (screen-right): reaches toward the calendar, finger tapping
  const tap = o.tap ?? 0;
  const shR = [128, 30 + breathe * 0.3];
  const elR = [250, 150];
  const reach = o.point === false ? 0 : 1;
  const handR = [lerp(200, 372 + Math.sin(tap * TAU) * 14, reach), lerp(260, -10 + Math.max(0, Math.sin(tap * TAU)) * -8, reach)];
  // body first (cardigan)
  const body = (g) => {
    g.moveTo(-40, -6);
    g.quadraticCurveTo(-120, 0, -150, 50);
    g.quadraticCurveTo(-178, 120, -176, 260);
    g.lineTo(-170, 520); g.lineTo(170, 520);
    g.lineTo(176, 260);
    g.quadraticCurveTo(178, 120, 150, 50);
    g.quadraticCurveTo(120, 0, 40, -6);
    g.closePath();
  };
  // far arm sleeve behind body
  cel(ctx, (g) => chainPath(g, [shR, elR, handR], [46, 36, 26], 0.08), DC.cardSh, '#2B6E98', Lt, 12, { line: LINE, lw });
  // far hand: pointing index finger
  {
    const a = Math.atan2(handR[1] - elR[1], handR[0] - elR[0]);
    drawHand(ctx, handR[0], handR[1], a, 64, 'point', { light: Lt, skin: DC.skin, skinSh: DC.skinSh, lineColor: LINE, thumbSide: -1 });
    // knit cuff
    cel(ctx, (g) => limbPath(g, ...lerpP(elR, handR, 0.82), ...lerpP(elR, handR, 0.97), 28, 28, 0), DC.card, DC.cardSh, Lt, 6, { line: LINE, lw });
  }
  ctx.save();
  ctx.translate(0, breathe);
  cel(ctx, body, DC.card, DC.cardSh, Lt, 26, { line: LINE, lw, hi: DC.cardHi, hiA: 0.45 });
  // knit ribbing texture
  ctx.save();
  ctx.beginPath(); body(ctx); ctx.clip();
  ctx.strokeStyle = 'rgba(30,80,120,0.12)'; ctx.lineWidth = 2;
  for (let x = -180; x < 180; x += 9) { ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x + 6, 520); ctx.stroke(); }
  // blouse V
  ctx.fillStyle = DC.blouse;
  ctx.beginPath(); ctx.moveTo(-58, -8); ctx.lineTo(58, -8); ctx.lineTo(18, 200); ctx.lineTo(-18, 200); ctx.closePath(); ctx.fill();
  ctx.fillStyle = DC.blouseSh;
  ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(58, -8); ctx.lineTo(18, 200); ctx.closePath(); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
  // cardigan front edges + buttons
  ctx.strokeStyle = DC.cardSh; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-58, -6); ctx.lineTo(-16, 210); ctx.lineTo(-14, 520); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(58, -6); ctx.lineTo(16, 210); ctx.lineTo(14, 520); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const by = 230 + i * 70;
    ctx.fillStyle = '#F1E8D8'; ctx.beginPath(); ctx.arc(-22, by, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // collar points
  ctx.fillStyle = '#FBF7EF'; ctx.strokeStyle = LINE; ctx.lineWidth = 2;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 6, -4); ctx.lineTo(sd * 62, -10); ctx.lineTo(sd * 40, 40); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  // neck
  cel(ctx, (g) => limbPath(g, 0, 0, 0, -50, 30, 30, 0), DC.skin, DC.skinSh, Lt, 8, { line: LINE, lw });
  ctx.restore();

  // ── head
  const nod = o.nod ?? Math.sin(t * 2.3) * 0.02;
  const hx = yaw * 10, hy = -168 + breathe * 0.6;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(nod + (o.tilt || 0));
  const fx = yaw * 34; // feature shift for 3/4
  // back hair (bob)
  const bob = (g) => {
    g.moveTo(-108, -40);
    g.quadraticCurveTo(-118, -150, -10, -150);
    g.quadraticCurveTo(112, -152, 112, -40);
    g.quadraticCurveTo(118, 40, 108, 86);
    g.quadraticCurveTo(96, 104, 70, 96);
    g.lineTo(-74, 96);
    g.quadraticCurveTo(-104, 104, -114, 84);
    g.quadraticCurveTo(-122, 30, -108, -40);
    g.closePath();
  };
  cel(ctx, bob, DC.hair, DC.hairSh, Lt, 16, { line: LINE, lw, hi: DC.hairHi, hiA: 0.7 });
  // face
  const face = (g) => {
    g.moveTo(-84 + fx * 0.3, -60);
    g.quadraticCurveTo(-90 + fx * 0.3, 40, -58 + fx * 0.4, 84);
    g.quadraticCurveTo(-20 + fx, 112, 18 + fx, 108);
    g.quadraticCurveTo(70 + fx * 0.5, 96, 84 + fx * 0.3, 40);
    g.quadraticCurveTo(92, -40, 80, -80);
    g.quadraticCurveTo(0, -120, -84 + fx * 0.3, -60);
    g.closePath();
  };
  cel(ctx, face, DC.skin, DC.skinSh, Lt, 14, { line: LINE, lw });
  ctx.save(); ctx.beginPath(); face(ctx); ctx.clip();
  for (const sd of [-1, 1]) {
    const cx = sd * 52 + fx, cy = 44;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 34);
    g.addColorStop(0, 'rgba(224,138,120,0.45)'); g.addColorStop(1, 'rgba(224,138,120,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 40, cy - 40, 80, 80);
  }
  // soft jowl line
  ctx.strokeStyle = 'rgba(160,90,60,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-50 + fx, 76); ctx.quadraticCurveTo(-40 + fx, 92, -24 + fx, 96); ctx.stroke();
  ctx.restore();
  // eyes behind glasses
  const worry = o.worry ?? 1;
  const blink = o.blink ?? 0;
  for (const sd of [-1, 1]) {
    const ex = sd * 40 + fx, ey = -14;
    const open = clamp(1 - blink, 0.05, 1);
    ctx.fillStyle = '#FBF5EC';
    ctx.beginPath(); ctx.ellipse(ex, ey, 13, 9 * open, 0, 0, TAU); ctx.fill();
    if (open > 0.2) {
      ctx.fillStyle = '#4C3A2E'; ctx.beginPath(); ctx.arc(ex + yaw * 4 + (o.look || 0) * 4, ey + 1, 6.5 * Math.min(1, open * 1.2), 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ex + yaw * 4 - 2, ey - 2, 2, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex - 14, ey - 1); ctx.quadraticCurveTo(ex, ey - 13 * open, ex + 14, ey - 1); ctx.stroke();
    // brows: worried (inner end up)
    ctx.strokeStyle = '#8A847D'; ctx.lineWidth = 6;
    const inner = ex - sd * 16, outer = ex + sd * 18;
    ctx.beginPath(); ctx.moveTo(outer, -46 + worry * 4); ctx.quadraticCurveTo(ex, -54 - worry * 2, inner, -52 - worry * 9); ctx.stroke();
  }
  // round tortoise-shell glasses
  for (const sd of [-1, 1]) {
    const gx = sd * 40 + fx, gy = -12;
    ctx.lineWidth = 7; ctx.strokeStyle = DC.frame;
    ctx.beginPath(); ctx.arc(gx, gy, 31, 0, TAU); ctx.stroke();
    // mottled shell
    const r = rng(60 + sd);
    ctx.fillStyle = DC.frameHi;
    for (let i = 0; i < 14; i++) { const a = r() * TAU; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(gx + Math.cos(a) * 31, gy + Math.sin(a) * 31, 1.5 + r() * 1.6, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // lens glint
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(gx, gy, 22, -2.4, -1.7); ctx.stroke();
  }
  ctx.strokeStyle = DC.frame; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-9 + fx, -16); ctx.quadraticCurveTo(fx, -22, 9 + fx, -16); ctx.stroke();
  // nose (small, rounded)
  ctx.fillStyle = 'rgba(190,110,80,0.35)';
  ctx.beginPath(); ctx.ellipse(fx * 1.25 + 4, 28, 13, 10, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(fx * 1.2 - 2, 4); ctx.quadraticCurveTo(fx * 1.3 + 14, 30, fx * 1.2 + 2, 38); ctx.stroke();
  // mouth — talking
  const talk = o.talk ?? 0;
  const mx = fx * 1.05, my = 64;
  if (talk > 0.08) {
    ctx.fillStyle = '#5A2018';
    ctx.beginPath(); ctx.ellipse(mx, my + talk * 5, 17, 3 + talk * 11, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.fillStyle = 'rgba(240,232,220,0.9)'; ctx.fillRect(mx - 11, my + talk * 5 - (3 + talk * 11) + 1, 22, 4);
  } else {
    ctx.strokeStyle = LINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx - 16, my + 2); ctx.quadraticCurveTo(mx, my - 3, mx + 16, my + 3); ctx.stroke();
  }
  // bangs over the forehead (front hair)
  const bangs = (g) => {
    g.moveTo(-112, -30);
    g.quadraticCurveTo(-110, -140, -6, -146);
    g.quadraticCurveTo(108, -146, 110, -36);
    g.quadraticCurveTo(70, -82, 30, -70);
    g.quadraticCurveTo(-10, -96, -40, -66);
    g.quadraticCurveTo(-80, -72, -112, -30);
    g.closePath();
  };
  cel(ctx, bangs, DC.hair, DC.hairSh, Lt, 12, { line: LINE, lw, hi: DC.hairHi, hiA: 0.8 });
  ctx.strokeStyle = 'rgba(140,134,128,0.6)'; ctx.lineWidth = 2;
  for (const [a, b] of [[-70, -128], [-30, -138], [20, -136], [64, -120]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(a + 10, b + 30, a + 4, b + 56); ctx.stroke(); }
  ctx.restore();

  // ── near arm (screen-left): cordless phone at the ear
  const shL = [-128, 30 + breathe * 0.3];
  const elL = [-196, 190];
  const handL = [-104 + hx, -150 + hy + 160];
  cel(ctx, (g) => chainPath(g, [shL, elL, handL], [48, 38, 28], 0.08), DC.card, DC.cardSh, Lt, 12, { line: LINE, lw, hi: DC.cardHi, hiA: 0.4 });
  // phone handset
  ctx.save();
  ctx.translate(handL[0] + 8, handL[1] - 46);
  ctx.rotate(-0.22);
  cel(ctx, (g) => g.roundRect(-20, -84, 40, 150, 16), DC.phone, DC.phoneSh, Lt, 7, { line: LINE, lw });
  ctx.fillStyle = '#1C1F22'; ctx.fillRect(-8, -112, 9, 32);
  ctx.fillStyle = '#7FB04C'; ctx.globalAlpha = 0.8; ctx.fillRect(-12, -54, 24, 20); ctx.globalAlpha = 1;
  ctx.fillStyle = '#5A6066';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) ctx.fillRect(-12 + c * 9, -22 + r * 10, 6, 6);
  ctx.restore();
  // hand wrapped around the phone
  {
    const a = Math.atan2(handL[1] - elL[1], handL[0] - elL[0]);
    drawHand(ctx, handL[0], handL[1], a, 62, 'grip', { light: Lt, skin: DC.skin, skinSh: DC.skinSh, lineColor: LINE, thumbSide: 1 });
    cel(ctx, (g) => limbPath(g, ...lerpP(elL, handL, 0.8), ...lerpP(elL, handL, 0.97), 29, 29, 0), DC.card, DC.cardSh, Lt, 6, { line: LINE, lw });
  }
  ctx.restore();
}
const lerpP = (A, B, t) => [lerp(A[0], B[0], t), lerp(A[1], B[1], t)];

// ── Leo ──────────────────────────────────────────────────────────────────────
const LC = {
  skin: '#F0BC96', skinSh: '#CC8C66', hair: '#E3C567', hairSh: '#B9953C', hairHi: '#F6E3A1',
  tee: '#F2C230', teeSh: '#C6941A', shorts: '#7C8A5A', shortsSh: '#56613C', shoe: '#C8371F', shoeSh: '#8E2414', sock: '#F2EDE2',
};
/** Leo pose helpers */
export const LEO = {
  stand: { lean: 0, armL: [0.2, 0.3], armR: [-0.2, 0.3], legL: [0.06, 0.05], legR: [-0.06, 0.05], bob: 0 },
  run(ph) {
    const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
    return { lean: 0.12, armL: [-0.9 * s, 1.2], armR: [0.9 * s, 1.2], legL: [0.7 * s, 0.4 + 0.9 * Math.max(0, -s)], legR: [-0.7 * s, 0.4 + 0.9 * Math.max(0, s)], bob: -Math.abs(c) * 22 };
  },
  lifted(t) {
    const sw = Math.sin(t * 5.5) * 0.25;
    return { lean: -0.05, armL: [2.5, 0.2], armR: [-2.5, 0.2], legL: [0.35 + sw, 0.5 - sw * 0.5], legR: [0.1 - sw, 0.7 + sw * 0.5], bob: 0 };
  },
};
export function mixLeo(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) o[k] = Array.isArray(a[k]) ? [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)] : lerp(a[k], b[k], t);
  return o;
}
/**
 * Leo, feet on (x,y). o: { s (≈ 420 px tall at 1), facing, pose, laugh 0..1, yaw, light, t, blink }
 */
export function drawLeo(ctx, o = {}) {
  const s = o.s ?? 1, f = o.facing ?? 1;
  const pose = o.pose || LEO.stand;
  const Lt0 = o.light || [0.6, 0.8];
  const Lt = [Lt0[0] * f, Lt0[1]];
  const lw = 2.2;
  ctx.save();
  ctx.translate(o.x ?? 960, o.y ?? 1000);
  ctx.scale(s * f, s);
  ctx.translate(0, pose.bob || 0);
  const hip = [0, -150];
  const up = [Math.sin(pose.lean), -Math.cos(pose.lean)];
  const sh = [hip[0] + up[0] * 100, hip[1] + up[1] * 100];
  const leg = (side, [a, kn]) => {
    const hp = [hip[0] + side * 16, hip[1]];
    const a1 = Math.PI / 2 - a;
    const knee = [hp[0] + Math.cos(a1) * 74, hp[1] + Math.sin(a1) * 74];
    const a2 = a1 + kn;
    const ank = [knee[0] + Math.cos(a2) * 66, knee[1] + Math.sin(a2) * 66];
    return { hp, knee, ank, a2 };
  };
  const arm = (side, [a, el]) => {
    const s0 = [sh[0] + side * 40, sh[1] + 12];
    const down = pose.lean + Math.PI / 2;
    const a1 = down - a;
    const elb = [s0[0] + Math.cos(a1) * 54, s0[1] + Math.sin(a1) * 54];
    const a2 = a1 - el;
    const wr = [elb[0] + Math.cos(a2) * 50, elb[1] + Math.sin(a2) * 50];
    return { s0, elb, wr, a2 };
  };
  const LL = leg(-1, pose.legL), LR = leg(1, pose.legR);
  const AL = arm(-1, pose.armL), AR = arm(1, pose.armR);
  const drawLeg = (J, far) => {
    ctx.save(); ctx.translate(J.ank[0], J.ank[1]); ctx.rotate(J.a2 - Math.PI / 2);
    cel(ctx, (g) => { g.moveTo(-14, -12); g.quadraticCurveTo(-18, 10, -10, 14); g.lineTo(36, 14); g.quadraticCurveTo(44, 4, 34, -6); g.quadraticCurveTo(14, -14, 4, -16); g.closePath(); }, far ? LC.shoeSh : LC.shoe, '#6E1A0E', Lt, 5, { line: LINE, lw });
    ctx.fillStyle = '#F4EFE6'; ctx.fillRect(-12, 9, 50, 5);
    ctx.restore();
    cel(ctx, (g) => chainPath(g, [J.hp, J.knee, J.ank], [17, 13, 11], 0.15), far ? '#D8A07C' : LC.skin, far ? '#B07454' : LC.skinSh, Lt, 6, { line: LINE, lw });
    cel(ctx, (g) => limbPath(g, ...lerpP(J.knee, J.ank, 0.72), J.ank[0], J.ank[1], 12, 12, 0), LC.sock, '#CFC6B4', Lt, 4, { line: LINE, lw });
    cel(ctx, (g) => chainPath(g, [lerpP(J.hp, J.knee, -0.15), lerpP(J.hp, J.knee, 0.5)], [26, 22], 0.04), far ? LC.shortsSh : LC.shorts, LC.shortsSh, Lt, 7, { line: LINE, lw });
  };
  const drawArm = (J, far) => {
    cel(ctx, (g) => chainPath(g, [J.s0, J.elb, J.wr], [13, 11, 9], 0.12), far ? '#D8A07C' : LC.skin, far ? '#B07454' : LC.skinSh, Lt, 5, { line: LINE, lw });
    cel(ctx, (g) => { g.arc(J.wr[0] + Math.cos(J.a2) * 10, J.wr[1] + Math.sin(J.a2) * 10, 13, 0, TAU); }, far ? '#D8A07C' : LC.skin, far ? '#B07454' : LC.skinSh, Lt, 4, { line: LINE, lw });
    cel(ctx, (g) => chainPath(g, [lerpP(J.s0, J.elb, -0.1), lerpP(J.s0, J.elb, 0.55)], [19, 16], 0.04), far ? LC.teeSh : LC.tee, LC.teeSh, Lt, 6, { line: LINE, lw });
  };
  drawLeg(LL, true); drawArm(AL, true); drawLeg(LR, false);
  // shorts seat + tee torso
  cel(ctx, (g) => { g.ellipse(hip[0], hip[1] - 4, 38, 26, pose.lean, 0, TAU); }, LC.shorts, LC.shortsSh, Lt, 8, { line: LINE, lw });
  const torso = (g) => {
    const fp = (u, v) => [hip[0] + up[0] * v + Math.cos(pose.lean) * u, hip[1] + up[1] * v + Math.sin(pose.lean) * u];
    smoothClosed(g, [fp(-40, 4), fp(-46, 50), fp(-50, 92), fp(-26, 112), fp(0, 106), fp(26, 112), fp(50, 92), fp(46, 50), fp(40, 4), fp(0, -2)]);
  };
  cel(ctx, torso, LC.tee, LC.teeSh, Lt, 12, { line: LINE, lw });
  // little sun print on the tee
  {
    const c = [hip[0] + up[0] * 58, hip[1] + up[1] * 58];
    ctx.strokeStyle = '#E98A22'; ctx.lineWidth = 3; ctx.fillStyle = '#F7E07A';
    ctx.beginPath(); ctx.arc(c[0] + 6, c[1], 9, 0, TAU); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.moveTo(c[0] + 6 + Math.cos(a) * 13, c[1] + Math.sin(a) * 13); ctx.lineTo(c[0] + 6 + Math.cos(a) * 18, c[1] + Math.sin(a) * 18); ctx.stroke(); }
  }
  // head
  const head = [sh[0] + up[0] * 72, sh[1] + up[1] * 72];
  const yaw = o.yaw ?? 0.3;
  const laugh = o.laugh ?? 0.8;
  ctx.save();
  ctx.translate(head[0], head[1]);
  ctx.rotate(pose.lean * 0.6 + (o.tilt || 0));
  const fx = yaw * 22;
  // ears
  cel(ctx, (g) => g.ellipse(-62 + fx * 0.4, 6, 12, 17, 0, 0, TAU), LC.skin, LC.skinSh, Lt, 4, { line: LINE, lw });
  const facePath = (g) => { g.ellipse(0, 0, 66, 70, 0, 0, TAU); };
  cel(ctx, facePath, LC.skin, LC.skinSh, Lt, 10, { line: LINE, lw });
  ctx.save(); ctx.beginPath(); facePath(ctx); ctx.clip();
  for (const sd of [-1, 1]) {
    const g = ctx.createRadialGradient(sd * 34 + fx, 22, 0, sd * 34 + fx, 22, 22);
    g.addColorStop(0, 'rgba(232,120,100,0.5)'); g.addColorStop(1, 'rgba(232,120,100,0)');
    ctx.fillStyle = g; ctx.fillRect(sd * 34 + fx - 25, -3, 50, 50);
  }
  ctx.restore();
  // eyes: happy crescents when laughing, round otherwise
  for (const sd of [-1, 1]) {
    const ex = sd * 24 + fx, ey = -4;
    if (laugh > 0.5 || (o.blink ?? 0) > 0.5) {
      ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, ey + 4, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else {
      ctx.fillStyle = '#2A1D16'; ctx.beginPath(); ctx.ellipse(ex, ey, 7, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 2, ey - 3, 2.6, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#B99550'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(ex - 9, ey - 18 - laugh * 3); ctx.quadraticCurveTo(ex, ey - 22 - laugh * 4, ex + 9, ey - 18 - laugh * 2); ctx.stroke();
  }
  // nose
  ctx.fillStyle = 'rgba(200,110,80,0.45)'; ctx.beginPath(); ctx.ellipse(fx * 1.2 + 3, 14, 8, 6, 0, 0, TAU); ctx.fill();
  // mouth: big laugh
  const mx = fx * 1.1, my = 32;
  ctx.fillStyle = '#6A2219';
  ctx.beginPath(); ctx.moveTo(mx - 18 - laugh * 4, my); ctx.quadraticCurveTo(mx, my - 2, mx + 18 + laugh * 4, my); ctx.quadraticCurveTo(mx, my + 8 + laugh * 20, mx - 18 - laugh * 4, my); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#F6F0E6'; ctx.fillRect(mx - 20, my - 2, 40, 5);
  ctx.fillStyle = '#D9605A'; ctx.beginPath(); ctx.ellipse(mx, my + 8 + laugh * 18, 10, 7, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(mx - 18 - laugh * 4, my); ctx.quadraticCurveTo(mx, my + 8 + laugh * 20, mx + 18 + laugh * 4, my); ctx.stroke();
  // messy straw hair cap with tufts
  const r = rng(303);
  const tufts = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (1.02 + (i / 12) * 0.96);
    const rr = 74 + (i % 2 ? 14 + r() * 12 : 0);
    tufts.push([Math.cos(a) * rr + fx * 0.15, Math.sin(a) * rr * 0.98 - 4]);
  }
  const hairPath = (g) => {
    g.moveTo(-70, 4);
    for (const p of tufts) g.lineTo(p[0], p[1]);
    g.lineTo(70, 4);
    g.quadraticCurveTo(52, -30, 30 + fx * 0.4, -30);
    g.lineTo(16 + fx * 0.4, -18); g.lineTo(6 + fx * 0.4, -34); g.lineTo(-12 + fx * 0.4, -22); g.lineTo(-26 + fx * 0.4, -36);
    g.quadraticCurveTo(-60, -30, -70, 4);
    g.closePath();
  };
  cel(ctx, hairPath, LC.hair, LC.hairSh, Lt, 9, { line: LINE, lw, hi: LC.hairHi, hiA: 0.8 });
  ctx.restore();
  drawArm(AR, false);
  ctx.restore();
  return { head: null };
}

// ── rescuer (small) ──────────────────────────────────────────────────────────
/**
 * o: { x, y (feet), h (px height), pose:'stand'|'pump'|'crank'|'kneel', ph (cycle 0..1), facing, light }
 */
export function drawRescuer(ctx, o = {}) {
  const h = o.h ?? 140, k = h / 100, f = o.facing ?? 1;
  const Lt0 = o.light || [0.6, 0.8];
  const Lt = [Lt0[0] * f, Lt0[1]];
  const ph = o.ph ?? 0;
  const pose = o.pose || 'stand';
  const lw = Math.max(1, 1.6 * k * 0.5);
  ctx.save();
  ctx.translate(o.x ?? 0, o.y ?? 0);
  ctx.scale(k * f, k);
  let hip = [0, -46], lean = 0, armA = [0.2, 0.3], armB = [-0.1, 0.4], legA = [0.1, 0.05], legB = [-0.08, 0.05];
  const s = Math.sin(ph * TAU);
  if (pose === 'pump') { lean = 0.7; hip = [0, -40]; armA = [1.2 + s * 0.45, 0.2]; armB = [1.0 + s * 0.45, 0.3]; legA = [0.5, 0.7]; legB = [-0.2, 0.3]; }
  if (pose === 'crank') { lean = 0.25; armA = [1.2 + Math.cos(ph * TAU) * 0.3, 0.6 + s * 0.4]; armB = [0.9 + Math.cos(ph * TAU) * 0.3, 0.8 + s * 0.4]; legA = [0.25, 0.1]; legB = [-0.15, 0.1]; }
  if (pose === 'kneel') { hip = [0, -26]; lean = 0.35; armA = [0.9, 0.9]; armB = [0.5, 1.1]; legA = [1.4, 1.6]; legB = [0.2, 1.9]; }
  const up = [Math.sin(lean), -Math.cos(lean)];
  const sh = [hip[0] + up[0] * 30, hip[1] + up[1] * 30];
  const leg = (side, [a, kn]) => {
    const hp = [hip[0] + side * 4, hip[1]];
    const a1 = Math.PI / 2 - a; const kn1 = [hp[0] + Math.cos(a1) * 24, hp[1] + Math.sin(a1) * 24];
    const a2 = a1 + kn; const an = [kn1[0] + Math.cos(a2) * 22, kn1[1] + Math.sin(a2) * 22];
    return [hp, kn1, an, a2];
  };
  const arm = (side, [a, el]) => {
    const s0 = [sh[0] + side * 2, sh[1] + 3];
    const d = lean + Math.PI / 2; const a1 = d - a;
    const e = [s0[0] + Math.cos(a1) * 15, s0[1] + Math.sin(a1) * 15];
    const a2 = a1 - el; const w = [e[0] + Math.cos(a2) * 14, e[1] + Math.sin(a2) * 14];
    return [s0, e, w];
  };
  const drawL = (J, far) => {
    cel(ctx, (g) => chainPath(g, [J[0], J[1], J[2]], [6, 5, 4.5], 0.1), far ? '#2C3238' : '#3B434B', '#1E2328', Lt, 2.5, { line: LINE, lw });
    ctx.save(); ctx.translate(J[2][0], J[2][1]); ctx.rotate(J[3] - Math.PI / 2);
    cel(ctx, (g) => g.roundRect(-4, -3, 13, 6, 2), '#4A3424', '#2A1C12', Lt, 2, { line: LINE, lw });
    ctx.restore();
  };
  const drawA = (J, far) => {
    cel(ctx, (g) => chainPath(g, [J[0], J[1], J[2]], [5.5, 4.6, 4], 0.1), far ? '#3A8DC0' : '#5FB8E6', '#2D6F98', Lt, 2.5, { line: LINE, lw });
    cel(ctx, (g) => g.arc(J[2][0], J[2][1], 3.4, 0, TAU), '#4A3A30', '#2A1F18', Lt, 1.5, { line: LINE, lw });
  };
  const L1 = leg(-1, legB), L2 = leg(1, legA), A1 = arm(-1, armB), A2 = arm(1, armA);
  drawL(L1, true); drawA(A1, true); drawL(L2, false);
  // jacket torso with reflective band
  const torso = (g) => {
    const fp = (u, v) => [hip[0] + up[0] * v + Math.cos(lean) * u, hip[1] + up[1] * v + Math.sin(lean) * u];
    smoothClosed(g, [fp(-9, -2), fp(-11, 16), fp(-10, 32), fp(0, 35), fp(10, 32), fp(11, 16), fp(9, -2), fp(0, -4)]);
  };
  cel(ctx, torso, '#5FB8E6', '#2D6F98', Lt, 4, { line: LINE, lw });
  ctx.save(); ctx.beginPath(); torso(ctx); ctx.clip();
  const bandC = [hip[0] + up[0] * 12, hip[1] + up[1] * 12];
  ctx.translate(bandC[0], bandC[1]); ctx.rotate(lean);
  ctx.fillStyle = '#E9EEF0'; ctx.fillRect(-14, -1.6, 28, 3.2);
  ctx.restore();
  // head + helmet
  const hd = [sh[0] + up[0] * 9, sh[1] + up[1] * 9];
  cel(ctx, (g) => g.arc(hd[0], hd[1], 6.5, 0, TAU), '#E2A27A', '#B66E4C', Lt, 2, { line: LINE, lw });
  cel(ctx, (g) => { g.arc(hd[0], hd[1] - 1.5, 7.6, Math.PI, 0); g.lineTo(hd[0] + 10, hd[1] - 0.5); g.lineTo(hd[0] - 8.5, hd[1] - 0.5); g.closePath(); }, '#F2EEE6', '#BFB7A8', Lt, 2.4, { line: LINE, lw });
  ctx.fillStyle = '#E0632A'; ctx.fillRect(hd[0] - 1.2, hd[1] - 9, 2.4, 8);
  drawA(A2, false);
  ctx.restore();
}

// ── sky-blue figurines (finale) ──────────────────────────────────────────────
const FB = { base: '#5FB8E6', sh: '#3988BA', hi: '#BDE3F6', line: '#1C4865', dark: '#2B6E98' };
export const FIGURINES = {
  donna:   { h: 0.78, w: 1.25, hair: 'bob', glasses: true },
  father:  { h: 1.0, w: 1.12, hat: 'cap', mustache: true },
  sister:  { h: 0.9, w: 0.92, hair: 'pony' },
  beanie:  { h: 1.06, w: 1.0, hat: 'beanie', beard: true },
  mug:     { h: 0.93, w: 0.98, hair: 'curly', mug: true },
  leo:     { h: 0.56, w: 0.9, hair: 'tufts', child: true },
  eric:    { h: 1.12, w: 0.96, hat: 'sun', glasses: true, beard: true },
  rescuer: { h: 0.98, w: 1.06, hat: 'helmet' },
};
/**
 * Tabletop figurine standing on (x,y). h = px height of a 1.0 figure. o: { turn -1..1, t, alpha, light }
 */
export function drawFigurine(ctx, x, y, h, kind, o = {}) {
  const d = FIGURINES[kind] || FIGURINES.father;
  const k = (h * d.h) / 100;
  const Lt = o.light || [-0.5, 0.85];
  const turn = clamp(o.turn ?? 0, -1, 1);
  const t = o.t ?? 0;
  const lw = 1.6 / Math.max(0.4, k);
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  // contact shadow
  ctx.save();
  ctx.filter = `blur(${Math.max(1, 4 * k).toFixed(1)}px)`;
  ctx.fillStyle = 'rgba(40,20,10,0.38)';
  ctx.beginPath(); ctx.ellipse(6 * k, 2 * k, 26 * k * d.w, 7 * k, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.scale(k, k);
  // wooden base disc
  ctx.fillStyle = '#9A7148'; ctx.beginPath(); ctx.ellipse(0, 0, 20 * d.w, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#C69A6A'; ctx.beginPath(); ctx.ellipse(0, -3, 20 * d.w, 6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(80,50,25,0.6)'; ctx.lineWidth = lw; ctx.stroke();
  const breathe = Math.sin(t * 1.6 + x * 0.01) * 0.8;
  const wd = d.w;
  const child = !!d.child;
  const hipY = child ? -26 : -44, shY = child ? -50 : -80 + breathe;
  // legs
  for (const sd of [-1, 1]) {
    cel(ctx, (g) => limbPath(g, sd * 6 * wd, hipY, sd * 7 * wd, -4, 6 * wd, 4.6, 0.05), sd < 0 ? FB.sh : FB.base, FB.dark, Lt, 2.2, { line: FB.line, lw });
    cel(ctx, (g) => g.roundRect(sd * 7 * wd - 5 + (sd > 0 ? 1 : -1), -7, 11, 5, 2), FB.dark, FB.line, Lt, 1.2, { line: FB.line, lw });
  }
  // torso
  const torso = (g) => {
    g.moveTo(-10 * wd, hipY + 2);
    g.quadraticCurveTo(-13 * wd, (hipY + shY) / 2, -11 * wd, shY + 4);
    g.quadraticCurveTo(-8 * wd, shY - 1, 0, shY - 2);
    g.quadraticCurveTo(8 * wd, shY - 1, 11 * wd, shY + 4);
    g.quadraticCurveTo(13 * wd, (hipY + shY) / 2, 10 * wd, hipY + 2);
    g.closePath();
  };
  cel(ctx, torso, FB.base, FB.sh, Lt, 4, { line: FB.line, lw, hi: FB.hi, hiA: 0.55 });
  // arms
  const armSwing = Math.sin(t * 1.3 + x) * 0.04;
  for (const sd of [-1, 1]) {
    const s0 = [sd * 11 * wd, shY + 4];
    const e = [sd * 14 * wd, (shY + hipY) / 2 + 2];
    let w = [sd * 13 * wd + armSwing * 20, hipY + 4];
    if (d.mug && sd > 0) w = [9 * wd, shY + 16];
    cel(ctx, (g) => chainPath(g, [s0, e, w], [3.8, 3.4, 3], 0.08), sd < 0 ? FB.sh : FB.base, FB.dark, Lt, 1.6, { line: FB.line, lw });
    if (d.mug && sd > 0) {
      cel(ctx, (g) => g.roundRect(w[0] - 4, w[1] - 6, 9, 10, 2), FB.hi, FB.base, Lt, 1.4, { line: FB.line, lw });
    }
  }
  // head
  const hr = child ? 11.5 : 9.5;
  const hy = shY - hr - 2;
  const fx = turn * hr * 0.42;
  // hair back / hats behind
  if (d.hair === 'bob') cel(ctx, (g) => { g.moveTo(-hr * 1.2, hy + hr * 0.8); g.quadraticCurveTo(-hr * 1.3, hy - hr * 1.3, 0, hy - hr * 1.2); g.quadraticCurveTo(hr * 1.3, hy - hr * 1.3, hr * 1.2, hy + hr * 0.8); g.closePath(); }, FB.hi, FB.base, Lt, 2, { line: FB.line, lw });
  if (d.hair === 'pony') cel(ctx, (g) => { g.ellipse(-turn * hr * 1.1 - hr * 0.2, hy + 1, hr * 0.45, hr * 1.1, 0.4 * -turn, 0, TAU); }, FB.dark, FB.line, Lt, 1.5, { line: FB.line, lw });
  cel(ctx, (g) => g.ellipse(0, hy, hr * 0.92, hr, 0, 0, TAU), FB.base, FB.sh, Lt, 2.5, { line: FB.line, lw, hi: FB.hi, hiA: 0.6 });
  // face features (turn shifts them)
  ctx.fillStyle = FB.line;
  for (const sd of [-1, 1]) {
    const ex = sd * hr * 0.35 + fx;
    if (Math.abs(ex) > hr * 0.85) continue;
    ctx.beginPath(); ctx.arc(ex, hy - hr * 0.05, hr * 0.09, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = FB.dark; ctx.lineWidth = lw * 1.1;
  ctx.beginPath(); ctx.moveTo(fx * 1.25, hy + hr * 0.02); ctx.quadraticCurveTo(fx * 1.25 + turn * hr * 0.25, hy + hr * 0.25, fx * 1.2, hy + hr * 0.32); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx - hr * 0.22, hy + hr * 0.52); ctx.quadraticCurveTo(fx, hy + hr * 0.62, fx + hr * 0.22, hy + hr * 0.52); ctx.stroke();
  if (d.glasses) {
    ctx.strokeStyle = FB.line; ctx.lineWidth = lw;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * hr * 0.36 + fx, hy - hr * 0.05, hr * 0.26, 0, TAU); ctx.stroke(); }
  }
  if (d.beard) cel(ctx, (g) => { g.moveTo(-hr * 0.75 + fx * 0.5, hy + hr * 0.25); g.quadraticCurveTo(fx, hy + hr * 1.55, hr * 0.75 + fx * 0.5, hy + hr * 0.25); g.quadraticCurveTo(fx, hy + hr * 0.75, -hr * 0.75 + fx * 0.5, hy + hr * 0.25); g.closePath(); }, FB.dark, FB.line, Lt, 1.2, { line: FB.line, lw });
  if (d.mustache) { ctx.strokeStyle = FB.line; ctx.lineWidth = lw * 2; ctx.beginPath(); ctx.moveTo(fx - hr * 0.3, hy + hr * 0.4); ctx.quadraticCurveTo(fx, hy + hr * 0.3, fx + hr * 0.3, hy + hr * 0.4); ctx.stroke(); }
  // hair front / hats
  if (d.hair === 'bob') cel(ctx, (g) => { g.moveTo(-hr, hy - hr * 0.1); g.quadraticCurveTo(-hr, hy - hr * 1.2, 0, hy - hr * 1.15); g.quadraticCurveTo(hr, hy - hr * 1.2, hr, hy - hr * 0.1); g.quadraticCurveTo(fx, hy - hr * 0.55, -hr, hy - hr * 0.1); g.closePath(); }, FB.hi, FB.base, Lt, 1.5, { line: FB.line, lw });
  if (d.hair === 'curly') for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i * 0.15); cel(ctx, (g) => g.arc(Math.cos(a) * hr * 0.95, hy + Math.sin(a) * hr * 0.95, hr * 0.36, 0, TAU), FB.dark, FB.line, Lt, 1, { line: FB.line, lw }); }
  if (d.hair === 'pony' || d.hair === 'tufts') cel(ctx, (g) => { g.moveTo(-hr * 0.95, hy - hr * 0.1); g.quadraticCurveTo(-hr, hy - hr * 1.15, 0, hy - hr * 1.1); g.quadraticCurveTo(hr, hy - hr * 1.15, hr * 0.95, hy - hr * 0.1); g.quadraticCurveTo(fx, hy - hr * 0.6, -hr * 0.95, hy - hr * 0.1); g.closePath(); }, d.hair === 'tufts' ? FB.hi : FB.dark, FB.base, Lt, 1.3, { line: FB.line, lw });
  if (d.hat === 'cap') { cel(ctx, (g) => { g.arc(0, hy - hr * 0.2, hr * 0.98, Math.PI, 0); g.closePath(); }, FB.dark, FB.line, Lt, 1.5, { line: FB.line, lw }); cel(ctx, (g) => g.ellipse(turn * hr * 0.9, hy - hr * 0.2, hr * 0.75, hr * 0.18, 0, 0, TAU), FB.dark, FB.line, Lt, 1, { line: FB.line, lw }); }
  if (d.hat === 'beanie') { cel(ctx, (g) => { g.arc(0, hy - hr * 0.15, hr * 1.0, Math.PI, 0); g.closePath(); }, FB.dark, FB.line, Lt, 1.5, { line: FB.line, lw }); cel(ctx, (g) => g.arc(0, hy - hr * 1.25, hr * 0.28, 0, TAU), FB.hi, FB.base, Lt, 1, { line: FB.line, lw }); }
  if (d.hat === 'sun') { cel(ctx, (g) => g.ellipse(0, hy - hr * 0.45, hr * 1.7, hr * 0.32, 0, 0, TAU), FB.hi, FB.base, Lt, 1.2, { line: FB.line, lw }); cel(ctx, (g) => { g.arc(0, hy - hr * 0.5, hr * 0.85, Math.PI, 0); g.closePath(); }, FB.hi, FB.base, Lt, 1.2, { line: FB.line, lw }); }
  if (d.hat === 'helmet') { cel(ctx, (g) => { g.arc(0, hy - hr * 0.15, hr * 1.08, Math.PI, 0); g.lineTo(hr * 1.35, hy - hr * 0.05); g.lineTo(-hr * 1.25, hy - hr * 0.05); g.closePath(); }, FB.hi, FB.base, Lt, 1.5, { line: FB.line, lw }); }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// S4 — "home video" DV footage of Aron's biking tricks (drawn into a 4:3 canvas).
// Shot 'jump': slickrock lip, launch, airborne arc, landing (panning DV camera).
// Shot 'descent': bombing down a slickrock slope toward the camera.
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, ease, noise, TAU } from '../../core/util.js';
import { drawAaron, EXPR } from '../../core/aaron.js';
import { fillPattern, warmTex, dvGrade, dvOSD, motes } from './common.js';

/** riding pose (facing right). ph = pedal phase */
export function ridePose(ph = 0, crouch = 0) {
  const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
  return {
    root: [lerp(-30, -10, crouch), lerp(150, 230, crouch)], lean: lerp(0.72, 0.95, crouch), twist: 0, neck: -0.35, head: -0.2, yaw: 0.55, nod: -0.15,
    armL: { sh: 1.15 - crouch * 0.2, el: 0.55 + crouch * 0.3, wr: 0.2, hand: 'grip' },
    armR: { sh: 1.2 - crouch * 0.2, el: 0.5 + crouch * 0.3, wr: 0.2, hand: 'grip' },
    legL: { hip: 1.15 + 0.35 * s + crouch * 0.2, knee: 1.25 + 0.35 * c + crouch * 0.3, ank: 0.2 },
    legR: { hip: 1.15 - 0.35 * s + crouch * 0.2, knee: 1.25 - 0.35 * c + crouch * 0.3, ank: 0.2 },
  };
}

/** mountain bike, (x,y) = bottom bracket, s = scale (1 → wheel radius 66px), rot = pitch */
export function drawBike(g, x, y, s, rot = 0, spin = 0) {
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(s, s);
  const R = 66;
  const rear = [-104, -14], front = [112, -14];
  const wheel = (cx, cy) => {
    g.lineWidth = 11; g.strokeStyle = '#1b1a19';
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#4a4744';
    g.beginPath(); g.arc(cx, cy, R - 7, 0, TAU); g.stroke();
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(200,200,195,0.7)';
    for (let k = 0; k < 16; k++) { const a = spin + (k / 16) * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R - 8)); g.stroke(); }
    // tread knobs
    g.fillStyle = '#121110';
    for (let k = 0; k < 28; k++) { const a = spin + (k / 28) * TAU; g.beginPath(); g.arc(cx + Math.cos(a) * (R + 4), cy + Math.sin(a) * (R + 4), 3, 0, TAU); g.fill(); }
    g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(cx, cy, 7, 0, TAU); g.fill();
  };
  wheel(...rear); wheel(...front);
  // frame (red-oxide paint) — seat tube, top tube, down tube, stays, fork
  const seatTop = [-30, -132], headTop = [78, -128], headBot = [90, -88];
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#2a1712'; g.lineWidth = 14;
  const tubes = [[[0, 0], seatTop], [seatTop, headTop], [[0, 0], headBot], [[0, 0], rear], [seatTop, rear], [headBot, front]];
  for (const [a, b] of tubes) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
  g.strokeStyle = '#B5432A'; g.lineWidth = 9;
  for (const [a, b] of tubes) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
  g.strokeStyle = 'rgba(255,210,170,0.5)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(seatTop[0], seatTop[1] - 3); g.lineTo(headTop[0], headTop[1] - 3); g.stroke();
  // fork (suspension, silver)
  g.strokeStyle = '#c7c9cc'; g.lineWidth = 8; g.beginPath(); g.moveTo(...headTop); g.lineTo(...front); g.stroke();
  // saddle + post, bars + stem
  g.strokeStyle = '#222'; g.lineWidth = 7; g.beginPath(); g.moveTo(...seatTop); g.lineTo(seatTop[0] - 8, seatTop[1] - 22); g.stroke();
  g.fillStyle = '#18171a'; g.beginPath(); g.ellipse(seatTop[0] - 12, seatTop[1] - 26, 26, 7, -0.05, 0, TAU); g.fill();
  g.strokeStyle = '#222'; g.lineWidth = 7; g.beginPath(); g.moveTo(...headTop); g.lineTo(headTop[0] + 6, headTop[1] - 22); g.lineTo(headTop[0] - 6, headTop[1] - 30); g.stroke();
  // crank + chainring
  g.strokeStyle = '#555'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.stroke();
  g.strokeStyle = '#333'; g.lineWidth = 6; g.beginPath(); g.moveTo(Math.cos(spin * 0.4) * -28, Math.sin(spin * 0.4) * -28); g.lineTo(Math.cos(spin * 0.4) * 28, Math.sin(spin * 0.4) * 28); g.stroke();
  g.restore();
  return { seat: [x + (seatTop[0] - 12) * s, y + (seatTop[1] - 30) * s], bar: [x + (headTop[0] - 6) * s, y + (headTop[1] - 30) * s] };
}

function slickrock(g, w, h, t, ground, camX) {
  // sky: overexposed DV sky
  const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#9FC3D6'); sky.addColorStop(1, '#F3E6CF');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  // sun bloom
  const sg = g.createRadialGradient(w * 0.82, h * 0.12, 0, w * 0.82, h * 0.12, w * 0.35);
  sg.addColorStop(0, 'rgba(255,250,235,0.95)'); sg.addColorStop(1, 'rgba(255,250,235,0)');
  g.fillStyle = sg; g.fillRect(0, 0, w, h);
  // distant buttes (parallax 0.15)
  g.fillStyle = '#B98A6A';
  g.beginPath(); g.moveTo(0, h * 0.5);
  for (let x = 0; x <= w; x += 16) { const X = x + camX * 0.15; const y = h * 0.42 + (noise.fbm2(X * 0.004, 2.2, 3) > 0.05 ? -h * 0.08 : 0) + noise.fbm2(X * 0.01, 5) * 12; g.lineTo(x, y); }
  g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  // slickrock ground (parallax 1)
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, ground(x + camX));
  g.lineTo(w, h); g.closePath();
  g.save(); g.clip();
  fillPattern(g, warmTex(43), -camX, 0, 0.9, [0, 0, w, h]);
  const sh = g.createLinearGradient(0, h * 0.5, 0, h);
  sh.addColorStop(0, 'rgba(255,230,190,0.15)'); sh.addColorStop(1, 'rgba(60,20,10,0.35)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
  g.restore();
}

/**
 * Draw the home-video footage into g (w×h, 4:3). kind 'jump' | 'descent'. lt = seconds into the shot.
 * o: { grade:true, osd:true, t }
 */
export function drawFootage(g, w, h, kind, lt, o = {}) {
  g.save();
  const sc = w / 720;
  g.scale(sc, sc);
  const W0 = 720, H0 = 540;
  if (kind === 'jump') {
    // DV camera pans with the rider
    const speed = 300;
    const riderX = 120 + lt * speed;
    const camX = riderX - 300 - Math.sin(lt * 2.2) * 10;
    const lip = 560; // world x of the launch lip
    const ground = (X) => {
      if (X < lip) return 400 - Math.max(0, (X - 340)) * 0.32 + noise.n2(X * 0.01, 1) * 6;
      return 470 + noise.n2(X * 0.01, 3) * 8 - Math.max(0, X - 900) * 0.05;
    };
    slickrock(g, W0, H0, lt, ground, camX);
    // rider kinematics: ride up the slope, airborne after the lip, land
    let y, rot, air = 0;
    const X = riderX;
    if (X < lip) { y = ground(X); rot = X > 340 ? -0.3 : 0; }
    else {
      const tt = (X - lip) / speed;               // seconds since launch
      const vy = -420, gacc = 1300;
      const yy = ground(lip) + vy * tt + 0.5 * gacc * tt * tt;
      const gnd = ground(X);
      if (yy < gnd) { y = yy; rot = lerp(-0.3, 0.25, clamp(tt / 0.62)); air = 1; }
      else { y = gnd; rot = 0.02; }
    }
    const bx = X - camX, by = y - 80;
    g.save(); g.globalAlpha = air ? 0.25 : 0.4; g.fillStyle = '#3b170c';
    g.beginPath(); g.ellipse(bx, ground(X) - 2, 70, 9, 0, 0, TAU); g.fill(); g.restore();
    drawBike(g, bx, by, 0.62, rot, lt * 14);
    g.save(); g.translate(bx, by); g.rotate(rot);
    drawAaron(g, { x: -6, y: 32, scale: 0.21, pose: ridePose(lt * 1.6, air ? 0.8 : 0.2), expr: EXPR.grin, beard: 0, dirt: 0, sunburn: 0.5, light: [-0.5, 0.85] });
    g.restore();
  } else {
    // descent: the rider rushes down toward the camera, slightly handheld
    const k = clamp(lt / 1.3);
    const camShake = noise.n2(lt * 9, 4) * 6;
    const ground = (X) => 330 + (X - 360) * 0.18 + noise.n2(X * 0.01, 7) * 8;
    slickrock(g, W0, H0, lt, ground, -40 + camShake);
    // dust trail
    motes(g, lt, { count: 26, seed: 31, area: [0, 260, 720, 280], vel: [-60, -10], color: '#E8C7A0', alpha: 0.5, size: [2, 7] });
    const s = lerp(0.28, 1.25, ease.inCubic(k));
    const bx = lerp(250, 520, ease.inQuad(k)), by = lerp(300, 700, ease.inCubic(k));
    g.save(); g.translate(bx, by); g.rotate(0.12);
    drawBike(g, 0, 0, s * 0.9, 0, lt * 20);
    drawAaron(g, { x: -6 * s, y: 32 * s, scale: 0.3 * s, pose: ridePose(0.1, 0.9), expr: EXPR.grin, beard: 0, dirt: 0, sunburn: 0.5, light: [-0.5, 0.85] });
    g.restore();
    // motion streaks
    g.save(); g.globalAlpha = 0.18 * k; g.strokeStyle = '#fff3dd'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const yy = 120 + i * 30; g.beginPath(); g.moveTo(0, yy); g.lineTo(80 + (i * 37) % 120, yy + 4); g.stroke(); }
    g.restore();
  }
  g.restore();
  if (o.grade !== false) dvGrade(g, { t: o.t ?? lt, rect: [0, 0, w, h], sat: 0.35, tint: 0.3, lift: 0.6, noise: 0.28, scan: 0.45, slip: 0.35 });
  if (o.osd !== false) dvOSD(g, { t: o.t ?? lt, rect: [0, 0, w, h], mode: '▶ PLAY', tc: (o.tc ?? 0) + lt, date: kind === 'jump' ? 'OCT 12 2002' : 'OCT 12 2002', battery: 0.9 });
}

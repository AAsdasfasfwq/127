// S1 · 0.00 → 8.85  Cold open: golden-hour 3D flight over Canyonlands → crane to top-down.
import { scene } from '../../core/engine.js';
import { THREE, threeRender, disposeTree } from '../../core/three.js';
import { clamp, lerp, ease, seg, kf, noise, TAU } from '../../core/util.js';
import { text, maskRise, chars, measure } from '../../core/text.js';
import { buildTerrain, sampleWorld } from './terrain.js';
import { W, H, life, mono, motes } from './lib.js';

// Final top-down framing (shared with the 2D map scene → pixel match)
export const TOP = { cx: 300, cz: 330, halfW: 700, ref: 85, dist: 5000 };
TOP.halfH = TOP.halfW * 9 / 16;
TOP.fov = 2 * Math.atan(TOP.halfH / TOP.dist) * 180 / Math.PI;

const SIZE = 3600, VERT = 240;
// flight keyframes: [t, x, z]
const PATH = [[0, -600, 30], [1.6, -215, 168], [4.2, 110, 300], [6.42, 340, 400]];
function pathAt(t) {
  // Catmull-Rom through PATH by time, with eased time inside segments for smoothness
  const P = PATH;
  let i = 0;
  while (i < P.length - 2 && t > P[i + 1][0]) i++;
  const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
  const u = clamp((t - p1[0]) / (p2[0] - p1[0]), 0, 1.2);
  const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return [cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])];
}

let S = null;
function setup() {
  const s = new THREE.Scene();
  s.fog = new THREE.Fog('#F2CB9C', 800, 2700);
  const T = buildTerrain({ res: 440, size: SIZE, vert: VERT, u0: -1.5, u1: 1.5, v0: -1.5, v1: 1.5, repeat: 24 });
  s.add(T.mesh);
  const hemi = new THREE.HemisphereLight('#c3d2df', '#7a3a22', 0.7);
  s.add(hemi);
  const sun = new THREE.DirectionalLight('#ffbf80', 4.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -1500; sc.right = 1500; sc.top = 1500; sc.bottom = -1500; sc.near = 10; sc.far = 6000;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
  s.add(sun); s.add(sun.target);
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 2, 9000);
  // altitude profile: never lower than mesa skim height, holds altitude after the rim (reveal)
  const alt = [];
  let hold = 0;
  for (let k = 0; k <= 200; k++) {
    const t = (k / 200) * 6.42;
    const [x, z] = pathAt(t);
    let gmax = 0;
    for (let a = 0; a <= 60; a += 15) {
      const [xa, za] = pathAt(Math.min(6.42, t + a / 260));
      gmax = Math.max(gmax, sampleWorld(T, xa, za));
    }
    hold = Math.max(hold * 0.996, gmax + 46);
    alt.push(hold);
  }
  S = { s, T, cam, sun, hemi, alt };
}
function altAt(t) {
  const f = clamp(t / 6.42) * 200;
  const i = Math.min(199, Math.floor(f));
  return lerp(S.alt[i], S.alt[i + 1], f - i);
}

const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), qa = new THREE.Quaternion();
const tmpCam = new THREE.PerspectiveCamera(50, 16 / 9, 1, 100);
function flightPose(t) {
  const [x, z] = pathAt(t);
  const [x2, z2] = pathAt(t + 0.25);
  const y = altAt(t) + 4 * Math.sin(t * 1.3);
  const pitch = kf(t, [[0, -0.15], [1.2, -0.17], [2.6, -0.33, ease.inOutSine], [6.42, -0.38]]);
  const yaw = Math.atan2(x2 - x, z2 - z);
  const bank = kf(t, [[0, 0.0], [2.0, 0.035], [4.5, -0.02], [6.42, 0.0]]);
  return { x, y, z, yaw, pitch, bank };
}
function applyPose(cam, p) {
  cam.position.set(p.x, p.y, p.z);
  cam.rotation.order = 'YXZ';
  cam.rotation.set(p.pitch, p.yaw + Math.PI, -p.bank);
}

function render3D(lt) {
  const cam = S.cam;
  // light dip on "unforgiving" (3.16) → returns on "landscapes" (4.14)
  const dip = seg(lt, 3.05, 3.55, ease.inOutSine) * (1 - seg(lt, 4.15, 5.0, ease.inOutSine) * 0.8);
  S.sun.intensity = lerp(4.3, 0.85, dip);
  S.sun.color.set(dip > 0.5 ? '#f0c8a8' : '#ffbf80');
  S.hemi.intensity = lerp(0.7, 0.95, dip);
  S.hemi.color.set('#c3d2df');
  // sun direction: low, front-left; slides slightly
  const sd = new THREE.Vector3(0.62, 0.24, -0.74).normalize();
  const fp = flightPose(Math.min(lt, 6.42));
  S.sun.target.position.set(fp.x + 300, 0, fp.z + 200);
  S.sun.position.copy(S.sun.target.position).addScaledVector(sd, 3000);
  if (lt <= 6.42) {
    applyPose(cam, fp);
    cam.fov = 50;
    S.s.fog.near = 800; S.s.fog.far = 2700;
  } else {
    // crane up + pitch to top-down, FOV narrows to the map framing
    const p = seg(lt, 6.42, 8.62, ease.inOutCubic);
    const pe = flightPose(6.42);
    applyPose(tmpCam, pe);
    q0.copy(tmpCam.quaternion);
    tmpCam.position.set(TOP.cx, TOP.ref + TOP.dist, TOP.cz);
    tmpCam.up.set(0, 0, -1);
    tmpCam.lookAt(TOP.cx, 0, TOP.cz);
    tmpCam.up.set(0, 1, 0);
    q1.copy(tmpCam.quaternion);
    const pq = seg(lt, 6.42, 8.4, ease.inOutCubic);
    qa.slerpQuaternions(q0, q1, pq);
    cam.quaternion.copy(qa);
    // position: rise along a curve (height grows faster at the end)
    const ph = ease.inOutCubic(p);
    const yh = lerp(pe.y, TOP.ref + TOP.dist, Math.pow(ph, 2.2));
    cam.position.set(lerp(pe.x, TOP.cx, ph), yh, lerp(pe.z, TOP.cz, ph));
    const t0 = Math.tan((50 * Math.PI / 180) / 2), t1 = Math.tan((TOP.fov * Math.PI / 180) / 2);
    cam.fov = 2 * Math.atan(lerp(t0, t1, Math.pow(ph, 1.6))) * 180 / Math.PI;
    S.s.fog.near = lerp(800, 9000, ph); S.s.fog.far = lerp(2700, 14000, ph);
  }
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return threeRender(S.s, cam, { clearAlpha: 0, exposure: lerp(0.98, 0.9, dip) });
}

/** horizon screen-y for the flight camera (for the painted sky + type) */
function horizonY(lt) {
  const fp = flightPose(Math.min(lt, 6.42));
  let pitch = fp.pitch, fov = 50;
  if (lt > 6.42) { const p = seg(lt, 6.42, 8.4, ease.inOutCubic); pitch = lerp(pitch, -Math.PI / 2, p); }
  const focal = (H / 2) / Math.tan((fov * Math.PI / 180) / 2);
  const ang = Math.min(1.45, -pitch);
  return H / 2 - focal * Math.tan(ang);
}

function paintSky(ctx, lt, hy) {
  const dip = seg(lt, 3.05, 3.55, ease.inOutSine) * (1 - seg(lt, 4.15, 5.0, ease.inOutSine) * 0.8);
  const g = ctx.createLinearGradient(0, hy - 900, 0, hy + 40);
  g.addColorStop(0, mix3('#8E5E4E', '#6E6066', dip));
  g.addColorStop(0.5, mix3('#D9946A', '#A8908A', dip));
  g.addColorStop(0.9, mix3('#F4C994', '#D9C2AE', dip));
  g.addColorStop(1, '#F2CB9C');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // sun bloom (front-left, just off frame)
  const sx = -120, sy = hy - 150;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 1100);
  sg.addColorStop(0, `rgba(255,236,200,${0.85 * (1 - dip * 0.75)})`);
  sg.addColorStop(0.35, `rgba(255,205,150,${0.35 * (1 - dip * 0.7)})`);
  sg.addColorStop(1, 'rgba(255,205,150,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  // high thin cirrus streaks (subtle, drifting)
  ctx.save();
  ctx.globalAlpha = 0.18 * (1 - dip * 0.5);
  ctx.strokeStyle = '#FFF2DE';
  ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const y = hy - 420 + k * 46 + noise.n2(k, 3) * 30;
    const x0 = ((k * 410 + lt * (14 + k * 3)) % 2600) - 500;
    ctx.lineWidth = 3 + (k % 3) * 2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.bezierCurveTo(x0 + 200, y - 12, x0 + 420, y + 8, x0 + 700, y - 6);
    ctx.stroke();
  }
  ctx.restore();
}
function mix3(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = lerp(pa >> 16, pb >> 16, t), g = lerp((pa >> 8) & 255, (pb >> 8) & 255, t), bb = lerp(pa & 255, pb & 255, t);
  return `rgb(${r | 0},${g | 0},${bb | 0})`;
}

scene({
  id: 's1-flight', start: 0, end: 8.85,
  post: { grain: 0.06, vignette: 0.34 },
  init() { if (!S) setup(); },
  dispose() { if (S) { disposeTree(S.s); S = null; } },
  render(ctx, lt, info) {
    if (!S) setup();
    const hy = horizonY(lt);
    paintSky(ctx, lt, hy);
    // UTAH — huge tracked letters standing in the sky behind the mesas
    const up = seg(lt, 0.0, 1.1, ease.outExpo);
    if (hy > -200) {
      const fp = flightPose(Math.min(lt, 6.42));
      const yaw0 = flightPose(0).yaw;
      const dx = -(fp.yaw - yaw0) * 900 + (lt > 6.42 ? 0 : 0);
      ctx.save();
      const tr = lerp(0.62, 0.42, ease.outCubic(seg(lt, 0, 5.5)));
      const size = 290;
      chars(ctx, 'UTAH', W / 2 + dx, hy + 46, { family: 'display', weight: 800, size, tracking: tr, color: '#FFF3E4', align: 'center' }, (i, n) => {
        const p = clamp(up * 1.5 - i * 0.12);
        const e = ease.outExpo(p);
        return { dy: (1 - e) * 140, alpha: e * 0.92 * (1 - seg(lt, 5.6, 6.6, ease.inQuart)), blur: (1 - e) * 12 };
      });
      ctx.restore();
    }
    // 3D terrain (transparent sky) over the painted sky → mesas occlude the type
    const c = render3D(lt);
    ctx.drawImage(c, 0, 0, W, H);
    // atmospheric warm haze near horizon & sun flare veil
    if (hy > -100) {
      const hz = ctx.createLinearGradient(0, hy - 60, 0, hy + 260);
      hz.addColorStop(0, 'rgba(250,215,170,0)');
      hz.addColorStop(0.35, 'rgba(250,215,170,0.28)');
      hz.addColorStop(1, 'rgba(250,215,170,0)');
      ctx.fillStyle = hz;
      ctx.fillRect(0, hy - 60, W, 320);
    }
    // cool cloud-shadow veil sweeping during the dip
    const dip = seg(lt, 3.05, 3.55, ease.inOutSine) * (1 - seg(lt, 4.15, 5.0, ease.inOutSine) * 0.8);
    if (dip > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const cx = lerp(-600, 2600, seg(lt, 2.9, 5.2));
      const g = ctx.createRadialGradient(cx, 760, 100, cx, 760, 1300);
      g.addColorStop(0, `rgba(120,120,140,${0.55 * dip})`);
      g.addColorStop(1, `rgba(170,160,170,${0.25 * dip})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // light dust in the air (flight)
    motes(ctx, lt, { count: 26, seed: 5, wind: -260, rise: 20, alpha: 0.35 * (1 - seg(lt, 6.2, 7.2)), max: 3 });
    // coordinates readout
    const ca = life(lt, 0.6, 6.3, 0.6, 0.4);
    if (ca > 0) {
      const fp = flightPose(Math.min(lt, 6.42));
      const lat = 38.4562 - (fp.z + 20) * 0.00009, lon = 109.8203 - (fp.x + 700) * 0.0001;
      ctx.save();
      ctx.globalAlpha = ca;
      mono(ctx, `${lat.toFixed(4)}° N   ${lon.toFixed(4)}° W`, 140, 980, { size: 17, color: '#FFF1DC', tracking: 0.22 });
      ctx.strokeStyle = 'rgba(255,241,220,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(140, 950); ctx.lineTo(140 + 300 * ca, 950); ctx.stroke();
      for (let k = 0; k <= 10; k++) { const x = 140 + k * 30; ctx.beginPath(); ctx.moveTo(x, 950); ctx.lineTo(x, k % 5 ? 944 : 938); ctx.stroke(); }
      mono(ctx, `ELEV ${Math.round(4800 + altAt(Math.min(lt, 6.42)) * 9)} FT`, 140, 925, { size: 15, color: '#FFF1DC', tracking: 0.3, alpha: 0.75 });
      ctx.restore();
    }
    // CANYONLANDS title over the rising top-down (6.42 → 8.6)
    const ta = life(lt, 6.5, 8.7, 0.9, 0.35);
    if (ta > 0) {
      ctx.save();
      const sg = ctx.createLinearGradient(0, 640, 0, 1080);
      sg.addColorStop(0, 'rgba(40,16,8,0)'); sg.addColorStop(1, `rgba(40,16,8,${0.5 * ta})`);
      ctx.fillStyle = sg; ctx.fillRect(0, 640, W, 440);
      const p = seg(lt, 6.5, 7.6);
      maskRise(ctx, 'national park', 150, 820, seg(lt, 6.75, 7.6), { family: 'serif', italic: true, size: 58, color: '#FFF1DC', alpha: ta });
      chars(ctx, 'CANYONLANDS', 146, 960, { family: 'title', weight: 300, size: 150, color: '#FFF1DC', tracking: lerp(0.3, 0.1, ease.outExpo(p)) }, (i, n) => {
        const e = ease.outExpo(clamp(p * 1.6 - i * 0.05));
        return { dy: (1 - e) * 50, alpha: e * ta, blur: (1 - e) * 8 };
      });
      ctx.restore();
    }
    // opening fade from warm black (0 → 0.45 s)
    const fi = 1 - seg(lt, 0, 0.45, ease.outQuad);
    if (fi > 0) { ctx.fillStyle = `rgba(18,10,7,${fi})`; ctx.fillRect(0, 0, W, H); }
  },
});

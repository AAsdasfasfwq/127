// ─────────────────────────────────────────────────────────────────────────────
// S4 · Movement I — THE CONFESSOR (454.20 → 485.40)
// cold-shade tail → 3D camcorder hero → confessor two-shot → survival slit gauge →
// power + REC macro → 4:3 DV viewfinder diary → pull back out of the LCD.
// ─────────────────────────────────────────────────────────────────────────────
import { scene, makeCanvas } from '../../core/engine.js';
import { THREE, threeRender } from '../../core/three.js';
import { cam as mkCam, multiplane, applyPlane } from '../../core/camera.js';
import { text, maskRise, richLine, chars, measure } from '../../core/text.js';
import { kf, seg, spring, wiggle, handheld, shake, smoothstep } from '../../core/util.js';
import { drawHead, drawHand, drawAaron } from '../../core/aaron.js';
import { slitPath } from '../../core/motifs.js';
import { buildCamcorder, buildLedge } from './camcorder3d.js';
import { drawFootage } from './footage.js';
import {
  W, H, WED, COL, P, bump, clamp, lerp, ease, rng, noise, TAU, C, ROCK, drawChockstone, softShadow, POSES, EXPR, mixPose, mixExpr,
  fillPattern, coldTex, shadeTex, glow, vignette, dvGrade, dvOSD, dvSurround, DV43, wallEdge, drawWall, drawTrapped, motes, wash, sprite, blurred, drawBlurred, noiseTile,
} from './common.js';

// ── shared 3D camcorder rig (one model, re-posed per scene) ──────────────────
let RIG = null;
function rig() {
  if (RIG) return RIG;
  const s3 = new THREE.Scene();
  s3.fog = new THREE.Fog('#0b1016', 34, 95);
  const cc = buildCamcorder();
  cc.group.position.set(0, 3.12, 0);
  s3.add(cc.group);
  cc.lcd.rotation.order = 'YXZ';
  const ledge = buildLedge(); s3.add(ledge);
  const hemi = new THREE.HemisphereLight('#5d7488', '#1a1411', 0.75); s3.add(hemi);
  const key = new THREE.DirectionalLight('#dbe7ff', 2.6);
  key.position.set(-8, 34, -10); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
  key.shadow.bias = -0.0008; key.shadow.radius = 4;
  s3.add(key);
  const rim = new THREE.DirectionalLight('#8fb0d0', 1.4); rim.position.set(14, 8, 16); s3.add(rim);
  const lcdLight = new THREE.PointLight('#cfe6ff', 0, 30, 1.6); s3.add(lcdLight);
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.3, 200);
  RIG = { s3, cc, camera, key, rim, lcdLight, hemi };
  return RIG;
}
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
function screenWorld() {
  const { cc } = rig();
  cc.group.updateMatrixWorld(true);
  const p = new THREE.Vector3(); cc.screen.getWorldPosition(p);
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(cc.screen.getWorldQuaternion(new THREE.Quaternion()));
  return { p, n };
}

// cold rock backdrop behind the 3D camcorder (pre-blurred once)
function rockBackdrop() {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#0d131a'; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.75;
  fillPattern(g, coldTex(44), 0, 0, 1.6, [0, 0, W, H]);
  g.globalAlpha = 1;
  const v = g.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, 'rgba(120,150,175,0.35)'); v.addColorStop(0.45, 'rgba(10,14,20,0.35)'); v.addColorStop(1, 'rgba(6,8,12,0.9)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // slit of light high on the wall
  g.globalCompositeOperation = 'screen';
  const sg = g.createRadialGradient(1220, -80, 0, 1220, -80, 700);
  sg.addColorStop(0, 'rgba(150,185,215,0.55)'); sg.addColorStop(1, 'rgba(150,185,215,0)');
  g.fillStyle = sg; g.fillRect(0, 0, W, H);
  return blurred('s4-rockback', c, 14, 0.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · 454.20–454.36  cold-shade continuation of S3 (B3)
// ─────────────────────────────────────────────────────────────────────────────
scene({
  id: 's4-coldshade', start: 454.2, end: 454.36,
  post: { grain: 0.07, vignette: 0.45 },
  render(ctx, lt, info) {
    const t = info.t;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3E5566'); g.addColorStop(0.5, '#2E3A48'); g.addColorStop(1, '#1A222C');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const L = wallEdge(700, 11, 70), R = wallEdge(1240, 17, 70);
    drawWall(ctx, L, -1, { tex: coldTex(41), shade: 0.35, rim: 'rgba(170,200,225,0.35)' });
    drawWall(ctx, R, 1, { tex: coldTex(45), shade: 0.45, rim: 'rgba(170,200,225,0.25)' });
    drawChockstone(ctx, 1010, 420, 360, { cold: true, light: -1.9, rim: 'rgba(170,200,225,0.35)' });
    drawTrapped(ctx, { x: 930, y: 1060, scale: 0.62, pose: POSES.slump, expr: mixExpr(EXPR.exhausted, EXPR.sad, 0.4) });
    motes(ctx, t, { count: 30, seed: 5, color: '#C9D6DA', alpha: 0.35, vel: [3, 12] });
    vignette(ctx, 0.55);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 · 454.36–459.55  the 3D camcorder hero → into its LCD → DV snippets → tape stop
// ─────────────────────────────────────────────────────────────────────────────
const CAM_KEYS = [
  [454.36, [15.5, 3.2, -12.5], [3.4, 0.9, 0]],
  [455.55, [11.5, 4.6, -16.5], [2.6, 0.9, -1.2]],
  [456.65, [1.5, 5.2, -19.5], [3.0, 1.0, -4.2]],
  [457.65, [-3.6, 1.8, -9.6], [3.9, 0.7, -5.9]],
];
scene({
  id: 's4-camcorder', start: 454.36, end: 459.55,
  post: { grain: 0.06, vignette: 0.42 },
  init() { rig(); rockBackdrop(); },
  render(ctx, lt, info) {
    const t = info.t;
    const R = rig();
    const { cc, camera } = R;
    // LCD opens on "portable video camera" (455.52–456.24): anticipation then swing
    const openA = t < 455.62 ? 0 : t < 455.72 ? -0.03 * seg(t, 455.62, 455.72) : ease.outQuart(seg(t, 455.72, 456.3)) * 1.0 + 0.012 * Math.sin(seg(t, 456.3, 456.8) * Math.PI) * (1 - seg(t, 456.3, 456.8));
    cc.setOpen(openA, 0);
    cc.setTally(0);
    // screen content
    const sc = cc.screenCanvas, g = sc.getContext('2d');
    const on = seg(t, 456.05, 456.25);
    if (on <= 0) { g.fillStyle = '#07090c'; g.fillRect(0, 0, sc.width, sc.height); }
    else if (t < 456.55) {
      g.fillStyle = '#1d3f9e'; g.fillRect(0, 0, sc.width, sc.height);
      text(g, '▶ PLAY', 40, 70, { family: 'mono', size: 30, weight: 600, color: '#eef3ea' });
      g.fillStyle = `rgba(255,255,255,${0.35 * (1 - on)})`; g.fillRect(0, 0, sc.width, sc.height);
    } else drawFootage(g, sc.width, sc.height, t < 458.0 ? 'jump' : 'descent', t < 458.0 ? t - 456.55 : t - 458.0, { t, tc: t < 458.0 ? 312 : 371 });
    cc.screenTex.needsUpdate = true;
    R.lcdLight.intensity = on * 1.6;
    const sw = screenWorld();
    R.lcdLight.position.copy(sw.p).addScaledVector(sw.n, 2.5);

    // camera path; after 457.65 dolly straight into the screen
    let pos, tgt;
    if (t < 457.65) {
      pos = kf(t, CAM_KEYS.map((k) => [k[0], k[1], ease.inOutSine]));
      tgt = kf(t, CAM_KEYS.map((k) => [k[0], k[2], ease.inOutSine]));
      pos = v3(pos); tgt = v3(tgt);
    } else {
      const k = ease.inOutCubic(seg(t, 457.65, 458.45));
      const p0 = v3(CAM_KEYS[3][1]), t0 = v3(CAM_KEYS[3][2]);
      const pEnd = sw.p.clone().addScaledVector(sw.n, 7.0);
      pos = p0.lerp(pEnd, k);
      tgt = t0.lerp(sw.p, k);
    }
    const hh = handheld(t, 0.08, 4);
    camera.position.copy(pos).add(new THREE.Vector3(hh.x * 0.02, hh.y * 0.02, 0));
    camera.lookAt(tgt);
    camera.fov = 30; camera.updateProjectionMatrix();

    const intoScreen = seg(t, 458.25, 458.45);
    if (intoScreen < 1) {
      const bg = rockBackdrop();
      // parallax: shift backdrop slightly with the camera
      const px = (pos.x - 8) * 6;
      ctx.save(); ctx.translate(-px * 0.5, 0); ctx.scale(1.08, 1.08); ctx.translate(-60, -40);
      drawBlurred(ctx, bg, 0, 0);
      ctx.restore();
      const c3 = threeRender(R.s3, camera, { width: 1280, height: 720, exposure: 1.05, shadows: true });
      ctx.drawImage(c3, 0, 0, W, H);
      // light shaft from the slit + floating dust in it
      glow(ctx, 1150, -120, 900, '#9DB9D4', 0.22);
      motes(ctx, t, { count: 34, seed: 12, area: [600, 0, 1100, 900], color: '#D9E4EC', alpha: 0.4, vel: [4, 14], size: [1, 3] });
      vignette(ctx, 0.45);
    }
    if (intoScreen > 0) {
      // the LCD fills the frame: draw the footage full-frame in the 4:3 window
      ctx.save();
      ctx.globalAlpha = intoScreen;
      ctx.fillStyle = '#0A0E0C'; ctx.fillRect(0, 0, W, H);
      const ft = makeFootageFrame(t);
      // tape-stop collapse on "Now," (459.30)
      const col = seg(t, 459.3, 459.47, ease.inQuart);
      const sy = lerp(1, 0.004, col), sx = lerp(1, 0.0, seg(t, 459.44, 459.55, ease.inQuad));
      ctx.translate(W / 2, H / 2); ctx.scale(Math.max(0.001, sx), sy); ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(ft, DV43.x, DV43.y, DV43.w, DV43.h);
      if (col > 0) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(230,240,235,${col})`; ctx.fillRect(DV43.x, DV43.y, DV43.w, DV43.h); }
      ctx.restore();
      if (col < 0.3) dvSurround(ctx, t);
    }
  },
});
let footCanvas = null;
function makeFootageFrame(t) {
  if (!footCanvas) footCanvas = makeCanvas(960, 720);
  const g = footCanvas.getContext('2d');
  drawFootage(g, 960, 720, t < 458.0 ? 'jump' : 'descent', t < 458.0 ? t - 456.55 : t - 458.0, { t, tc: t < 458.0 ? 312 : 371 });
  return footCanvas;
}

export { rig, screenWorld, rockBackdrop };

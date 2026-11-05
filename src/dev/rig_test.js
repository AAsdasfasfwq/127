// Dev playground: model sheet for the shared rig + materials (not part of the film).
import { scene } from '../core/engine.js';
import { drawAaron, drawHead, POSES, EXPR, mixPose } from '../core/aaron.js';
import { drawChockstone, sandstone, paper, dust } from '../core/textures.js';
import { text, richLine } from '../core/text.js';
import { C, PAL, ROCK } from '../core/palette.js';
import { hourCounter, dateCard } from '../core/motifs.js';
import { THREE, threeRender } from '../core/three.js';

let three = null;
scene({
  id: 'dev-sheet', start: 0, end: 10,
  render(ctx, lt) {
    ctx.drawImage(paper(1920, 1080, { base: '#EFE4D0' }), 0, 0);
    const poses = [POSES.stand, POSES.walk(0.25), POSES.chimney(0), POSES.trapped, POSES.stagger(0.3), POSES.armsUp];
    poses.forEach((p, i) => drawAaron(ctx, { x: 160 + i * 270, y: 1000, scale: 0.42, pose: p, facing: i % 2 ? -1 : 1, expr: [EXPR.smile, EXPR.cocky, EXPR.determined, EXPR.pain, EXPR.exhausted, EXPR.grin][i], beard: i / 5, rightArm: i === 4 ? 'stump' : 'normal', rim: 'rgba(255,220,170,0.9)' }));
    drawChockstone(ctx, 1700, 230, 300, {});
    text(ctx, 'model sheet', 40, 60, { family: 'serif', italic: true, size: 40, color: C.ink });
  },
});
scene({
  id: 'dev-heads', start: 10, end: 20,
  render(ctx, lt) {
    ctx.fillStyle = '#2b2522'; ctx.fillRect(0, 0, 1920, 1080);
    const ex = [EXPR.neutral, EXPR.smile, EXPR.pain, EXPR.scream, EXPR.determined, EXPR.tender, EXPR.shock, EXPR.exhausted];
    ex.forEach((e, i) => {
      const yaw = [-0.8, -0.4, 0, 0.3, 0.6, 0.9, 0.2, -0.2][i];
      drawHead(ctx, 220 + (i % 4) * 460, 280 + Math.floor(i / 4) * 500, 380, { yaw, expr: e, beard: i / 7, sunburn: 0.6, dirt: i > 4 ? 0.6 : 0, rim: 'rgba(255,200,150,0.9)', tired: i / 7 });
    });
  },
});
scene({
  id: 'dev-mat', start: 20, end: 30,
  render(ctx, lt) {
    ctx.drawImage(sandstone(960, 1080, { seed: 3 }), 0, 0);
    ctx.drawImage(sandstone(960, 1080, { seed: 5, ramp: ROCK.cold }), 960, 0);
    drawChockstone(ctx, 700, 540, 520, {});
    drawChockstone(ctx, 1400, 540, 420, { cold: true, light: -0.6 });
    dust(ctx, lt, { count: 80 });
    hourCounter(ctx, { hours: 44.6, x: 120, y: 120, t: lt });
    richLine(ctx, [{ t: 'the most', family: 'serif', italic: true, size: 70, color: C.paper }, { t: 'FATAL', family: 'display', weight: 900, size: 170, color: C.red }, { t: 'mistake', family: 'serif', italic: true, size: 70, color: C.paper }], 960, 980, { align: 'center', p: 1 });
  },
});
scene({
  id: 'dev-date', start: 30, end: 33,
  render(ctx, lt, info) { dateCard(ctx, { lt, dur: info.dur, big: 'APR 26 · 2003', small: 'SATURDAY', meta: 'BLUE JOHN CANYON · UTAH' }); },
});
scene({
  id: 'dev-three', start: 33, end: 36, in: { type: 'slit', dur: 1.2 },
  init() {
    const s = new THREE.Scene();
    s.background = new THREE.Color('#E7B98A');
    const tex = new THREE.CanvasTexture(sandstone(512, 512, { seed: 9 }));
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.IcosahedronGeometry(1.2, 5);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i); v.multiplyScalar(1 + 0.12 * Math.sin(v.x * 3.1) * Math.cos(v.y * 2.3)); pos.setXYZ(i, v.x, v.y * 0.75, v.z); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    s.add(m);
    s.add(new THREE.HemisphereLight('#ffe7c4', '#5a2416', 1.2));
    const d = new THREE.DirectionalLight('#fff2dd', 2.5); d.position.set(3, 4, 2); s.add(d);
    const cam = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100); cam.position.set(0, 0.4, 5);
    three = { s, m, cam };
  },
  render(ctx, lt) { three.m.rotation.y = lt * 0.6; ctx.drawImage(threeRender(three.s, three.cam), 0, 0); },
});

// S4 scratch: three.js cost breakdown in SwiftShader.
import { scene, makeCanvas } from '../core/engine.js';
import { THREE, threeRender } from '../core/three.js';
import { sandstone } from '../core/textures.js';
const log = []; window.__s4bench = log;
let CTX;
function bench(name, fn, n = 3) { fn(); CTX.getImageData(0, 0, 1, 1); const t0 = performance.now(); for (let i = 0; i < n; i++) { fn(); CTX.getImageData(0, 0, 1, 1); } log.push(`${name}: ${((performance.now() - t0) / n).toFixed(1)} ms`); }
function mk(segX, segY, mat) {
  const s = new THREE.Scene();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 2, segX, segY), mat); s.add(m);
  s.add(new THREE.AmbientLight('#445', 0.4));
  const d = new THREE.DirectionalLight('#fff', 3); d.position.set(-4, 0.4, 1.2); s.add(d);
  return s;
}
scene({ id: 'bench', start: 0, end: 5,
  render(ctx, lt, info) {
    if (log.length) return; CTX = ctx;
    const cam = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100); cam.position.set(0, 0, 4);
    const tex = new THREE.CanvasTexture(sandstone(1024, 512, { seed: 3 })); tex.colorSpace = THREE.SRGBColorSpace;
    const bc = makeCanvas(1024, 512); const bg = bc.getContext('2d'); bg.fillStyle = '#fff'; bg.fillRect(0, 0, 1024, 512); bg.fillStyle = '#000'; bg.font = '120px "Rock Salt"'; bg.fillText('ARON', 100, 300);
    const bt = new THREE.CanvasTexture(bc);
    const go = (name, scn, w, h, n) => bench(name, () => ctx.drawImage(threeRender(scn, cam, { width: w, height: h, shadows: false }), 0, 0, 1920, 1080), n);
    const empty = new THREE.Scene();
    go('empty scene 1080', empty, 1920, 1080);
    go('empty scene 540', empty, 960, 540);
    go('plane 1seg basic 1080', mk(1, 1, new THREE.MeshBasicMaterial({ map: tex })), 1920, 1080);
    go('plane 1seg std 1080', mk(1, 1, new THREE.MeshStandardMaterial({ map: tex })), 1920, 1080);
    go('plane 1seg std+bump 1080', mk(1, 1, new THREE.MeshStandardMaterial({ map: tex, bumpMap: bt, bumpScale: 3 })), 1920, 1080);
    go('plane 1seg std+bump 960', mk(1, 1, new THREE.MeshStandardMaterial({ map: tex, bumpMap: bt, bumpScale: 3 })), 960, 540);
    go('plane 1seg lambert+bump 1080', mk(1, 1, new THREE.MeshLambertMaterial({ map: tex, bumpMap: bt, bumpScale: 3 })), 1920, 1080);
    go('plane 300x150 std+disp 960', mk(300, 150, new THREE.MeshStandardMaterial({ map: tex, bumpMap: bt, displacementMap: bt, displacementScale: 0.02 })), 960, 540);
    go('plane 120x60 std+disp 960', mk(120, 60, new THREE.MeshStandardMaterial({ map: tex, bumpMap: bt, displacementMap: bt, displacementScale: 0.02 })), 960, 540);
    const sp = new THREE.Scene(); const g = new THREE.SphereGeometry(0.3, 48, 32);
    for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#a22', clearcoat: 1, roughness: 0.35 })); m.position.set((i % 5) - 2, Math.floor(i / 5) * 0.6 - 1, 0); sp.add(m); }
    sp.add(new THREE.AmbientLight('#445', 0.4)); const d2 = new THREE.DirectionalLight('#fff', 3); d2.position.set(-4, 2, 3); sp.add(d2);
    go('20 spheres physical 1080', sp, 1920, 1080);
    go('20 spheres physical 960', sp, 960, 540);
    bench('2d drawImage full x1', () => ctx.drawImage(bc, 0, 0, 1920, 1080), 5);
    bench('2d 3x drawImage full', () => { ctx.drawImage(bc, 0, 0, 1920, 1080); ctx.drawImage(bc, 0, 0, 1920, 1080); ctx.drawImage(bc, 0, 0, 1920, 1080); }, 5);
    console.log(log.join('\n'));
  } });

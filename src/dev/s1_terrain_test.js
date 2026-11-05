// S1 scratch: terrain look + perf test
import { scene } from '../core/engine.js';
import { THREE, threeRender } from '../core/three.js';
import { buildTerrain, sampleWorld } from '../sections/s1/terrain.js';

let S = null;
function setup(res) {
  const s = new THREE.Scene();
  s.fog = new THREE.Fog('#EBC39A', 900, 4200);
  const T = buildTerrain({ res, size: 2400, vert: 170 });
  s.add(T.mesh);
  s.add(new THREE.HemisphereLight('#bcd0e0', '#7a3a22', 0.75));
  const sun = new THREE.DirectionalLight('#ffc286', 4.2);
  sun.position.set(-900, 420, -300);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -1300; sc.right = 1300; sc.top = 1300; sc.bottom = -1300; sc.near = 10; sc.far = 4000;
  sun.shadow.bias = -0.0008;
  s.add(sun);
  const cam = new THREE.PerspectiveCamera(40, 16 / 9, 1, 6000);
  return { s, T, cam, sun };
}
const views = [
  [[-700, 260, 900], [0, 60, -200]],
  [[0, 2100, 1], [0, 0, 0]],
  [[200, 150, 300], [-300, 60, -400]],
];
for (let k = 0; k < 3; k++) {
  scene({
    id: 'dev-t' + k, start: k * 2, end: k * 2 + 2,
    init() { if (!S) S = setup(380); },
    render(ctx, lt) {
      ctx.fillStyle = '#F0CFA6'; ctx.fillRect(0, 0, 1920, 1080);
      const [p, l] = views[k];
      S.cam.position.set(...p); S.cam.lookAt(...l);
      const w = lt < 1 ? 1280 : 1920, h = lt < 1 ? 720 : 1080;
      const c = threeRender(S.s, S.cam, { width: w, height: h, clearAlpha: 0, exposure: 0.95 });
      ctx.drawImage(c, 0, 0, 1920, 1080);
    },
  });
}

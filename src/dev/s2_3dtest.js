// S2 scratch: 3D perf test (slot canyon set + metal object) in SwiftShader.
import { scene } from '../core/engine.js';
import { THREE, threeRender, canvasTexture } from '../core/three.js';
import { sandstone } from '../core/textures.js';
import { ROCK } from '../core/palette.js';
import { noise } from '../core/util.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let S = null;
function build() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#2a1a14');
  s.fog = new THREE.Fog('#3a2418', 6, 30);
  const tex = canvasTexture(sandstone(1024, 1024, { seed: 31, scale: 0.8, strata: 1.4 }), { repeat: [2, 1] });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  for (const side of [-1, 1]) {
    const g = new THREE.PlaneGeometry(40, 14, 160, 60);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const d = noise.fbm2(x * 0.15 + side * 9, y * 0.2, 4) * 0.6 + Math.sin(x * 0.4) * 0.3;
      p.setZ(i, d);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.rotation.y = side * Math.PI / 2;
    m.position.set(-side * 0.8, 5, 0);
    m.receiveShadow = true; m.castShadow = true;
    s.add(m);
  }
  const rock = new THREE.SphereGeometry(0.8, 64, 48);
  const rp = rock.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) { v.fromBufferAttribute(rp, i); const k = 1 + noise.fbm3(v.x * 2, v.y * 2, v.z * 2, 4) * 0.25; v.multiplyScalar(k); v.y *= 0.75; rp.setXYZ(i, v.x, v.y, v.z); }
  rock.computeVertexNormals();
  const rm = new THREE.Mesh(rock, new THREE.MeshStandardMaterial({ map: canvasTexture(sandstone(512, 512, { seed: 128 })), roughness: 0.9 }));
  rm.position.set(0, 2, 0); rm.castShadow = true; rm.receiveShadow = true;
  s.add(rm);
  const hemi = new THREE.HemisphereLight('#9fd0f0', '#7a3a1c', 0.6); s.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe2b8', 3.2);
  sun.position.set(3, 12, 2); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  s.add(sun);
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 100);
  cam.position.set(0, 3.2, 5); cam.lookAt(0, 2, 0);

  // metal test scene
  const m2 = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(threeRenderer());
  m2.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const steel = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 1, roughness: 0.32 });
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(3, 0.1); shape.quadraticCurveTo(4, 0.3, 4.2, 0.8); shape.lineTo(0, 0.6); shape.closePath();
  const bl = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 2 }), steel);
  bl.rotation.x = -Math.PI / 2; bl.castShadow = true;
  m2.add(bl);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.4 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; m2.add(ground);
  const key = new THREE.DirectionalLight('#ffe7c8', 2.5); key.position.set(-1, 8, -2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); key.shadow.radius = 6;
  m2.add(key);
  const cam2 = new THREE.OrthographicCamera(-4.8, 4.8, 2.7, -2.7, 0.1, 50); cam2.position.set(2, 10, 0); cam2.lookAt(2, 0, 0);
  S = { s, cam, rm, sun, m2, cam2, bl };
}
import { getRenderer } from '../core/three.js';
function threeRenderer() { return getRenderer(); }

scene({
  id: 's2dev-slot', start: 0, end: 5,
  init() { if (!S) build(); },
  render(ctx, lt) {
    S.cam.position.set(0, 3.2 - lt * 0.2, 5 - lt * 0.4); S.cam.lookAt(0, 2, 0);
    S.sun.position.set(3 * Math.cos(lt), 12, 2 * Math.sin(lt));
    ctx.drawImage(threeRender(S.s, S.cam), 0, 0);
  },
});
scene({
  id: 's2dev-metal', start: 5, end: 10,
  init() { if (!S) build(); },
  render(ctx, lt) {
    ctx.fillStyle = '#2E3A48'; ctx.fillRect(0, 0, 1920, 1080);
    S.bl.rotation.z = lt * 0.2;
    ctx.drawImage(threeRender(S.m2, S.cam2), 0, 0);
  },
});

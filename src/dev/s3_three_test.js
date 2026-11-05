// S3 scratch: Three.js perf probe (walls + boulders + rope tube + shadows).
import { scene } from '../core/engine.js';
import { THREE, threeRender, canvasTexture } from '../core/three.js';
import { sandstone } from '../core/textures.js';
import { ROCK } from '../core/palette.js';

let S = null;
scene({
  id: 's3-dev-three', start: 0, end: 10,
  init() {
    const s = new THREE.Scene();
    s.background = new THREE.Color('#2a1b14');
    const tex = canvasTexture(sandstone(1024, 1024, { seed: 31, ramp: ROCK.shade }), { repeat: [2, 2] });
    const wallGeo = new THREE.PlaneGeometry(12, 10, 128, 110);
    const pos = wallGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 1.3) * 0.3 + Math.sin(pos.getY(i) * 2.1) * 0.2);
    wallGeo.computeVertexNormals();
    const wm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    const w1 = new THREE.Mesh(wallGeo, wm); w1.position.set(0, 0, -1.2); w1.receiveShadow = true; s.add(w1);
    const w2 = new THREE.Mesh(wallGeo, wm); w2.position.set(0, 0, 1.2); w2.rotation.y = Math.PI; w2.receiveShadow = true; s.add(w2);
    const bGeo = new THREE.IcosahedronGeometry(0.9, 5);
    const b = new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ map: canvasTexture(sandstone(512, 512, { seed: 128 })), roughness: 0.9 }));
    b.castShadow = true; b.receiveShadow = true; s.add(b);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.9, 0), new THREE.Vector3(1, 3, 0), new THREE.Vector3(3, 4, 0.2), new THREE.Vector3(4, 1, 0.4)]);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.04, 10), new THREE.MeshStandardMaterial({ color: '#c06a2a', roughness: 0.7 }));
    rope.castShadow = true; s.add(rope);
    s.add(new THREE.HemisphereLight('#ffe7c4', '#3a1c13', 0.9));
    const d = new THREE.DirectionalLight('#fff2dd', 2.2); d.position.set(3, 8, 2); d.castShadow = true;
    d.shadow.mapSize.set(1024, 1024); d.shadow.camera.left = -8; d.shadow.camera.right = 8; d.shadow.camera.top = 8; d.shadow.camera.bottom = -8;
    s.add(d);
    const cam = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100); cam.position.set(6, 2, 0.5); cam.lookAt(1, 1.5, 0);
    S = { s, cam, b };
  },
  render(ctx, lt) {
    S.b.rotation.y = lt * 0.3;
    S.cam.position.set(6 * Math.cos(lt * 0.1), 2, 6 * Math.sin(lt * 0.1) + 0.5); S.cam.lookAt(1, 1.5, 0);
    ctx.drawImage(threeRender(S.s, S.cam, { width: 1920, height: 1080 }), 0, 0, 1920, 1080);
  },
});

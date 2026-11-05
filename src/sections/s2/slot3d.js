// S2 — one shared Three.js slot-canyon set: sinuous sandstone walls, sand floor, the lip & drop,
// and THE CHOCKSTONE (canonical colours: navajo ramp, two diagonal bands, varnish cap, pale scar,
// lichen eye). Axis: x across the slot, y up, z down-canyon. Narrows z<0, lip at z=0, drop z>0.
import { THREE, threeRender, canvasTexture, getRenderer } from '../../core/three.js';
import { sandstone } from '../../core/textures.js';
import { ROCK } from '../../core/palette.js';
import { noise, rng, clamp, lerp, smoothstep, TAU } from '../../core/util.js';

let SET = null;

/** half-width of the slot at depth z and height y (walls lean in toward the top). */
export function halfWidth(z, y) {
  const base = 0.95 + 0.35 * Math.sin(z * 0.21 + 1.3) + 0.18 * noise.n2(z * 0.13, 4.2);
  const pinch = 1 - 0.28 * smoothstep(-1.5, 0.6, z) * (1 - smoothstep(0.6, 6, z)); // narrow at the chockstone
  const lean = 1 - 0.45 * clamp(y / 22);
  const flare = y < 0 ? 1 - 0.25 * clamp(-y / 5) : 1; // the drop narrows downward
  return base * pinch * lean * flare;
}
/** centre line meander */
export function centreX(z) { return 0.6 * Math.sin(z * 0.09) + 0.25 * Math.sin(z * 0.23 + 2); }
export function floorY(z) { return z < 0.15 ? 0 : -5.2; }

function wallTexture() {
  // full-res sandstone + crisp flowing strata lines (the slot-canyon signature)
  const base = sandstone(1024, 1024, { seed: 241, ramp: ['#7A2E17', '#A2431F', '#C4622F', '#DA8650', '#EDB07A', '#F7D2A2'], scale: 0.7, strata: 2.6, varnish: 0.35, crossbed: 0.9, res: 1 });
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const g = c.getContext('2d');
  g.drawImage(base, 0, 0);
  for (let k = 0; k < 46; k++) {
    const y0 = (k / 46) * 1024;
    const light = k % 3 === 0;
    g.strokeStyle = light ? 'rgba(255,225,185,0.22)' : 'rgba(70,25,10,0.28)';
    g.lineWidth = light ? 2.2 : 1.4 + (k % 5) * 0.4;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 8) {
      const y = y0 + noise.fbm2(x * 0.004 + k * 0.37, k * 0.21, 3) * 26 + Math.sin(x / 1024 * TAU * 2 + k) * 6;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  return c;
}

function chockTexture() {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const base = sandstone(512, 512, { seed: 128, ramp: ROCK.navajo, scale: 0.55, strata: 1.6, varnish: 0.8, crossbed: 0.7, tilt: 0.5 });
  g.drawImage(base, 0, 0, 512, 512, 0, 0, W / 2, H);
  g.drawImage(base, 0, 0, 512, 512, W / 2, 0, W / 2, H);
  // two diagonal strata bands (across u, descending to screen-left on the +z face)
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgba(120,50,25,0.42)';
  for (const [v0, th] of [[0.40, 0.09], [0.60, 0.06]]) {
    g.beginPath();
    for (let u = 0; u <= 1.001; u += 0.02) g.lineTo(u * W, (v0 + (u - 0.25) * 0.28 + Math.sin(u * TAU) * 0.03) * H);
    for (let u = 1; u >= -0.001; u -= 0.02) g.lineTo(u * W, (v0 + th + (u - 0.25) * 0.28 + Math.sin(u * TAU) * 0.03) * H);
    g.closePath(); g.fill();
  }
  // varnish cap (top)
  const cap = g.createLinearGradient(0, 0, 0, H * 0.45);
  cap.addColorStop(0, 'rgba(30,14,10,0.85)'); cap.addColorStop(1, 'rgba(30,14,10,0)');
  g.fillStyle = cap; g.fillRect(0, 0, W, H * 0.45);
  g.globalCompositeOperation = 'source-over';
  // pale scar on the +x side of the +z face (u ≈ 0.33)
  g.fillStyle = 'rgba(245,205,160,0.7)';
  g.beginPath(); g.ellipse(0.34 * W, 0.40 * H, 46, 30, 0.2, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(70,30,15,0.6)'; g.lineWidth = 3; g.stroke();
  // lichen eye (upper-left of the +z face, u ≈ 0.19)
  const r = rng(127 + 44);
  for (let i = 0; i < 60; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 30;
    g.fillStyle = i % 3 ? 'rgba(170,180,120,0.85)' : 'rgba(215,205,140,0.9)';
    g.beginPath(); g.arc(0.19 * W + Math.cos(a) * d, 0.33 * H + Math.sin(a) * d * 0.7, 3 + r() * 5, 0, TAU); g.fill();
  }
  // cracks
  g.strokeStyle = 'rgba(35,15,8,0.6)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0.24 * W, 0.08 * H); g.quadraticCurveTo(0.25 * W, 0.3 * H, 0.22 * W, 0.52 * H);
  g.moveTo(0.36 * W, 0.6 * H); g.quadraticCurveTo(0.31 * W, 0.75 * H, 0.33 * W, 0.92 * H); g.stroke();
  return c;
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2B78B4'); gr.addColorStop(0.3, '#4FA6DA'); gr.addColorStop(0.5, '#A9D6EE'); gr.addColorStop(1, '#CFE6F2');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildWall(side, mat) {
  const L = 72, Hh = 30, z0 = -46;
  const segZ = 288, segY = 96;
  const g = new THREE.PlaneGeometry(L, Hh, segZ, segY);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const z = z0 + u * L;
    const y = -7 + v * Hh;
    // flowing horizontal erosion grooves + bulges
    const groove = noise.ridge2(z * 0.18 + side * 11, y * 0.9, 3) * 0.22;
    const bulge = noise.fbm2(z * 0.08 + side * 5, y * 0.12, 4) * 0.55;
    const fine = noise.n2(z * 1.4, y * 2.2 + side) * 0.03;
    const x = centreX(z) + side * (halfWidth(z, y) + bulge * 0.6 + groove + fine);
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, z * 0.16, y * 0.13);
  }
  g.computeVertexNormals();
  if (side < 0) { // flip winding so normals face into the slot
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = t; }
    g.computeVertexNormals();
  }
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function buildFloor(mat) {
  const g = new THREE.PlaneGeometry(3.4, 72, 34, 288);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) - 10;
    let y = floorY(z) + noise.fbm2(x * 1.3, z * 0.7, 3) * 0.05 + x * x * 0.05;
    // the lip: a rounded edge
    if (z > 0 && z < 0.35) y = lerp(0, -0.35, (z / 0.35) ** 2);
    if (z >= 0.35 && z < 0.9) y = lerp(-0.35, -5.2, smoothstep(0.35, 0.9, z));
    pos.setXYZ(i, x + centreX(z), y, z);
    uv.setXY(i, x * 0.25, z * 0.12);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}

export function chockGeometry(size = 1) {
  const g = new THREE.SphereGeometry(1, 120, 80);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = noise.fbm3(v.x * 1.4 + 3, v.y * 1.4, v.z * 1.4, 4) * 0.16 + noise.fbm3(v.x * 5, v.y * 5, v.z * 5, 3) * 0.035;
    v.multiplyScalar(1 + n);
    v.x *= 0.62 * size; v.y *= 0.46 * size; v.z *= 0.5 * size;
    if (v.y < 0) v.y *= 0.82; // flatter bottom (rests)
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Build (once) and return the shared set. */
export function getSet() {
  if (SET) return SET;
  const scene = new THREE.Scene();
  const sky = skyTexture();
  scene.background = sky;
  scene.backgroundIntensity = 1;
  scene.fog = new THREE.FogExp2('#D9A070', 0.03);

  const wtex = canvasTexture(wallTexture(), { repeat: [1, 1] });
  wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping;
  const wallMat = new THREE.MeshStandardMaterial({ map: wtex, bumpMap: wtex, bumpScale: 3.5, roughness: 0.92, metalness: 0, color: '#ffffff' });
  const left = buildWall(-1, wallMat), right = buildWall(1, wallMat);
  scene.add(left, right);

  const ftex = canvasTexture(sandstone(512, 512, { seed: 77, ramp: ROCK.bleached, scale: 1.6, strata: 0.4, varnish: 0, crossbed: 0.2 }), { repeat: [1, 1] });
  ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping;
  const floor = buildFloor(new THREE.MeshStandardMaterial({ map: ftex, bumpMap: ftex, bumpScale: 1.2, roughness: 1, color: '#f0c9a0' }));
  scene.add(floor);

  const ctex = canvasTexture(chockTexture());
  const chockMat = new THREE.MeshStandardMaterial({ map: ctex, bumpMap: ctex, bumpScale: 3, roughness: 0.9 });
  const chock = new THREE.Mesh(chockGeometry(1.75), chockMat);
  chock.position.set(centreX(0.8), -0.62, 0.85);
  chock.rotation.set(0.05, 0.1, -0.06);
  chock.castShadow = true; chock.receiveShadow = true;
  scene.add(chock);

  // pebbles on the floor (detail, no primitives as hero)
  const pebMat = new THREE.MeshStandardMaterial({ color: '#9E5A35', roughness: 0.95 });
  const R = rng(9);
  const pg = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 60; i++) {
    const z = -30 + R() * 30, x = centreX(z) + (R() - 0.5) * 1.2;
    const s = 0.03 + R() * 0.09;
    const p = new THREE.Mesh(pg, pebMat);
    p.scale.set(s * (1 + R()), s * 0.6, s);
    p.position.set(x, s * 0.3, z); p.rotation.set(R() * 3, R() * 3, R() * 3);
    p.castShadow = true; p.receiveShadow = true;
    scene.add(p);
  }

  const hemi = new THREE.HemisphereLight('#9fd0f0', '#8a3f1c', 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe0b0', 5);
  sun.position.set(16, 26, -3);
  sun.target.position.set(0, 0, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 30, bottom: -30, near: 1, far: 80 });
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  // warm bounce light inside the slot (the famous glow)
  const bounces = [];
  for (const z of [-24, -16, -9, -3, 3, 10]) {
    const pl = new THREE.PointLight('#ffa262', 4.5, 10, 1.5);
    pl.position.set(centreX(z), 4.5, z);
    scene.add(pl); bounces.push(pl);
  }
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.03, 200);
  SET = { scene, cam, sun, hemi, bounces, chock, left, right, floor, sky, wallMat };
  return SET;
}

/** Lighting presets: 'day' (warm sun from above), 'cold' (shade), or time-lapse blend. */
export function setLight(S, o = {}) {
  const day = o.day ?? 1;
  S.sun.intensity = (o.sun ?? 5) * day;
  S.sun.color.set(o.sunColor || '#ffe0b0');
  if (o.sunPos) S.sun.position.set(...o.sunPos);
  S.hemi.intensity = lerp(0.12, o.hemi ?? 1.1, day);
  S.hemi.color.set(o.skyColor || '#9fd0f0');
  S.hemi.groundColor.set(o.groundColor || '#8a3f1c');
  S.bounces.forEach((b) => { b.intensity = (o.bounce ?? 4.5) * day; b.color.set(o.bounceColor || '#ffa262'); });
  S.scene.backgroundIntensity = lerp(0.07, 1, day) * (o.skyI ?? 1);
  S.scene.fog.color.set(o.fog || '#D9A070');
  S.scene.fog.density = o.fogD ?? 0.03;
}

export function render3(S, o = {}) {
  return threeRender(S.scene, S.cam, { exposure: o.exposure ?? 1.0, clearColor: 0x000000, clearAlpha: 1 });
}

/** project a world point to screen px */
export function toScreen(S, x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(S.cam);
  return { x: (v.x * 0.5 + 0.5) * 1920, y: (-v.y * 0.5 + 0.5) * 1080, z: v.z, behind: v.z > 1 };
}

export function camLook(S, pos, target, fov = 50, up = [0, 1, 0]) {
  S.cam.fov = fov;
  S.cam.position.set(...pos);
  S.cam.up.set(...up);
  S.cam.lookAt(...target);
  S.cam.updateProjectionMatrix();
  S.cam.updateMatrixWorld();
}

export { THREE };

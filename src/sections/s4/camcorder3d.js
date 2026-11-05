// ─────────────────────────────────────────────────────────────────────────────
// S4 — the MiniDV camcorder (Three.js). Generic 2003-era handycam: graphite body,
// lens barrel with ribbed focus ring and coated glass, flip-out LCD with a live canvas
// screen, viewfinder, hand strap, red tally lamp. No brand marks.
// ─────────────────────────────────────────────────────────────────────────────
import { THREE } from '../../core/three.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeCanvas } from '../../core/engine.js';
import { mulberry32, noise } from '../../core/util.js';
import { sandstone } from '../../core/textures.js';
import { ROCK } from '../../core/palette.js';

function tex(canvas, o = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  t.anisotropy = 4;
  return t;
}

function plasticCanvas(base = '#2B2C30', seed = 3, seams = true) {
  const c = makeCanvas(512, 512);
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  const r = mulberry32(seed);
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < 512 * 512; i++) {
    const v = (r() - 0.5) * 10 + noise.n2((i % 512) * 0.02, Math.floor(i / 512) * 0.02 + seed) * 6;
    img.data[i * 4] += v; img.data[i * 4 + 1] += v; img.data[i * 4 + 2] += v;
  }
  g.putImageData(img, 0, 0);
  if (seams) {
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 360); g.lineTo(512, 360); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.moveTo(0, 362); g.lineTo(512, 362); g.stroke();
    // vent slots
    g.fillStyle = 'rgba(0,0,0,0.6)';
    for (let k = 0; k < 7; k++) g.fillRect(330 + k * 18, 404, 8, 60);
    // small screws
    for (const [x, y] of [[40, 40], [470, 40], [40, 470], [470, 470]]) {
      g.fillStyle = '#1a1b1d'; g.beginPath(); g.arc(x, y, 7, 0, 6.28); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.stroke();
    }
  }
  return c;
}
function ribCanvas() {
  const c = makeCanvas(512, 64);
  const g = c.getContext('2d');
  for (let x = 0; x < 512; x += 8) {
    const gr = g.createLinearGradient(x, 0, x + 8, 0);
    gr.addColorStop(0, '#0d0d0f'); gr.addColorStop(0.5, '#3a3b40'); gr.addColorStop(1, '#0d0d0f');
    g.fillStyle = gr; g.fillRect(x, 0, 8, 64);
  }
  return c;
}
function lensCanvas() {
  const c = makeCanvas(512, 512);
  const g = c.getContext('2d');
  const cx = 256, cy = 256;
  const rg = g.createRadialGradient(cx, cy, 10, cx, cy, 256);
  rg.addColorStop(0, '#05060a'); rg.addColorStop(0.55, '#0d1018'); rg.addColorStop(0.85, '#161a24'); rg.addColorStop(1, '#2a2d35');
  g.fillStyle = rg; g.fillRect(0, 0, 512, 512);
  // inner element rings
  for (const [r, col, w] of [[230, '#3a3e48', 6], [190, '#1d2230', 3], [140, '#232a3a', 2], [95, '#14202a', 2]]) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, 0, 6.28); g.stroke();
  }
  // multi-coating reflections
  g.globalCompositeOperation = 'screen';
  const arc = (r, a0, a1, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke(); };
  arc(170, 3.6, 4.6, 'rgba(120,255,170,0.45)', 10);
  arc(120, 0.4, 1.3, 'rgba(200,120,255,0.4)', 8);
  arc(60, 3.9, 5.0, 'rgba(255,190,110,0.35)', 6);
  const hl = g.createRadialGradient(180, 170, 0, 180, 170, 70);
  hl.addColorStop(0, 'rgba(230,240,255,0.55)'); hl.addColorStop(1, 'rgba(230,240,255,0)');
  g.fillStyle = hl; g.fillRect(0, 0, 512, 512);
  // tiny generic spec text ring
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(220,225,235,0.55)';
  g.font = '600 18px "Martian Mono"';
  g.save(); g.translate(cx, cy);
  const s = '  OPTICAL 10x  ·  f=3.6–36 mm  ·  1:1.8  ·  Ø 30  ';
  for (let i = 0; i < s.length; i++) { g.save(); g.rotate(-1.4 + i * 0.055); g.fillText(s[i], -6, -214); g.restore(); }
  g.restore();
  return c;
}
function strapCanvas() {
  const c = makeCanvas(256, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#1c1d20'; g.fillRect(0, 0, 256, 64);
  for (let y = 0; y < 64; y += 3) { g.fillStyle = y % 6 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.25)'; g.fillRect(0, y, 256, 1); }
  g.strokeStyle = 'rgba(160,160,165,0.35)'; g.setLineDash([6, 5]); g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 8); g.lineTo(256, 8); g.moveTo(0, 56); g.lineTo(256, 56); g.stroke();
  return c;
}
function labelCanvas() {
  const c = makeCanvas(512, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#26272b'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(210,214,220,0.75)';
  g.font = '700 30px "Bricolage Grotesque"'; g.fillText('DIGITAL VIDEO', 24, 52);
  g.font = '400 20px "Martian Mono"'; g.fillText('10x OPTICAL ZOOM', 24, 88);
  g.fillStyle = 'rgba(0,0,0,0.5)'; for (let k = 0; k < 14; k++) g.fillRect(300 + k * 14, 150, 6, 70);
  return c;
}

/**
 * Build the camcorder. Returns { group, lcd (pivot group), screenTex, screenCanvas, tally, setOpen(a), setTally(on) }
 * Units ≈ cm. Body centred at origin, lens pointing +X, top +Y, LCD on the -Z side (camera-left when lens faces right).
 */
export function buildCamcorder(o = {}) {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ map: tex(plasticCanvas('#2C2D31', 3)), roughness: 0.52, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: '#141417', roughness: 0.65, metalness: 0.1 });
  const rubber = new THREE.MeshStandardMaterial({ map: tex(ribCanvas(), { repeat: [1, 1] }), roughness: 0.85, metalness: 0 });
  const silver = new THREE.MeshStandardMaterial({ color: '#9aa0a8', roughness: 0.3, metalness: 0.85 });
  const side = new THREE.MeshStandardMaterial({ map: tex(labelCanvas()), roughness: 0.55, metalness: 0.1 });

  // main body
  const main = new THREE.Mesh(new RoundedBoxGeometry(10.5, 6.2, 5.4, 4, 0.9), body);
  main.castShadow = main.receiveShadow = true;
  group.add(main);
  // right-side grip bulge (strap side, +Z)
  const grip = new THREE.Mesh(new RoundedBoxGeometry(7.5, 5.4, 1.4, 3, 0.6), dark);
  grip.position.set(-0.6, -0.2, 2.85); grip.castShadow = true;
  group.add(grip);
  // side label plate (+Z face of the top part)
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), side);
  plate.position.set(2.4, 1.9, 2.71); group.add(plate);

  // lens barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.15, 3.2, 48), body);
  barrel.rotation.z = Math.PI / 2; barrel.position.set(6.3, 0.35, 0); barrel.castShadow = true;
  group.add(barrel);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.28, 2.28, 1.1, 64, 1, true), rubber);
  ring.rotation.z = Math.PI / 2; ring.position.set(6.6, 0.35, 0);
  group.add(ring);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.2, 1.2, 64, 1, true), new THREE.MeshStandardMaterial({ color: '#111114', roughness: 0.7, side: THREE.DoubleSide }));
  hood.rotation.z = Math.PI / 2; hood.position.set(8.4, 0.35, 0);
  group.add(hood);
  const chrome = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.07, 8, 64), silver);
  chrome.rotation.y = Math.PI / 2; chrome.position.set(7.92, 0.35, 0);
  group.add(chrome);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(2.02, 64), new THREE.MeshPhysicalMaterial({ map: tex(lensCanvas()), roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }));
  glass.rotation.y = Math.PI / 2; glass.position.set(7.9, 0.35, 0);
  group.add(glass);

  // top microphone grille + zoom rocker
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 32), new THREE.MeshStandardMaterial({ map: tex((() => { const c = makeCanvas(256, 128); const g = c.getContext('2d'); g.fillStyle = '#222326'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#060607'; for (let y = 6; y < 128; y += 10) for (let x = (y / 10) % 2 * 5; x < 256; x += 10) { g.beginPath(); g.arc(x, y, 2.6, 0, 6.28); g.fill(); } return c; })()), roughness: 0.6, metalness: 0.4 }));
  mic.rotation.z = Math.PI / 2; mic.position.set(2.6, 3.55, 0); mic.castShadow = true;
  group.add(mic);
  const rocker = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.5, 0.9, 2, 0.2), silver);
  rocker.position.set(-2.4, 3.2, 1.2); group.add(rocker);
  // viewfinder (back top)
  const vf = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.8, 32), dark);
  vf.rotation.z = Math.PI / 2; vf.position.set(-6.0, 2.3, 0); vf.castShadow = true;
  group.add(vf);
  const cup = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.32, 12, 32), new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.95 }));
  cup.rotation.y = Math.PI / 2; cup.position.set(-7.4, 2.3, 0); group.add(cup);
  // REC button (back) and tally lamp (front top)
  const recBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 32), new THREE.MeshStandardMaterial({ color: '#B4231A', roughness: 0.4 }));
  recBtn.rotation.z = Math.PI / 2; recBtn.position.set(-5.3, -0.9, 1.4); group.add(recBtn);
  const tallyMat = new THREE.MeshStandardMaterial({ color: '#5a1410', emissive: '#ff2a18', emissiveIntensity: 0, roughness: 0.2 });
  const tally = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), tallyMat);
  tally.position.set(5.0, 2.55, 1.6); group.add(tally);

  // hand strap (+Z side)
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(3.8, -2.2, 3.4), new THREE.Vector3(1.5, -0.6, 4.6), new THREE.Vector3(-2.0, 0.4, 4.7), new THREE.Vector3(-4.6, 1.8, 3.5)]);
  const strap = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.55, 10, false), new THREE.MeshStandardMaterial({ map: tex(strapCanvas(), { repeat: [6, 1] }), roughness: 0.9 }));
  strap.scale.set(1, 1, 1); strap.castShadow = true;
  group.add(strap);

  // flip-out LCD on the -Z side, hinged at the front edge (x = +3.3)
  const lcd = new THREE.Group();
  lcd.position.set(3.3, 0.6, -2.75);
  const panel = new THREE.Mesh(new RoundedBoxGeometry(6.6, 4.4, 0.55, 3, 0.25), body);
  panel.position.set(-3.3, 0, -0.28); panel.castShadow = true;
  lcd.add(panel);
  const screenCanvas = makeCanvas(o.screenW || 640, o.screenH || 480);
  const screenTex = tex(screenCanvas);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.9), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  // screen faces the body when closed (local +Z)... it is on the inner face
  screen.position.set(-3.3, 0, 0.005);
  lcd.add(screen);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 4.15), new THREE.MeshStandardMaterial({ color: '#0e0e10', roughness: 0.4 }));
  bezel.position.set(-3.3, 0, 0.001); lcd.add(bezel);
  group.add(lcd);

  return {
    group, lcd, screen, screenTex, screenCanvas, tally,
    /** open: 0 closed → 1 open 95° (screen facing back toward the camcorder's operator) ; turn: rotate panel 180° to face the subject */
    setOpen(a, turn = 0) {
      lcd.rotation.y = a * (Math.PI * 0.53);
      panel.rotation.x = 0; screen.rotation.x = 0;
      lcd.rotation.x = turn * Math.PI;
    },
    setTally(v) { tallyMat.emissiveIntensity = v * 4; },
    dispose() {},
  };
}

/** Sandstone ledge the camcorder rests on (cold shade). */
export function buildLedge() {
  const c = sandstone(1024, 1024, { seed: 61, ramp: ROCK.cold, scale: 0.55, strata: 1.4, varnish: 0.5, crossbed: 0.6 });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  const geo = new THREE.PlaneGeometry(120, 80, 60, 40);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const d = Math.hypot(x, y);
    const k = Math.min(1, Math.max(0, (d - 9) / 14));
    pos.setZ(i, (noise.fbm2(x * 0.05, y * 0.05, 4) * 1.6 + noise.n2(x * 0.3, y * 0.3) * 0.15) * k + noise.n2(x * 0.4, y * 0.4) * 0.08 - (y < -26 ? (y + 26) * 0.6 : 0));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, metalness: 0, bumpMap: t, bumpScale: 1.2 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

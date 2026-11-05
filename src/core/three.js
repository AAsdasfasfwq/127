// ─────────────────────────────────────────────────────────────────────────────
// three.js — one shared WebGL renderer for every 3D shot.
// Usage inside a scene:
//   import { THREE, threeRender } from '../../core/three.js';
//   init() { this.scene3 = new THREE.Scene(); this.cam3 = new THREE.PerspectiveCamera(35, 16/9, 0.1, 5000); ... }
//   render(ctx, lt) { ...animate objects from lt...; const c = threeRender(this.scene3, this.cam3); ctx.drawImage(c, 0, 0); }
// The renderer is shared — always set everything you need (clear colour, tone mapping,
// shadows) via the options of threeRender; never rely on state left by another scene.
// Determinism: drive every transform from `lt`. No clocks, no physics engines with
// internal state unless you re-simulate from the scene start with a fixed step.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

export { THREE };
let renderer = null;

export function getRenderer() {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  canvas.width = 1920; canvas.height = 1080;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(1920, 1080, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

/**
 * Render a THREE scene and return the canvas (draw it with ctx.drawImage(c, 0, 0, W, H)).
 * opts: { width, height, clearColor, clearAlpha, exposure, toneMapping, shadows }
 */
export function threeRender(scene, camera, o = {}) {
  const r = getRenderer();
  const w = o.width || 1920, h = o.height || 1080;
  const c = r.domElement;
  if (c.width !== w || c.height !== h) r.setSize(w, h, false);
  r.toneMapping = o.toneMapping ?? THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = o.exposure ?? 1.0;
  r.shadowMap.enabled = o.shadows ?? true;
  r.setClearColor(o.clearColor ?? 0x000000, o.clearAlpha ?? 0);
  if (camera.isPerspectiveCamera && Math.abs(camera.aspect - w / h) > 1e-3) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  r.render(scene, camera);
  return c;
}

/** Canvas → THREE texture helper (procedural canvas textures from textures.js). */
export function canvasTexture(canvas, o = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = o.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Dispose helper for scene.dispose(). */
export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const m = Array.isArray(o.material) ? o.material : [o.material];
      m.forEach((mm) => {
        for (const k of Object.keys(mm)) if (mm[k] && mm[k].isTexture) mm[k].dispose();
        mm.dispose();
      });
    }
  });
}

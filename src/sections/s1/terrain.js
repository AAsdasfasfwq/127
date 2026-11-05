// S1 · procedural Canyonlands terrain — ONE height function shared by the 3D flight,
// the 2D contour "maze" map and the block diagram, so every view is the same geography.
// 3D look: strata colour is looked up in the fragment shader by WORLD HEIGHT (crisp
// horizontal bands on every cliff regardless of mesh resolution); vertex colours carry
// cavity darkening + junipers; a stripe-free grain texture adds tactile detail.
import { clamp, lerp, makeNoise, hexToRgb, rng, TAU } from '../../core/util.js';
import { canyonH, strataColor, heightGrid, BANDS } from './terrain_h.js';
import { THREE, canvasTexture } from '../../core/three.js';
import { cached } from '../../core/textures.js';
export { canyonH, strataColor, heightGrid };
const NZ = makeNoise(2003);

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/** 1D strata strip (vertical = height 0..1) with fine laminations. */
export function strataStrip(bands = BANDS, seed = 5) {
  return cached('s1strata:' + seed + bands.length, () => {
    const H = 1024, c = mk(8, H), g = c.getContext('2d');
    const r = rng(seed);
    const rgbs = bands.map(([h, col]) => [h, hexToRgb(col)]);
    const img = g.createImageData(8, H);
    for (let y = 0; y < H; y++) {
      const h = 1.1 * (1 - y / (H - 1));
      let rgb = rgbs[rgbs.length - 1][1];
      for (let i = 1; i < rgbs.length; i++) if (h <= rgbs[i][0]) {
        const [h0, c0] = rgbs[i - 1], [h1, c1] = rgbs[i];
        const t = clamp((h - h0) / (h1 - h0));
        rgb = [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)];
        break;
      }
      const lam = 1 + Math.sin(h * 420) * 0.035 + Math.sin(h * 97 + 1.3) * 0.05 + NZ.n2(h * 60, 3.3) * 0.07;
      for (let x = 0; x < 8; x++) {
        const k = (y * 8 + x) * 4;
        img.data[k] = rgb[0] * lam; img.data[k + 1] = rgb[1] * lam; img.data[k + 2] = rgb[2] * lam; img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

/** Stripe-free rock grain (greyscale around 0.85) for tiling. */
export function grainTex(seed = 7) {
  return cached('s1grain:' + seed, () => {
    const S = 512, c = mk(S, S), g = c.getContext('2d');
    const img = g.createImageData(S, S);
    const N = makeNoise(seed);
    const r = rng(seed);
    const per = (x, y, f) => {
      // tileable fbm via 4-corner blend
      const u = x / S, v = y / S;
      const a = N.fbm2(x * f, y * f, 4), b = N.fbm2((x - S) * f, y * f, 4), c2 = N.fbm2(x * f, (y - S) * f, 4), d = N.fbm2((x - S) * f, (y - S) * f, 4);
      return lerp(lerp(a, b, u), lerp(c2, d, u), v);
    };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = 0.86 + per(x, y, 0.012) * 0.16 + per(x, y, 0.06) * 0.07 + (r() - 0.5) * 0.06;
      const k = (y * S + x) * 4;
      const c3 = clamp(v, 0, 1) * 255;
      img.data[k] = c3; img.data[k + 1] = c3 * 0.985; img.data[k + 2] = c3 * 0.96; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    for (let k = 0; k < 2600; k++) {
      g.fillStyle = r() < 0.6 ? 'rgba(40,20,12,0.25)' : 'rgba(255,240,220,0.2)';
      g.beginPath(); g.arc(r() * S, r() * S, 0.6 + r() * 1.4, 0, TAU); g.fill();
    }
    return c;
  });
}

/** Patch a MeshStandardMaterial so diffuse = strata(worldY) × vertex colour × grain. */
export function strataMaterial(vert, o = {}) {
  const strata = canvasTexture(strataStrip(o.bands, o.seed));
  strata.wrapS = strata.wrapT = THREE.ClampToEdgeWrapping;
  const grain = canvasTexture(grainTex(11), { repeat: [o.repeat || 16, o.repeat || 16] });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: 0.97, metalness: 0 });
  const U = { strataTex: { value: strata }, vertScale: { value: vert }, snowAmt: { value: o.snow || 0 }, dryTint: { value: new THREE.Color(1, 1, 1) } };
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vH;\nvarying vec2 vXZ;\nvarying float vNy;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y; vXZ = position.xz; vNy = normal.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D strataTex; uniform float vertScale; uniform float snowAmt; uniform vec3 dryTint;\nvarying float vH;\nvarying vec2 vXZ;\nvarying float vNy;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hh = vH / vertScale;
        float wob = (sin(vXZ.x * 0.0131 + vXZ.y * 0.004) + sin(vXZ.y * 0.0117 - vXZ.x * 0.003)) * 0.0045;
        vec3 sc = texture2D(strataTex, vec2(0.5, clamp((hh + wob) / 1.1, 0.0, 1.0))).rgb;
        float flatK = smoothstep(0.75, 0.97, vNy);
        sc = mix(sc, sc * vec3(1.06, 1.0, 0.92), flatK * 0.5);
        diffuseColor.rgb *= sc * dryTint;
        float sn = snowAmt * clamp((hh - 0.32) * 3.0 + (flatK - 0.5) * 1.2, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.95), sn);`);
  };
  return mat;
}

/**
 * Build the 3D terrain mesh. size = world width, vert = vertical scale (world units for h=1).
 */
export function buildTerrain(o = {}) {
  const res = o.res || 220;
  const size = o.size || 2000, vert = o.vert || 260;
  const G = heightGrid(res, o.u0 ?? -1, o.u1 ?? 1, o.v0 ?? -1, o.v1 ?? 1);
  const geo = new THREE.PlaneGeometry(size, size, res - 1, res - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let k = 0; k < pos.count; k++) {
    const i = k % res, j = Math.floor(k / res);
    const h = G.g[j * res + i];
    pos.setY(k, h * vert);
    let avg = 0, c = 0;
    for (let dj = -4; dj <= 4; dj += 2) for (let di = -4; di <= 4; di += 2) {
      const ii = clamp(i + di, 0, res - 1), jj = clamp(j + dj, 0, res - 1);
      avg += G.g[jj * res + ii]; c++;
    }
    avg /= c;
    const cav = clamp((avg - h) * 5, 0, 0.45);
    const n = NZ.n2(i * 0.21, j * 0.21) * 0.06 + NZ.n2(i * 0.05, j * 0.05) * 0.08;
    let v = (1 - cav) * (0.96 + n);
    let rr = v, gg = v, bb = v;
    // junipers / blackbrush on the flats (dark olive specks)
    const jn = NZ.n2(i * 1.9 + 3, j * 1.9);
    if (jn > 0.66 && (h > 0.93 || (h > 0.43 && h < 0.5))) { rr *= 0.42; gg *= 0.46; bb *= 0.33; }
    col[k * 3] = rr; col[k * 3 + 1] = gg; col[k * 3 + 2] = bb;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = strataMaterial(vert, { snow: o.snow, repeat: o.repeat });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return { mesh, mat, grid: G, size, vert, res };
}

/** Sample the terrain height in world units (bilinear on the cached grid). */
export function sampleWorld(T, x, z) {
  const { res, g } = T.grid;
  const fx = clamp((x / T.size + 0.5) * (res - 1), 0, res - 1.001);
  const fz = clamp((z / T.size + 0.5) * (res - 1), 0, res - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j;
  const h = lerp(lerp(g[j * res + i], g[j * res + i + 1], a), lerp(g[(j + 1) * res + i], g[(j + 1) * res + i + 1], a), b);
  return h * T.vert;
}

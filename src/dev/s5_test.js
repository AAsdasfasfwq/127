// S5 scratch: rig at close-up scale + 3D x-ray look test.
import { scene } from '../core/engine.js';
import { drawAaron, drawHead, POSES, EXPR, mixPose } from '../core/aaron.js';
import { drawChockstone, sandstone } from '../core/textures.js';
import { ROCK } from '../core/palette.js';
import { THREE, threeRender } from '../core/three.js';

scene({
  id: 's5dev-rig', start: 0, end: 5,
  render(ctx, lt) {
    ctx.fillStyle = '#2E3A48'; ctx.fillRect(0, 0, 1920, 1080);
    ctx.drawImage(sandstone(1920, 1080, { seed: 5, ramp: ROCK.cold }), 0, 0);
    ctx.fillStyle = 'rgba(20,26,34,0.5)'; ctx.fillRect(0, 0, 1920, 1080);
    const pose = { ...POSES.trapped, yaw: -0.2, nod: 0.05, armR: { sh: 2.35, el: 0.25, wr: 0, hand: 'grip' } };
    drawAaron(ctx, { x: 1250, y: 2450, scale: 2.2, facing: -1, pose, expr: EXPR.determined, beard: 0.95, dirt: 0.8, tired: 0.8, light: [0.2, 1], rim: 'rgba(170,200,230,0.9)' });
    drawChockstone(ctx, 380, 180, 760, { cold: true, light: -1.6 });
  },
});
scene({
  id: 's5dev-head', start: 5, end: 10,
  render(ctx, lt) {
    ctx.fillStyle = '#1E2630'; ctx.fillRect(0, 0, 1920, 1080);
    drawHead(ctx, 700, 540, 700, { yaw: -0.7, expr: EXPR.determined, beard: 0.95, dirt: 0.8, tired: 0.8, sunburn: 0.5, light: [0.3, 1], rim: 'rgba(170,200,230,0.9)' });
    drawHead(ctx, 1450, 540, 500, { yaw: 0.5, expr: EXPR.exhausted, beard: 0.95, dirt: 0.8, tired: 0.8, light: [0.3, 1] });
  },
});

let T = null;
scene({
  id: 's5dev-x3', start: 10, end: 15,
  init() {
    const s = new THREE.Scene();
    const mk = (r0, r1, len, col, k) => {
      const g = new THREE.CylinderGeometry(r1, r0, len, 48, 40, true);
      g.rotateZ(Math.PI / 2);
      const m = new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color(col) }, uK: { value: k } },
        vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 uCol; uniform float uK; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); f = pow(f, 1.6); gl_FragColor = vec4(uCol * (0.08 + f) * uK, 1.0); }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      return new THREE.Mesh(g, m);
    };
    const flesh = mk(0.42, 0.3, 2.8, '#E9DFCC', 0.35); s.add(flesh);
    const rad = mk(0.08, 0.07, 2.6, '#F4EBDA', 0.9); rad.position.set(0, 0.1, 0.12); s.add(rad);
    const uln = mk(0.075, 0.065, 2.7, '#F4EBDA', 0.9); uln.position.set(0, -0.12, -0.08); s.add(uln);
    const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100); cam.position.set(1.2, 1.4, 5.2); cam.lookAt(0, 0, 0);
    T = { s, cam, flesh };
  },
  render(ctx, lt) {
    ctx.fillStyle = '#140E0C'; ctx.fillRect(0, 0, 1920, 1080);
    T.s.rotation.y = lt * 0.3;
    ctx.drawImage(threeRender(T.s, T.cam, { width: 1440, height: 810, toneMapping: THREE.NoToneMapping }), 0, 0, 1920, 1080);
  },
});

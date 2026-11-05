// S4 scratch: micro-benchmarks of canvas/three ops in headless SwiftShader.
import { scene, makeCanvas } from '../core/engine.js';
import { THREE, threeRender } from '../core/three.js';
import { sandstone } from '../core/textures.js';
const log = [];
window.__s4bench = log;
let CTX; function bench(name, fn, n = 5) { fn(); CTX.getImageData(0,0,1,1); const t0 = performance.now(); for (let i = 0; i < n; i++) { fn(); CTX.getImageData(0,0,1,1); } log.push(`${name}: ${((performance.now() - t0) / n).toFixed(1)} ms`); }
let three;
scene({ id: 'bench', start: 0, end: 5,
  init() {
    const s = new THREE.Scene();
    const geo = new THREE.PlaneGeometry(4, 2, 300, 150);
    const tex = new THREE.CanvasTexture(sandstone(1024, 512, { seed: 3 })); tex.colorSpace = THREE.SRGBColorSpace;
    const bc = makeCanvas(1024, 512); const bg = bc.getContext('2d'); bg.fillStyle = '#fff'; bg.fillRect(0, 0, 1024, 512); bg.fillStyle = '#000'; bg.font = '120px "Rock Salt"'; bg.fillText('ARON', 100, 300);
    const bt = new THREE.CanvasTexture(bc);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, bumpMap: bt, bumpScale: 4, displacementMap: bt, displacementScale: 0.02, roughness: 0.95 }));
    m.receiveShadow = true; s.add(m);
    s.add(new THREE.AmbientLight('#445', 0.4));
    const d = new THREE.DirectionalLight('#fff', 3); d.position.set(-4, 0.4, 1.2); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); s.add(d);
    const cam = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100); cam.position.set(0, 0, 4);
    three = { s, cam, bt, bg, bc };
  },
  render(ctx, lt, info) {
    if (log.length) return; CTX = ctx;
    const big = makeCanvas(); const bgc = big.getContext('2d'); bgc.drawImage(sandstone(1920, 1080, { seed: 5 }), 0, 0);
    bench('empty', () => {}, 10); bench('fillRect small', () => ctx.fillRect(0,0,10,10), 10); bench('drawImage full', () => ctx.drawImage(big, 0, 0), 20);
    bench('blur8 full', () => { ctx.filter = 'blur(8px)'; ctx.drawImage(big, 0, 0); ctx.filter = 'none'; });
    bench('blur24 full', () => { ctx.filter = 'blur(24px)'; ctx.drawImage(big, 0, 0); ctx.filter = 'none'; });
    bench('half-res downup', () => { const t = info.tmp(); t.ctx.drawImage(big, 0, 0, 480, 270); ctx.drawImage(t.canvas, 0, 0, 480, 270, 0, 0, 1920, 1080); });
    bench('getImageData full', () => ctx.getImageData(0, 0, 1920, 1080), 3);
    bench('saturate filter full', () => { ctx.filter = 'saturate(0.4) contrast(1.1)'; ctx.drawImage(big, 0, 0); ctx.filter = 'none'; });
    bench('overlay comp full', () => { ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(big, 0, 0); ctx.globalCompositeOperation = 'source-over'; });
    bench('three render only 1080', () => { threeRender(three.s, three.cam, {}); }, 3);
    bench('three render only 720', () => { threeRender(three.s, three.cam, {width:1280,height:720}); }, 3);
    bench('three render 720 noshadow', () => { threeRender(three.s, three.cam, {width:1280,height:720, shadows:false}); }, 3);
    bench('three tex upload', () => { three.bt.needsUpdate = true; threeRender(three.s, three.cam, {width:1280,height:720, shadows:false}); }, 3);
    bench('webgl->2d copy 720', () => { ctx.drawImage(threeRender(three.s, three.cam, {width:1280,height:720, shadows:false}), 0, 0, 1920, 1080); }, 3);
    bench('three 1080 bump+shadow', () => { three.bt.needsUpdate = true; ctx.drawImage(threeRender(three.s, three.cam, {}), 0, 0); }, 3);
    bench('three 720 bump+shadow', () => { three.bt.needsUpdate = true; ctx.drawImage(threeRender(three.s, three.cam, { width: 1280, height: 720 }), 0, 0, 1920, 1080); }, 3);
    bench('300 arcs', () => { for (let i = 0; i < 300; i++) { ctx.beginPath(); ctx.arc(i * 6, 500, 20, 0, 6.28); ctx.fill(); } });
    bench('radial grad fill full', () => { const g = ctx.createRadialGradient(960, 540, 10, 960, 540, 900); g.addColorStop(0, '#fff'); g.addColorStop(1, '#000'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); });
    console.log(log.join('\n'));
  } });

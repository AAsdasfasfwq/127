// S4 scratch: is the cost upload or fill?
import { scene, makeCanvas } from '../core/engine.js';
import { sandstone } from '../core/textures.js';
const log = []; window.__s4bench = log;
let CTX;
function bench(name, fn, n = 4) { fn(); CTX.getImageData(0, 0, 1, 1); const t0 = performance.now(); for (let i = 0; i < n; i++) { fn(); CTX.getImageData(0, 0, 1, 1); } log.push(`${name}: ${((performance.now() - t0) / n).toFixed(1)} ms`); }
scene({ id: 'bench', start: 0, end: 5,
  render(ctx, lt, info) {
    if (log.length) return; CTX = ctx;
    const pathC = makeCanvas(); const pg = pathC.getContext('2d');
    for (let i = 0; i < 200; i++) { pg.fillStyle = `hsl(${i * 7},50%,50%)`; pg.beginPath(); pg.arc((i * 97) % 1920, (i * 53) % 1080, 80, 0, 6.28); pg.fill(); }
    const big = makeCanvas(); big.getContext('2d').drawImage(sandstone(1920, 1080, { seed: 5 }), 0, 0);
    bench('blit path-drawn canvas', () => ctx.drawImage(pathC, 0, 0));
    bench('blit path-drawn x3', () => { ctx.drawImage(pathC, 0, 0); ctx.drawImage(pathC, 0, 0); ctx.drawImage(pathC, 0, 0); });
    bench('blit sandstone-copy', () => ctx.drawImage(big, 0, 0));
    bench('blit sandstone-copy x3', () => { ctx.drawImage(big, 0, 0); ctx.drawImage(big, 0, 0); ctx.drawImage(big, 0, 0); });
    const t = info.tmp();
    bench('tmp: draw paths + blit', () => { t.ctx.clearRect(0, 0, 1920, 1080); t.ctx.fillStyle = '#a53'; t.ctx.fillRect(100, 100, 800, 600); ctx.drawImage(t.canvas, 0, 0); });
    bench('tmp: draw big + blit', () => { t.ctx.drawImage(big, 0, 0); ctx.drawImage(t.canvas, 0, 0); });
    bench('ImageBitmap blit', () => {});
    console.log(log.join('\n'));
  } });

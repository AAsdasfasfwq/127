// S4 scratch: canvas2D blit costs.
import { scene, makeCanvas } from '../core/engine.js';
import { sandstone } from '../core/textures.js';
const log = []; window.__s4bench = log;
let CTX;
function bench(name, fn, n = 4) { fn(); CTX.getImageData(0, 0, 1, 1); const t0 = performance.now(); for (let i = 0; i < n; i++) { fn(); CTX.getImageData(0, 0, 1, 1); } log.push(`${name}: ${((performance.now() - t0) / n).toFixed(1)} ms`); }
scene({ id: 'bench', start: 0, end: 5,
  render(ctx, lt, info) {
    if (log.length) return; CTX = ctx;
    const big = makeCanvas(); big.getContext('2d').drawImage(sandstone(1920, 1080, { seed: 5 }), 0, 0);
    const half = makeCanvas(960, 540); half.getContext('2d').drawImage(big, 0, 0, 960, 540);
    const small = makeCanvas(600, 300); small.getContext('2d').drawImage(big, 0, 0, 600, 300);
    bench('flush only', () => {});
    bench('fillRect full', () => { ctx.fillStyle = '#345'; ctx.fillRect(0, 0, 1920, 1080); });
    bench('blit 1:1 high', () => ctx.drawImage(big, 0, 0));
    ctx.imageSmoothingQuality = 'low';
    bench('blit 1:1 low', () => ctx.drawImage(big, 0, 0));
    bench('blit scaled1.1 low', () => ctx.drawImage(big, -96, -54, 2112, 1188));
    bench('blit half->full low', () => ctx.drawImage(half, 0, 0, 1920, 1080));
    ctx.imageSmoothingQuality = 'high';
    bench('blit scaled1.1 high', () => ctx.drawImage(big, -96, -54, 2112, 1188));
    bench('blit half->full high', () => ctx.drawImage(half, 0, 0, 1920, 1080));
    bench('blit small 600x300', () => ctx.drawImage(small, 100, 100));
    bench('blit 5x small', () => { for (let i = 0; i < 5; i++) ctx.drawImage(small, 100 + i * 50, 100); });
    bench('pattern fill full', () => { ctx.fillStyle = ctx.createPattern(small, 'repeat'); ctx.fillRect(0, 0, 1920, 1080); });
    bench('blur6 on small', () => { ctx.filter = 'blur(6px)'; ctx.drawImage(small, 100, 100); ctx.filter = 'none'; });
    bench('blur6 on full', () => { ctx.filter = 'blur(6px)'; ctx.drawImage(big, 0, 0); ctx.filter = 'none'; });
    bench('shadowBlur path', () => { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20; ctx.fillRect(500, 500, 300, 200); ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; });
    bench('100 bezier strokes', () => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (let i = 0; i < 100; i++) { ctx.beginPath(); ctx.moveTo(i * 19, 1080); ctx.quadraticCurveTo(i * 19 + 10, 900, i * 19 + 20, 800); ctx.stroke(); } });
    bench('1000 small fills', () => { ctx.fillStyle = '#fa0'; for (let i = 0; i < 1000; i++) { ctx.beginPath(); ctx.arc((i * 37) % 1920, (i * 91) % 1080, 3, 0, 6.28); ctx.fill(); } });
    bench('text 40 draws', () => { ctx.font = '60px "Big Shoulders Display"'; ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) ctx.fillText('HELLO', i * 40, 500); });
    bench('multiply full', () => { ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(big, 0, 0); ctx.globalCompositeOperation = 'source-over'; });
    bench('gradient full', () => { const g = ctx.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#123'); g.addColorStop(1, '#456'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); });
    console.log(log.join('\n'));
  } });

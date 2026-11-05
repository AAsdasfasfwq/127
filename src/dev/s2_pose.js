// S2 scratch: pose sheet for the section's custom poses.
import { scene } from '../core/engine.js';
import { drawAaron, EXPR } from '../core/aaron.js';
import { paper } from '../core/textures.js';
import { text } from '../core/text.js';
import { C } from '../core/palette.js';
import { SP } from '../sections/s2/poses.js';

const list = [
  ['walk', SP.walk(0.2, 0.5), 1, EXPR.grin],
  ['chimneyLow', SP.chimneyLow, -1, EXPR.determined],
  ['chimneyLower', SP.chimneyLower, -1, EXPR.determined],
  ['recoil', SP.recoil, -1, EXPR.shock],
  ['pushOff', SP.pushOff, -1, EXPR.shock],
  ['flail', SP.flail, -1, EXPR.scream],
  ['landed', SP.landed, -1, EXPR.pain],
  ['trapped', SP.trapped, -1, EXPR.pain],
  ['yank', SP.yank, -1, EXPR.grit],
  ['brace', SP.brace, -1, EXPR.grit],
  ['shove', SP.shove, -1, EXPR.grit],
  ['slumpTrapped', SP.slumpTrapped, -1, EXPR.exhausted],
];
scene({
  id: 's2dev-poses', start: 0, end: 10,
  render(ctx) {
    ctx.drawImage(paper(1920, 1080, { base: '#EFE4D0' }), 0, 0);
    list.forEach(([name, pose, facing, expr], i) => {
      const col = i % 6, row = Math.floor(i / 6);
      const x = 170 + col * 315, y = 470 + row * 520;
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.moveTo(x - 140, y); ctx.lineTo(x + 140, y); ctx.stroke();
      drawAaron(ctx, { x, y, scale: 0.36, pose, facing, expr, beard: 0.05 });
      text(ctx, name, x, y + 40, { family: 'mono', size: 18, color: C.ink, align: 'center' });
    });
  },
});

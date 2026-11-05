// S2 — The Boulder  [138.20 → 302.25]
// PLACEHOLDER — the section agent replaces this file (and adds more files in this folder).
import { scene } from '../../core/engine.js';
import { text } from '../../core/text.js';
import { C } from '../../core/palette.js';

scene({
  id: 's2-placeholder', start: 138.2, end: 302.25,
  render(ctx, lt, info) {
    ctx.fillStyle = C.umber; ctx.fillRect(0, 0, 1920, 1080);
    text(ctx, 'S2 · The Boulder', 960, 520, { family: 'display', size: 90, weight: 800, align: 'center', color: C.paper });
    text(ctx, info.t.toFixed(2) + ' s', 960, 600, { family: 'mono', size: 28, align: 'center', color: C.sand });
  },
});

// S6 — The Hardest Part & The Walk Out  [717.05 → 885.26]
// PLACEHOLDER — the section agent replaces this file (and adds more files in this folder).
import { scene } from '../../core/engine.js';
import { text } from '../../core/text.js';
import { C } from '../../core/palette.js';

scene({
  id: 's6-placeholder', start: 717.05, end: 885.26,
  render(ctx, lt, info) {
    ctx.fillStyle = C.umber; ctx.fillRect(0, 0, 1920, 1080);
    text(ctx, 'S6 · The Hardest Part & The Walk Out', 960, 520, { family: 'display', size: 90, weight: 800, align: 'center', color: C.paper });
    text(ctx, info.t.toFixed(2) + ' s', 960, 600, { family: 'mono', size: 28, align: 'center', color: C.sand });
  },
});

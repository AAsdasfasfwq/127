// S6 — The Hardest Part & The Walk Out  [717.05 → 885.26]  (renderable to 887.5 for S7's hand-off)
// Visual plan: docs/sections/s6.md
import './surgery_a.js';
import { scene } from '../../core/engine.js';
import { text } from '../../core/text.js';
import { C } from '../../core/palette.js';

scene({
  id: 's6-wip', start: 734.85, end: 887.5,
  render(ctx, lt, info) {
    ctx.fillStyle = C.umber; ctx.fillRect(0, 0, 1920, 1080);
    text(ctx, info.t.toFixed(2) + ' s', 960, 600, { family: 'mono', size: 28, align: 'center', color: C.sand });
  },
});

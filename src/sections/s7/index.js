// S7 — Rescue & The Lesson  [885.26 → 1030.30]
// PLACEHOLDER — the section agent replaces this file (and adds more files in this folder).
import { scene } from '../../core/engine.js';
import { text } from '../../core/text.js';
import { C } from '../../core/palette.js';

scene({
  id: 's7-placeholder', start: 885.26, end: 1030.3,
  render(ctx, lt, info) {
    ctx.fillStyle = C.umber; ctx.fillRect(0, 0, 1920, 1080);
    text(ctx, 'S7 · Rescue & The Lesson', 960, 520, { family: 'display', size: 90, weight: 800, align: 'center', color: C.paper });
    text(ctx, info.t.toFixed(2) + ' s', 960, 600, { family: 'mono', size: 28, align: 'center', color: C.sand });
  },
});

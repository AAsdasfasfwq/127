// S1 — The Maze & The Man  [0.00 → 138.20]   (plan: docs/sections/s1.md)
import { scene } from '../../core/engine.js';
import { text } from '../../core/text.js';
import { C } from '../../core/palette.js';
import './a_flight.js';

// TEMP placeholder for not-yet-built beats
scene({
  id: 's1-todo', start: 8.85, end: 138.2,
  render(ctx, lt, info) {
    ctx.fillStyle = C.umber; ctx.fillRect(0, 0, 1920, 1080);
    text(ctx, info.t.toFixed(2) + ' s', 960, 600, { family: 'mono', size: 28, align: 'center', color: C.sand });
  },
});

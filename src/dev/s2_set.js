// S2 scratch: look-dev for the shared 3D slot set.
import { scene } from '../core/engine.js';
import { getSet, setLight, render3, camLook, centreX } from '../sections/s2/slot3d.js';
const views = [
  // narrows: camera near lip looking up-canyon
  () => camLook(S, [centreX(-2) + 0.3, 1.5, -1.5], [centreX(-12), 1.2, -12], 55),
  // reveal: from approach looking down-canyon at lip/chockstone
  () => camLook(S, [centreX(-3), 1.7, -3.2], [centreX(1), -0.8, 1.2], 55),
  // reveal end: over the lip looking down
  () => camLook(S, [centreX(0.1), 2.6, -0.2], [centreX(1.6), -3.5, 2.4], 55),
  // below: bottom of the drop looking up at chockstone
  () => camLook(S, [centreX(6), -4.2, 6.5], [centreX(0.8), -0.2, 0.8], 50),
  // straight up
  () => camLook(S, [centreX(9), -4.8, 9], [centreX(9), 20, 9.01], 70, [0, 0, -1]),
];
let S;
views.forEach((v, i) => scene({
  id: 's2dev-set' + i, start: i, end: i + 1,
  init() { S = getSet(); },
  render(ctx) { setLight(S, {}); v(); ctx.drawImage(render3(S, { exposure: 1.1 }), 0, 0); },
}));

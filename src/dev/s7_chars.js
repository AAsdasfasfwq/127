// S7 dev model sheet — cast check (not part of the film).
import { scene } from '../core/engine.js';
import { drawAaron, POSES, EXPR, mixPose } from '../core/aaron.js';
import { paper } from '../core/textures.js';
import { drawProsthetic, greyBeard, headOpts, drawDonna, drawLeo, LEO, drawRescuer, drawFigurine, FIGURINES } from '../sections/s7/chars.js';

scene({
  id: 's7dev-cast', start: 0, end: 10,
  render(ctx, lt) {
    ctx.drawImage(paper(1920, 1080, { base: '#EFE4D0' }), 0, 0);
    drawDonna(ctx, { x: 330, y: 700, s: 0.95, t: lt, talk: 0.5 + 0.5 * Math.sin(lt * 9), tap: lt * 2, blink: 0 });
    // older Aron with prosthetic + grey beard
    const pose = { ...POSES.stand, yaw: 0.3 };
    const sc = 0.62;
    const j = drawAaron(ctx, { x: 1000, y: 1040, scale: sc, pose, expr: EXPR.tender, beard: 1, rightArm: 'stump', facing: 1 });
    greyBeard(ctx, j.head, 225 * sc, headOpts(pose, 1));
    drawProsthetic(ctx, j, sc, { tool: 'hook' });
    const pose2 = { ...POSES.stand, yaw: -0.2, armR: { sh: 0.9, el: 0.9 } };
    const j2 = drawAaron(ctx, { x: 1350, y: 1040, scale: 0.5, pose: pose2, expr: EXPR.smile, beard: 1, rightArm: 'stump', facing: -1 });
    greyBeard(ctx, j2.head, 225 * 0.5, headOpts(pose2, -1));
    drawProsthetic(ctx, j2, 0.5, { tool: 'axe' });
    drawLeo(ctx, { x: 1600, y: 1040, s: 0.9, pose: LEO.run(lt * 1.6), laugh: 1, facing: -1 });
    drawLeo(ctx, { x: 1800, y: 700, s: 0.7, pose: LEO.lifted(lt), laugh: 0.9 });
    drawRescuer(ctx, { x: 1500, y: 300, h: 160, pose: 'pump', ph: lt });
    drawRescuer(ctx, { x: 1650, y: 300, h: 160, pose: 'crank', ph: lt });
    drawRescuer(ctx, { x: 1780, y: 300, h: 160, pose: 'kneel', ph: lt });
    Object.keys(FIGURINES).forEach((k, i) => drawFigurine(ctx, 760 + i * 95, 260, 180, k, { turn: Math.sin(lt + i), t: lt }));
  },
});

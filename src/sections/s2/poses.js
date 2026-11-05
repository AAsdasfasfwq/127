// S2 — custom poses for Aron (built on the shared rig's conventions).
// Arm sh: 0 = hanging, + swings toward facing; el bends forearm up. Leg hip + forward, knee + bends back.
import { POSES, mixPose } from '../../core/aaron.js';
import { TAU } from '../../core/util.js';

const B = POSES.stand;
const P = (o) => ({ ...B, ...o, armL: { ...B.armL, ...(o.armL || {}) }, armR: { ...B.armR, ...(o.armR || {}) }, legL: { ...B.legL, ...(o.legL || {}) }, legR: { ...B.legR, ...(o.legR || {}) } });

export const SP = {
  /** happy walk with a little bounce and arm swing (ph 0..1 per stride) */
  walk(ph, look = 0) {
    const w = POSES.walk(ph);
    return { ...w, nod: -0.08 - look * 0.25, yaw: 0.45 - look * 0.1, head: -look * 0.08 };
  },
  /** facing -1 (toward the left wall): feet on the wall in front, right hand back on the boulder */
  chimneyLow: P({
    root: [0, -40], lean: -0.32, yaw: 0.3, nod: 0.05, neck: 0.05,
    armL: { sh: 1.35, el: 0.35, wr: 0.2, hand: 'open' },
    armR: { sh: -0.95, el: -0.15, wr: -0.4, hand: 'open' },
    legL: { hip: 1.25, knee: 0.55, ank: -0.6 },
    legR: { hip: 1.0, knee: 0.85, ank: -0.7 },
  }),
  /** lowering: knees bend more, body drops, chin down to look at the drop */
  chimneyLower: P({
    root: [0, 20], lean: -0.22, yaw: 0.35, nod: 0.3, neck: 0.12,
    armL: { sh: 1.0, el: 0.7, wr: 0.2, hand: 'open' },
    armR: { sh: -0.7, el: -0.35, wr: -0.5, hand: 'open' },
    legL: { hip: 1.45, knee: 1.15, ank: -0.5 },
    legR: { hip: 1.2, knee: 1.4, ank: -0.6 },
  }),
  /** recoil: left hand snapped back to chest */
  recoil: P({
    root: [0, 10], lean: -0.4, yaw: 0.3, nod: -0.15,
    armL: { sh: 0.35, el: 2.1, wr: 0.3, hand: 'fist' },
    armR: { sh: -0.8, el: -0.2, wr: -0.4, hand: 'open' },
    legL: { hip: 1.4, knee: 1.0, ank: -0.5 },
    legR: { hip: 1.15, knee: 1.25, ank: -0.6 },
  }),
  /** pushing off the wall: legs extend, body arcs away */
  pushOff: P({
    root: [0, -10], lean: -0.75, yaw: 0.25, nod: -0.25,
    armL: { sh: 0.6, el: 0.4, wr: 0.2, hand: 'open' },
    armR: { sh: -1.3, el: 0.1, wr: -0.2, hand: 'open' },
    legL: { hip: 1.55, knee: 0.15, ank: -0.7 },
    legR: { hip: 1.35, knee: 0.3, ank: -0.6 },
  }),
  /** flailing: losing balance */
  flail: P({
    root: [0, -30], lean: -0.95, yaw: 0.2, nod: -0.4,
    armL: { sh: 2.6, el: 0.5, hand: 'open' },
    armR: { sh: -2.2, el: 0.6, hand: 'open' },
    legL: { hip: 0.9, knee: 0.9, ank: -0.2 },
    legR: { hip: 0.35, knee: 0.4, ank: 0 },
  }),
  /** landed in a crouch at the bottom */
  landed: P({
    root: [0, 210], lean: 0.5, yaw: 0.4, nod: 0.2,
    armL: { sh: 0.9, el: 0.6, hand: 'open' }, armR: { sh: 1.2, el: 0.4, hand: 'open' },
    legL: { hip: 1.55, knee: 2.3, ank: 0.5 }, legR: { hip: 0.95, knee: 2.0, ank: 0.6 },
  }),
  /** standing at the bottom, right arm up-forward into the gap (facing -1 → reaches left/up) */
  trapped: P({
    root: [0, 30], lean: 0.1, yaw: 0.3, nod: -0.12, neck: -0.05,
    armL: { sh: 0.25, el: 1.1, wr: 0.2, hand: 'fist' },
    armR: { sh: 2.35, el: 0.12, wr: 0.1, hand: 'grip' },
    legL: { hip: 0.18, knee: 0.25 }, legR: { hip: -0.12, knee: 0.15 },
  }),
  /** yank: body thrown back away from the gap */
  yank: P({
    root: [0, 70], lean: -0.32, yaw: 0.25, nod: 0.1, neck: 0.1,
    armL: { sh: -0.5, el: 0.6, wr: 0.2, hand: 'fist' },
    armR: { sh: 2.05, el: 0.02, wr: 0.1, hand: 'grip' },
    legL: { hip: -0.2, knee: 0.45 }, legR: { hip: 0.42, knee: 0.55 },
  }),
  /** foot braced on the rock, full-body pull */
  brace: P({
    root: [0, 90], lean: -0.45, yaw: 0.25, nod: 0.18, neck: 0.12,
    armL: { sh: 1.2, el: 0.9, wr: 0.2, hand: 'fist' },
    armR: { sh: 2.0, el: 0.0, wr: 0.1, hand: 'grip' },
    legL: { hip: 1.5, knee: 1.1, ank: -0.6 }, legR: { hip: -0.25, knee: 0.5 },
  }),
  /** shoulder shove into the boulder (left shoulder leads) */
  shove: P({
    root: [0, 40], lean: 0.32, yaw: 0.2, nod: 0.05, twist: 0.4,
    armL: { sh: 0.6, el: 1.8, wr: 0.2, hand: 'fist' },
    armR: { sh: 2.5, el: 0.15, wr: 0.1, hand: 'grip' },
    legL: { hip: 0.35, knee: 0.35 }, legR: { hip: -0.45, knee: 0.2 },
  }),
  /** slumped against the wall after the dust settles (arm still up into the gap) */
  slumpTrapped: P({
    root: [0, 150], lean: -0.12, yaw: 0.35, nod: 0.12, head: 0.06,
    armL: { sh: 0.15, el: 0.9, wr: 0.2, hand: 'relaxed' },
    armR: { sh: 2.55, el: 0.18, wr: 0.1, hand: 'grip' },
    legL: { hip: 0.85, knee: 1.3, ank: 0.2 }, legR: { hip: 0.45, knee: 0.9, ank: 0.1 },
  }),
};

export { mixPose, POSES, TAU };

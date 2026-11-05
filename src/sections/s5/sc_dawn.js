// S5 · shots 1–2 · 600.76 → 609.30
// Dawn fills the narrow slit (THU ▕ MAY 1 split by the sky), HOUR 114 rolls in, the camera
// cranes down the cold wall to Aron: exhausted → determined, breath vapour on "cold",
// eyes go to the pinned arm, rack-focus to the arm and the chockstone.
import { scene } from '../../core/engine.js';
import { cam, applyPlane } from '../../core/camera.js';
import { drawAaron, POSES, EXPR, mixExpr } from '../../core/aaron.js';
import { drawChockstone, dust } from '../../core/textures.js';
import { hourCounter } from '../../core/motifs.js';
import { chars } from '../../core/text.js';
import {
  W, H, P5, clamp, lerp, ease, noise, seg, win, ROCK, C, text,
  slitWall, wallTex, vapour, env,
} from './common.js';

const T0 = 600.76;
const Y2 = 1100;                // crane distance (focal-plane px)
const tA = (abs) => abs - T0;   // absolute → local

// slit width profiles per depth layer (world y → px); slit closes toward the floor
const wFar = (y) => 64 * clamp(1 - (y - 260) / 420, 0, 1.2) + 6;
const wMid = (y) => 190 * clamp(1 - (y - 420) / 520, 0, 1.15) + 8;
const wNear = () => 1480;

function skyGrad(ctx, dawn) {
  const g = ctx.createLinearGradient(0, -200, 0, 1100);
  g.addColorStop(0, lerpHex('#16263A', '#2A4A6A', dawn));
  g.addColorStop(0.45, lerpHex('#3D5A76', '#86A9C2', dawn));
  g.addColorStop(0.8, lerpHex('#8A8FA0', '#F2CFA8', dawn));
  g.addColorStop(1, lerpHex('#A99A98', '#FFE3C4', dawn));
  return g;
}
function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = lerp((pa >> 16) & 255, (pb >> 16) & 255, t), g = lerp((pa >> 8) & 255, (pb >> 8) & 255, t), bl = lerp(pa & 255, pb & 255, t);
  return `rgb(${r | 0},${g | 0},${bl | 0})`;
}

scene({
  id: 's5-dawn', start: 600.76, end: 609.30,
  in: { type: 'light', dur: 0.9, color: '#E6EEF2' },
  post: { grain: 0.07, vignette: 0.42 },
  init() {
    this.texFar = wallTex(51, ROCK.cold, 1024, 1024);
    this.texMid = wallTex(52, ROCK.cold, 1024, 1024);
    this.texNear = wallTex(53, ROCK.shade, 1024, 1024);
  },
  render(ctx, lt, info) {
    const t = lt;
    const dawn = clamp(0.25 + t / 9);
    // camera: slow rise + push, then crane down to Aron, then a slow push on his face
    const crane = ease.inOutCubic(win(t, tA(603.55), tA(605.0)));
    const c = cam({
      x: lerp(0, 40, crane) + Math.sin(t * 0.35) * 4,
      y: lerp(-30 + t * 6, Y2, crane),
      dolly: lerp(0.02 + t * 0.012, 0.0, crane) + 0.075 * ease.inOutSine(win(t, tA(605.0), tA(609.8))),
    });
    // sky
    ctx.fillStyle = skyGrad(ctx, dawn);
    ctx.fillRect(0, 0, W, H);

    // far walls (hazy, alpenglow on the rim)
    ctx.save(); applyPlane(ctx, c, 4.5);
    slitWall(ctx, {
      tex: this.texFar, x: 962, wfn: wFar, y0: -900, y1: 760, seed: 21, jag: 18, shade: 0.55,
      by: -1400, bh: 3600,
      rim: `rgba(255,${(200 + dawn * 30) | 0},${(160 + dawn * 20) | 0},${0.45 + dawn * 0.45})`, rimW: 10, rimBlur: 4,
      vert: (g) => { const gr = g.createLinearGradient(0, -300, 0, 700); gr.addColorStop(0, `rgba(255,170,120,${0.18 + dawn * 0.25})`); gr.addColorStop(0.5, 'rgba(110,140,170,0.25)'); gr.addColorStop(1, 'rgba(20,28,40,0.55)'); return gr; },
    });
    ctx.restore();

    // mid walls
    ctx.save(); applyPlane(ctx, c, 1.8);
    slitWall(ctx, {
      tex: this.texMid, x: 958, wfn: wMid, y0: -1100, y1: 980, seed: 7, jag: 30, shade: 0.62,
      by: -1600, bh: 4400, texOff: [140, 60],
      rim: `rgba(200,222,240,${0.35 + dawn * 0.4})`, rimW: 16, rimBlur: 6,
      vert: (g) => { const gr = g.createLinearGradient(0, -500, 0, 1400); gr.addColorStop(0, `rgba(255,190,140,${0.1 + dawn * 0.16})`); gr.addColorStop(0.35, 'rgba(70,95,125,0.18)'); gr.addColorStop(1, 'rgba(8,12,18,0.55)'); return gr; },
    });
    ctx.restore();

    // dust motes in the slit light
    ctx.save(); applyPlane(ctx, c, 1.3);
    dust(ctx, info.t, { count: 46, seed: 5, color: '#DCE6EE', area: [700, -300, 520, 1300], wind: [3, -10], size: [0.8, 3.2], alpha: 0.35 + dawn * 0.2 });
    ctx.restore();

    // ── type + HOUR on the subject plane (they leave upward with the crane) ──
    ctx.save(); applyPlane(ctx, c, 1);
    const tq = 1 - ease.inQuad(win(t, tA(603.45), tA(604.2)));
    if (tq > 0) {
      ctx.globalAlpha = tq;
      const size = 214;
      const style = { family: 'display', size, weight: 800, tracking: 0.02 };
      const grad = ctx.createLinearGradient(0, 600 - size * 0.8, 0, 600);
      grad.addColorStop(0, '#FBE6CF'); grad.addColorStop(1, '#C3D2DA');
      const pThu = win(t, tA(601.30), tA(602.05));
      const pMay = win(t, tA(602.42), tA(603.15));
      ctx.save();
      ctx.shadowColor = 'rgba(6,10,16,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      chars(ctx, 'THU', 960 - 104, 604, { ...style, align: 'right', color: grad }, (i, n) => {
        const p = ease.outExpo(clamp(pThu * 1.5 - i * 0.18));
        return { dy: (1 - p) * 70, alpha: p, blur: (1 - p) * 8 };
      });
      chars(ctx, 'MAY 1', 960 + 104, 604, { ...style, align: 'left', color: grad }, (i, n) => {
        const p = ease.outExpo(clamp(pMay * 1.5 - i * 0.12));
        return { dy: (1 - p) * 70, alpha: p, blur: (1 - p) * 8 };
      });
      ctx.restore();
      // thin rules echoing the strata, drawn from the slit outward
      const rl = ease.outCubic(win(t, tA(602.6), tA(603.4)));
      ctx.strokeStyle = 'rgba(225,235,240,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(960 - 104, 642); ctx.lineTo(960 - 104 - 330 * rl, 642);
      ctx.moveTo(960 + 104, 642); ctx.lineTo(960 + 104 + 430 * rl, 642);
      ctx.stroke();
      if (rl > 0) text(ctx, 'DAY 6', 960 + 104, 690, { family: 'mono', size: 22, weight: 400, color: '#DCE6EE', tracking: 0.4, alpha: rl * 0.8 });
      // HOUR counter (canonical motif)
      const hp = ease.outCubic(win(t, tA(602.85), tA(603.4)));
      if (hp > 0) {
        hourCounter(ctx, { hours: lerp(113.4, 114, ease.outCubic(win(t, tA(602.9), tA(603.5)))), x: 150, y: 150 - (1 - hp) * 20, scale: 0.85, alpha: hp, t: info.t, color: '#E6EEF2' });
      }
    }
    ctx.restore();

    // ── Aron (only once the crane arrives) ──
    if (crane > 0.02) drawAron.call(this, ctx, c, t, info);

    // near walls: dark blurred occluders framing everything
    ctx.save();
    ctx.filter = 'blur(7px)';
    applyPlane(ctx, c, 0.55);
    slitWall(ctx, {
      tex: this.texNear, x: 960, wfn: wNear, y0: -2600, y1: 4400, seed: 3, jag: 90, shade: 0.82,
      bx: -1600, by: -3000, bw: 5200, bh: 8600, texScale: 1.4,
      rim: 'rgba(150,175,200,0.25)', rimW: 30, rimBlur: 10,
    });
    ctx.restore();
  },
});

/** Shot 2: Aron MCU with the rack focus. Drawn on the z=1 plane in frame coords (+Y2). */
function drawAron(ctx, c, t, info) {
  const T = (abs) => t - tA(abs);
  const breathe = Math.sin(t * 1.55) * 4;
  const det = ease.inOutCubic(win(t, tA(604.5), tA(606.1)));
  let ex = mixExpr(EXPR.exhausted, EXPR.determined, det);
  const look = ease.inOutCubic(win(t, tA(607.75), tA(608.2)));
  ex = { ...ex, look: [lerp(ex.look[0], 0.95, look), lerp(ex.look[1], -0.55, look)] };
  const bl = Math.max(env(t, tA(606.55), tA(606.75), 0.07, 0.1), env(t, tA(608.95), tA(609.15), 0.07, 0.1));
  ex.blink = bl;
  ex.eyes = ex.eyes * (1 - bl);
  const strain = Math.sin(t * 23) * 0.004 * det;
  const pose = {
    ...POSES.trapped,
    root: [0, 60 + breathe], lean: 0.1, yaw: lerp(-0.05, -0.18, det), nod: lerp(0.16, 0.02, det) - 0.08 * look,
    head: -0.04 * look,
    armR: { sh: 2.36 + strain, el: 0.22, wr: 0, hand: 'grip' },
    armL: { sh: 0.25, el: 1.35, hand: 'fist' },
  };
  // render character + boulder into a layer, grade it cold, then split for the rack focus
  const lay = info.tmp();
  const g = lay.ctx;
  g.save();
  applyPlane(g, c, 1);
  g.translate(0, Y2);
  const out = drawAaron(g, { x: 1300, y: 2290, scale: 2.0, facing: -1, pose, expr: ex, beard: 0.95, dirt: 0.8, tired: 0.8, sunburn: 0.5, light: [0.25, 1], rim: 'rgba(185,210,232,0.95)' });
  g.restore();
  // cold grade on the character
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(40,62,92,0.30)'); gr.addColorStop(0.55, 'rgba(18,26,40,0.42)'); gr.addColorStop(1, 'rgba(6,9,14,0.78)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.restore();
  // the chockstone pinning his hand (slightly nearer plane)
  g.save();
  applyPlane(g, c, 0.86);
  g.translate(0, Y2 / 0.86);
  drawChockstone(g, 360, 170, 820, { cold: true, light: -1.75, rot: -0.12, rim: 'rgba(190,212,235,0.7)' });
  g.restore();
  // breath vapour on "cold" (and a second, smaller one before "knew")
  const head = out.head;
  if (head) {
    const mx = head[0] - 88, my = head[1] + 70;
    vapour(g, t, tA(605.35), mx, my, { dir: [-1, -0.15], scale: 1.25, alpha: 0.2, seed: 4 });
    vapour(g, t, tA(607.25), mx, my, { dir: [-1, -0.1], scale: 1.0, alpha: 0.13, seed: 9, life: 1.8 });
  }
  // rack focus: face sharp → arm/boulder sharp (depth-of-field gradient across the arm)
  const rack = ease.inOutCubic(win(t, tA(608.0), tA(608.95)));
  const blurA = lerp(11, 0, rack);   // arm zone
  const blurF = lerp(0, 9, rack);    // face zone
  const base = info.tmp();
  base.ctx.filter = blurF > 0.5 ? `blur(${blurF.toFixed(1)}px)` : 'none';
  base.ctx.drawImage(lay.canvas, 0, 0);
  base.ctx.filter = 'none';
  const armL = info.tmp();
  armL.ctx.filter = blurA > 0.5 ? `blur(${blurA.toFixed(1)}px)` : 'none';
  armL.ctx.drawImage(lay.canvas, 0, 0);
  armL.ctx.filter = 'none';
  armL.ctx.globalCompositeOperation = 'destination-in';
  const mg = armL.ctx.createLinearGradient(1180, 560, 760, 330);
  mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(1, 'rgba(0,0,0,1)');
  armL.ctx.fillStyle = mg; armL.ctx.fillRect(0, 0, W, H);
  // back wall behind him gets the cold slit light pool
  ctx.save();
  applyPlane(ctx, c, 1.8);
  const pool = ctx.createRadialGradient(980, Y2 / 1.8 + 120, 40, 980, Y2 / 1.8 + 300, 900);
  pool.addColorStop(0, 'rgba(150,180,205,0.20)'); pool.addColorStop(1, 'rgba(150,180,205,0)');
  ctx.fillStyle = pool; ctx.fillRect(-500, Y2 / 1.8 - 900, 3000, 2600);
  ctx.restore();
  // composite: face-zone focus everywhere, arm-zone focus blended over it (lerp by mask)
  ctx.drawImage(base.canvas, 0, 0);
  ctx.drawImage(armL.canvas, 0, 0);
}

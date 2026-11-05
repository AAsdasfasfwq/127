// ─────────────────────────────────────────────────────────────────────────────
// The cheap multi-tool (blade + pliers) as a technical illustration object.
// Units: local px at scale 1 (1 in ≈ 100 px). Origin = blade pivot. Handle extends to −x.
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, lerp, ease, rng, noise, TAU } from '../../core/util.js';
import { cached } from '../../core/textures.js';

const LINE = '#120C0A';

function scalePattern() {
  return cached('s6:scalepat', () => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#26221F'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
    for (let k = -64; k < 128; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.stroke(); g.beginPath(); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke(); }
    const r = rng(5);
    for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,240,220,0.05)'; g.fillRect(r() * 64, r() * 64, 1.5, 1.5); }
    return c;
  });
}

/** blade profile path (pointing +x from pivot) */
export function bladePath(g, L = 210) {
  g.moveTo(-6, -20);
  g.lineTo(L * 0.62, -19);
  g.quadraticCurveTo(L * 0.86, -18, L, -6);            // spine dropping to the tip
  g.quadraticCurveTo(L * 0.8, 10, L * 0.45, 17);       // belly / edge
  g.lineTo(18, 17);
  g.quadraticCurveTo(4, 17, -6, 10);
  g.closePath();
}
/** the cutting edge polyline (used for the incision line match) in blade-local coords */
export function edgePoints(L = 210, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    // quadratic from (L,-6) via (0.8L,10) to (0.45L,17) then line to (18,17)
    if (u < 0.55) {
      const v = u / 0.55; // along the straight part from heel (18,17) to (0.45L,17)
      pts.push([lerp(18, L * 0.45, v), 17]);
    } else {
      const v = (u - 0.55) / 0.45;
      const a = [L * 0.45, 17], c = [L * 0.8, 10], b = [L, -6];
      const x = (1 - v) * (1 - v) * a[0] + 2 * (1 - v) * v * c[0] + v * v * b[0];
      const y = (1 - v) * (1 - v) * a[1] + 2 * (1 - v) * v * c[1] + v * v * b[1];
      pts.push([x, y]);
    }
  }
  return pts;
}

export function drawBlade(ctx, o = {}) {
  const L = o.len ?? 210;
  ctx.save();
  // body
  const g = ctx.createLinearGradient(0, -20, 0, 18);
  g.addColorStop(0, '#E9E6DF'); g.addColorStop(0.35, '#B9B6AF'); g.addColorStop(0.62, '#8B8780'); g.addColorStop(0.7, '#D8D5CE'); g.addColorStop(1, '#9C978F');
  ctx.beginPath(); bladePath(ctx, L);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // bevel band (grind line)
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(L * 0.5, 5); ctx.quadraticCurveTo(L * 0.82, 2, L, -6); ctx.lineTo(L, 30); ctx.lineTo(10, 30); ctx.closePath(); ctx.fill();
  // grime / cheap steel specks
  const r = rng(44);
  for (let i = 0; i < 22; i++) { ctx.fillStyle = r() < 0.6 ? "rgba(80,50,30,0.13)" : "rgba(40,30,25,0.12)"; ctx.beginPath(); ctx.arc(r() * L, -18 + r() * 34, 0.6 + r() * 1.8, 0, TAU); ctx.fill(); }
  // stain (dried, dark brown-red, very subtle)
  if (o.stain) { ctx.fillStyle = `rgba(90,22,14,${0.35 * o.stain})`; ctx.beginPath(); ctx.ellipse(L * 0.62, 6, L * 0.3, 9, -0.05, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
  ctx.beginPath(); bladePath(ctx, L); ctx.stroke();
  // spine highlight
  ctx.strokeStyle = 'rgba(255,248,235,0.7)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(6, -17); ctx.lineTo(L * 0.6, -16.5); ctx.stroke();
  // pivot boss
  ctx.fillStyle = '#6F6B65'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#C9C5BD'; ctx.beginPath(); ctx.arc(-2, -2, 6, 0, TAU); ctx.fill();
  // nail nick
  ctx.strokeStyle = 'rgba(30,20,15,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(52, -8, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.restore();
}

export function drawHandle(ctx, o = {}) {
  const len = o.len ?? 370;
  const h = o.h ?? 64;
  ctx.save();
  // steel channel (frame) slightly larger than the scale
  const fg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  fg.addColorStop(0, '#D9D6CF'); fg.addColorStop(0.5, '#7D7973'); fg.addColorStop(1, '#3E3B37');
  ctx.beginPath(); ctx.roundRect(-len, -h / 2, len + 26, h, 14);
  ctx.fillStyle = fg; ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2.4; ctx.stroke();
  // rubber scale
  ctx.beginPath(); ctx.roundRect(-len + 16, -h / 2 + 8, len - 44, h - 16, 10);
  ctx.save(); ctx.clip();
  ctx.fillStyle = ctx.createPattern(scalePattern(), 'repeat'); ctx.fillRect(-len, -h, len + 40, h * 2);
  const sg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  sg.addColorStop(0, 'rgba(255,235,210,0.18)'); sg.addColorStop(0.45, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = sg; ctx.fillRect(-len, -h, len + 40, h * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  // rivets
  for (const rx of [-len + 46, -36]) {
    ctx.fillStyle = '#9E9A93'; ctx.beginPath(); ctx.arc(rx, 0, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,240,0.8)'; ctx.beginPath(); ctx.arc(rx - 2, -2, 2.4, 0, TAU); ctx.fill();
  }
  // top edge highlight
  ctx.strokeStyle = 'rgba(255,245,230,0.55)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-len + 14, -h / 2 + 2.5); ctx.lineTo(10, -h / 2 + 2.5); ctx.stroke();
  ctx.restore();
}

/**
 * Closed multi-tool with the blade at angle `fold` (0 open → 1 folded into the handle).
 * (x,y) = pivot. rot = tool rotation. s = scale.
 */
export function drawMultiTool(ctx, x, y, s, rot, o = {}) {
  const f = clamp(o.fold ?? 0);
  const ang = -Math.PI * 0.98 * ease.inOutCubic(f);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s * (o.squash ?? 1));
  if (o.shadow !== false) {
    ctx.save();
    ctx.filter = 'blur(14px)'; ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(-120, 58, 260, 16, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const tucked = f > 0.82;
  const drawB = () => { ctx.save(); ctx.rotate(ang); drawBlade(ctx, { len: o.len ?? 210, stain: o.stain }); ctx.restore(); };
  if (tucked) drawB();
  drawHandle(ctx, {});
  if (!tucked) drawB();
  ctx.restore();
}

/** Needle-nose pliers configuration: (x,y) = jaw pivot, jaws point +x. open 0..1 */
export function drawPliers(ctx, x, y, s, rot, o = {}) {
  const open = clamp(o.open ?? 0);
  const ja = 0.03 + open * 0.28;        // jaw half-angle
  const ha = 0.1 + open * 0.16;         // handle half-angle
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s * (o.squash ?? 1));
  if (o.shadow !== false) {
    ctx.save(); ctx.filter = 'blur(14px)'; ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(-120, 70, 260, 18, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  const steel = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#ECE9E2'); g.addColorStop(0.5, '#8F8B84'); g.addColorStop(1, '#4A4743'); return g; };
  const handle = (side) => {
    ctx.save(); ctx.rotate(Math.PI + side * ha);
    // channel handle (open side shows the folded blade spine inside)
    ctx.beginPath(); ctx.roundRect(8, -17, 360, 34, 10);
    ctx.fillStyle = steel(-17, 17); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(30, -10, 300, 20, 7);
    ctx.fillStyle = ctx.createPattern(scalePattern(), 'repeat'); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  };
  const jaw = (side) => {
    ctx.save(); ctx.rotate(-side * ja);
    ctx.beginPath();
    ctx.moveTo(-14, side * -2);
    ctx.lineTo(40, side * -15);
    ctx.quadraticCurveTo(110, side * -10, 152, side * -3);
    ctx.lineTo(152, side * 1);
    ctx.lineTo(20, side * 2);
    ctx.closePath();
    ctx.fillStyle = steel(side * -15, side * 3); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
    // serrations on the gripping face
    ctx.strokeStyle = 'rgba(30,20,15,0.6)'; ctx.lineWidth = 1.1;
    for (let k = 0; k < 14; k++) { const xx = 60 + k * 6.5; ctx.beginPath(); ctx.moveTo(xx, side * 1.5); ctx.lineTo(xx + 3, side * -3.5); ctx.stroke(); }
    ctx.restore();
  };
  handle(1); handle(-1);
  jaw(1); jaw(-1);
  // pivot rivet
  ctx.fillStyle = '#A5A19A'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,250,240,0.85)'; ctx.beginPath(); ctx.arc(-4, -4, 5, 0, TAU); ctx.fill();
  ctx.restore();
  // returns jaw tip (world) for attaching things
  const c = Math.cos(rot), sn = Math.sin(rot);
  return { tip: [x + c * 150 * s, y + sn * 150 * s] };
}

/** Magnified edge profile inside a loupe circle: chipped, rolled — DULL. */
export function drawLoupeEdge(ctx, cx, cy, r, p, t) {
  if (p <= 0) return;
  const e = ease.outExpo(clamp(p));
  const rr = r * e;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU);
  ctx.fillStyle = '#0F0B09'; ctx.fill();
  ctx.save(); ctx.clip();
  // magnified steel: top part = blade flank, bottom edge irregular
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r * 0.2);
  g.addColorStop(0, '#CFCBC3'); g.addColorStop(0.7, '#9A958D'); g.addColorStop(1, '#6E6A63');
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.2, cy - r * 1.2);
  ctx.lineTo(cx + r * 1.2, cy - r * 1.2);
  const n = 70;
  for (let i = n; i >= 0; i--) {
    const u = i / n;
    const x = cx - r * 1.2 + u * r * 2.4;
    const chip = Math.max(0, noise.n2(u * 9, 3.1)) * r * 0.22 + Math.abs(noise.n2(u * 31, 7.7)) * r * 0.06;
    const roll = Math.sin(u * 40) * r * 0.012;
    ctx.lineTo(x, cy + r * 0.12 - chip + roll);
  }
  ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  // burr / rolled edge highlight
  ctx.strokeStyle = 'rgba(255,245,230,0.75)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = cx - r * 1.2 + u * r * 2.4;
    const chip = Math.max(0, noise.n2(u * 9, 3.1)) * r * 0.22 + Math.abs(noise.n2(u * 31, 7.7)) * r * 0.06;
    const y = cy + r * 0.12 - chip + Math.sin(u * 40) * r * 0.012 - 3;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  // scratches + rust pits
  const R = rng(81);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = 'rgba(60,45,35,0.35)'; ctx.lineWidth = 1;
    const x = cx - r + R() * r * 2, y = cy - r + R() * r * 1.0;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 + R() * 30, y + (R() - 0.5) * 4); ctx.stroke();
  }
  for (let i = 0; i < 16; i++) { ctx.fillStyle = 'rgba(120,52,24,0.55)'; ctx.beginPath(); ctx.arc(cx - r + R() * r * 2, cy - r * 0.6 + R() * r * 0.7, 1.5 + R() * 4, 0, TAU); ctx.fill(); }
  ctx.restore();
  // loupe ring
  ctx.strokeStyle = 'rgba(240,230,215,0.9)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(240,230,215,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, rr + 8, 0, TAU); ctx.stroke();
  ctx.restore();
}

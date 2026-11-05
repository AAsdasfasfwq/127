// Forearm cross-section (schematic, sandstone-strata read) + nerve fibre cable.
import { clamp, lerp, ease, rng, noise, TAU, rgba, mixColor } from '../../core/util.js';
import { cached } from '../../core/textures.js';
import { C } from '../../core/palette.js';

export const XS = {
  R: 440,
  skin: [440, 412], fat: [412, 388],
  radius: { x: -150, y: 70, r: 74 }, ulna: { x: 150, y: 96, r: 62 },
  median: { x: 0, y: -130, r: 34 }, ulnarN: { x: 205, y: -40, r: 20 }, radialN: { x: -215, y: -55, r: 18 },
  arteries: [{ x: -250, y: -95, r: 13 }, { x: 245, y: -88, r: 13 }],
  tendons: (() => { const a = []; for (let i = 0; i < 11; i++) { const ang = -Math.PI / 2 + (i - 5) * 0.21; const rr = 300 + (i % 2) * 34; a.push({ x: Math.cos(ang) * rr, y: Math.sin(ang) * rr * 0.92 + 20, r: 19 + (i % 3) * 4, rot: ang }); } return a; })(),
};

function muscleTex() {
  return cached('s6:muscletex', () => {
    const c = document.createElement('canvas');
    c.width = 900; c.height = 900;
    const g = c.getContext('2d');
    g.fillStyle = '#8E3324'; g.fillRect(0, 0, 900, 900);
    const r = rng(33);
    for (let i = 0; i < 1500; i++) {
      const x = r() * 900, y = r() * 900, rr = 7 + r() * 11;
      g.fillStyle = mixColor('#A43C2A', '#7A2A1E', r());
      g.beginPath(); g.ellipse(x, y, rr, rr * (0.75 + r() * 0.4), r() * TAU, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(40,10,6,0.35)'; g.lineWidth = 1.2; g.stroke();
    }
    // fascia lines dividing compartments
    g.strokeStyle = 'rgba(240,220,200,0.55)'; g.lineWidth = 3;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + 0.3;
      g.beginPath(); g.moveTo(450, 450);
      for (let d = 0; d <= 460; d += 20) g.lineTo(450 + Math.cos(a + noise.n2(d * 0.01, k) * 0.25) * d, 450 + Math.sin(a + noise.n2(d * 0.01, k) * 0.25) * d);
      g.stroke();
    }
    return c;
  });
}

/**
 * Draw the cross-section face centred at (0,0) in the current transform.
 * st: { skinCut, muscleCut, tendonCut, nerveGlow, dimCut (0..1 how much cut layers darken), sweep:{ring, p}, t }
 */
export function drawSection(ctx, st = {}) {
  const t = st.t || 0;
  const cutDim = (k) => clamp(k) * (st.dimCut ?? 0.6);
  const ring = (r0, r1, col) => { ctx.beginPath(); ctx.arc(0, 0, r0, 0, TAU); ctx.arc(0, 0, r1, 0, TAU, true); ctx.fillStyle = col; ctx.fill('evenodd'); };
  // muscle body
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, XS.fat[1], 0, TAU); ctx.clip();
  ctx.drawImage(muscleTex(), -450, -450);
  // strata-like concentric growth rings (the sandstone echo)
  ctx.strokeStyle = 'rgba(30,8,5,0.22)'; ctx.lineWidth = 1.4;
  for (let rr = 110; rr < 388; rr += 26) { ctx.beginPath(); for (let a = 0; a <= TAU + 0.01; a += 0.08) { const q = rr + noise.n2(Math.cos(a) * 1.5 + rr * 0.01, Math.sin(a) * 1.5) * 9; a === 0 ? ctx.moveTo(Math.cos(a) * q, Math.sin(a) * q) : ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.stroke(); }
  if (st.muscleCut) { ctx.fillStyle = `rgba(22,10,9,${cutDim(st.muscleCut)})`; ctx.fillRect(-450, -450, 900, 900); }
  ctx.restore();
  // fat + skin rings
  ring(XS.fat[0], XS.fat[1], '#E2C07E');
  ring(XS.skin[0], XS.skin[1], '#D99A72');
  if (st.skinCut) { ctx.save(); ctx.globalAlpha = cutDim(st.skinCut); ring(XS.skin[0] + 1, XS.fat[1], '#1A0F0D'); ctx.restore(); }
  ctx.strokeStyle = '#2A1712'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, XS.R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(42,23,18,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, XS.skin[1], 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, XS.fat[1], 0, TAU); ctx.stroke();
  // bones (broken: crack lines)
  for (const b of [XS.radius, XS.ulna]) {
    ctx.fillStyle = '#EDE3CC'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#B98B4E'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.58, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,70,30,0.5)'; const r = rng(b.x + 999); for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(b.x + (r() - 0.5) * b.r, b.y + (r() - 0.5) * b.r, 2 + r() * 4, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#2A1712'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,12,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x - b.r, b.y - 6); ctx.lineTo(b.x - b.r * 0.3, b.y + 8); ctx.lineTo(b.x + b.r * 0.2, b.y - 10); ctx.lineTo(b.x + b.r, b.y + 4); ctx.stroke();
    if (st.dimBones) { ctx.fillStyle = `rgba(22,10,9,${st.dimBones})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, TAU); ctx.fill(); }
  }
  // arteries
  for (const a of XS.arteries) {
    ctx.fillStyle = '#7A1810'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#E9DFCC'; ctx.lineWidth = 2; ctx.stroke();
  }
  // tendons: glossy white ovals
  for (const td of XS.tendons) {
    ctx.save(); ctx.translate(td.x, td.y); ctx.rotate(td.rot);
    const g = ctx.createRadialGradient(-td.r * 0.3, -td.r * 0.3, 1, 0, 0, td.r * 1.2);
    g.addColorStop(0, '#FFFDF6'); g.addColorStop(0.6, '#E8E0CF'); g.addColorStop(1, '#B9AE98');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, td.r * 1.25, td.r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2A1712'; ctx.lineWidth = 1.8; ctx.stroke();
    if (st.tendonHi) { ctx.strokeStyle = rgba(C.red, st.tendonHi); ctx.lineWidth = 4; ctx.stroke(); }
    if (st.tendonCut) { ctx.fillStyle = `rgba(22,10,9,${cutDim(st.tendonCut)})`; ctx.fill(); }
    ctx.restore();
  }
  // nerves: yellow bundles with fascicles
  for (const [k, n] of [['median', XS.median], ['ulnar', XS.ulnarN], ['radial', XS.radialN]]) {
    const glow = st.nerveGlow || 0;
    if (glow > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(n.x, n.y, n.r * 0.5, n.x, n.y, n.r * (2.6 + glow * 2));
      gg.addColorStop(0, `rgba(255,214,130,${0.55 * glow})`); gg.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 5, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = mixColor('#E7C463', '#FFF4D2', glow * 0.8); ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2A1712'; ctx.lineWidth = 2; ctx.stroke();
    const r = rng(n.x * 7 + 3);
    for (let i = 0; i < 7; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * n.r * 0.62;
      ctx.fillStyle = glow > 0.3 ? 'rgba(255,250,235,0.9)' : 'rgba(170,120,40,0.7)';
      ctx.beginPath(); ctx.arc(n.x + Math.cos(a) * d, n.y + Math.sin(a) * d, n.r * 0.2, 0, TAU); ctx.fill();
    }
  }
  // cutting sweep (radial progress on a ring)
  if (st.sweep && st.sweep.p > 0 && st.sweep.p < 1.2) {
    const { r0, r1, p } = st.sweep;
    const a0 = -Math.PI / 2, a1 = a0 + TAU * clamp(p);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(210,48,30,${0.5 * (1 - clamp((p - 1) * 5))})`;
    ctx.beginPath(); ctx.arc(0, 0, r0, a0, a1); ctx.arc(0, 0, r1, a1, a0, true); ctx.closePath(); ctx.fill();
    // hot leading edge
    const ex = Math.cos(a1), ey = Math.sin(a1);
    ctx.strokeStyle = 'rgba(255,220,190,0.95)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ex * (r1 - 10), ey * (r1 - 10)); ctx.lineTo(ex * (r0 + 10), ey * (r0 + 10)); ctx.stroke();
    ctx.restore();
  }
}

/** Side of the slab (thickness) for the 2.5D read: the skin surface of the forearm segment. */
export function drawSlabSide(ctx, R, sy, depth, o = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, R, R * sy, 0, 0, Math.PI);
  ctx.lineTo(-R, depth);
  ctx.ellipse(0, depth, R, R * sy, 0, Math.PI, 0, true);
  ctx.closePath();
  const g = ctx.createLinearGradient(-R, 0, R, 0);
  g.addColorStop(0, '#5A2A1E'); g.addColorStop(0.3, '#B9785A'); g.addColorStop(0.55, '#D49A78'); g.addColorStop(1, '#4A2218');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#2A1712'; ctx.lineWidth = 2.5; ctx.stroke();
  // skin creases along the slab
  ctx.clip();
  ctx.strokeStyle = 'rgba(60,25,15,0.25)'; ctx.lineWidth = 1.2;
  for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.ellipse(0, depth * k / 6, R, R * sy, 0, 0.1, Math.PI - 0.1); ctx.stroke(); }
  ctx.restore();
}

/**
 * The nerve as a fibre cable running along x across [x0,x1] at y, radius r.
 * o: { t, pulse (0..1 brightness), cut:{x, gap, fray} , heat }
 */
export function drawCable(ctx, x0, x1, y, r, o = {}) {
  const t = o.t || 0;
  const n = o.fibres ?? 9;
  const rr = rng(77);
  const fib = [];
  for (let i = 0; i < n; i++) fib.push({ dy: (i / (n - 1) - 0.5) * r * 1.5 + (rr() - 0.5) * r * 0.15, w: r * (0.13 + rr() * 0.06), ph: rr() * 10 });
  const heat = o.heat ?? 0.5;
  ctx.save();
  // sheath glow
  ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createLinearGradient(0, y - r * 2.4, 0, y + r * 2.4);
  sg.addColorStop(0, 'rgba(255,190,90,0)'); sg.addColorStop(0.5, `rgba(255,200,110,${0.28 * heat})`); sg.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = sg; ctx.fillRect(x0, y - r * 2.4, x1 - x0, r * 4.8);
  ctx.globalCompositeOperation = 'source-over';
  const cut = o.cut;
  const segs = cut ? [[x0, cut.x - cut.gap / 2], [cut.x + cut.gap / 2, x1]] : [[x0, x1]];
  segs.forEach(([a, b], si) => {
    // sheath
    ctx.fillStyle = 'rgba(120,80,30,0.55)';
    ctx.beginPath(); ctx.roundRect(a, y - r, Math.max(0, b - a), r * 2, r * 0.3); ctx.fill();
    for (const f of fib) {
      const yy = y + f.dy;
      let fa = a, fb = b;
      if (cut) { const fray = (rr() * 0.6 + 0.4) * (cut.fray || 0) * r * 2; if (si === 0) fb += fray; else fa -= fray; }
      const g = ctx.createLinearGradient(0, yy - f.w, 0, yy + f.w);
      g.addColorStop(0, '#FFF6DA'); g.addColorStop(0.5, '#F4C766'); g.addColorStop(1, '#A8761E');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(fa, yy - f.w, Math.max(0, fb - fa), f.w * 2, f.w); ctx.fill();
    }
  });
  // travelling light pulses
  if ((o.pulse ?? 0) > 0) {
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) {
      const f = fib[(k * 3) % n];
      const span = x1 - x0;
      const px = x0 + ((t * (o.speed ?? 520) + k * span / 5 + f.ph * 40) % span);
      if (cut && Math.abs(px - cut.x) < cut.gap / 2) continue;
      const g = ctx.createRadialGradient(px, y + f.dy, 0, px, y + f.dy, r * 1.6);
      g.addColorStop(0, `rgba(255,250,230,${0.9 * o.pulse})`); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.fillRect(px - r * 2, y + f.dy - r * 2, r * 4, r * 4);
    }
  }
  ctx.restore();
}

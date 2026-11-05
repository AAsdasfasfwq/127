// Dev: quick orchestra + sfx smoke test (0–40 s).
import { M, N, chord, pattern, MOTIF, phrase } from '../core/synth.js';
import { S } from '../core/sfx.js';

M.pad(0, 16, chord('D3', 'min9'), { gain: 0.05 });
M.drone(0, 16, N('D2'), { gain: 0.05 });
phrase(2, 72, MOTIF.notes, MOTIF.beats, (t, f, d) => M.piano(t, f, { vel: 0.7 }));
pattern(8, 112, 'x...o...x..xo...', (t, v) => M.kick(t, { gain: 0.35 * v }), { bars: 4 });
pattern(8, 112, '..x...x...x...x.', (t, v) => M.hat(t, { gain: 0.05 * v }), { bars: 4 });
[0, 2, 4].forEach((k) => M.guitar(10 + k, chord('D3', 'add9'), { gain: 0.12 }));
M.strings(16, 10, chord('A2', 'min'), { gain: 0.05, tremolo: 9 });
M.choir(20, 8, chord('F3', 'maj'), { gain: 0.05 });
M.taiko(24); M.taiko(25.2); M.brass(26, 3, chord('D3', 'pow'));
S.whoosh(5); S.impact(12); S.grind(14, 2); S.crack(17); S.boom(28); S.tinnitus(28.5, 3); S.wind(30, 9); S.heli(31, 8);

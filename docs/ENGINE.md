# ENGINE — how to build a section

Everything is plain ES modules in the browser (no build step). `index.html` loads
`src/main.js`, which loads fonts, the narration timings, and every `src/sections/sN/index.js`.
A section registers **scenes** (video) and **audio events** (score + SFX) on one absolute
timeline in seconds (narration time).

## 1. Scenes — `src/core/engine.js`

```js
import { scene } from '../../core/engine.js';
scene({
  id: 's3-pulley',            // unique, prefix with your section id
  start: 337.4, end: 352.0,   // absolute seconds
  in: { type: 'strata', dur: 0.6 },   // optional transition FROM the previous base scene
  post: { grain: 0.07, vignette: 0.3, letterbox: 0, tint: null, tintAmt: 0, ca: 0 },
  init(info) { /* build caches, textures, THREE scenes (may be async) */ },
  render(ctx, lt, info) { /* draw the frame. lt = local seconds since start */ },
  dispose() { /* optional: free THREE resources */ },
});
```
* `ctx` is a cleared 1920×1080 2D context. **Paint your own background** every frame.
* `info`: `{ t, lt, dur, p, frame, W, H, buf(name,w,h), tmp() }` — `buf` is a persistent
  per-scene canvas (draw static art once, check `.drawn`), `tmp()` gives a cleared scratch
  canvas `{canvas, ctx}` valid for this frame only (for masks / layer blur).
* **Base scenes tile the timeline** — no gaps in your range (check with `tools/check.js`).
  When base scenes overlap, the later-starting one wins.
* **Overlays**: `z: 1..n` scenes are drawn on top (HUD, hour counter, subtitles-free type layers),
  with optional `fadeIn`/`fadeOut` seconds and `blend` (e.g. 'screen').
* **Transitions** `in.type`: `cut fade dip slit strata occluder sand tear iris light push whip
  zoom blur shape` (see `src/core/transitions.js` for options). The previous scene keeps
  rendering past its `end` during the blend — so **every scene must render sensibly up to
  2 s past its end** (keep motion going or hold; never throw).
* Many shots can live inside one scene (a scene is just a function of time) — use this for
  custom in-scene transitions (object morphs, camera travel between set-ups, match cuts).

### Determinism (non-negotiable)
Frames are rendered **out of order, in parallel, on many browsers**. Every pixel must be a pure
function of `t`:
* no `Math.random`, `Date.now`, `performance.now`, `requestAnimationFrame` timing;
* use `rng(seed)`, `noise.*`, `wiggle`, `handheld`, `shake` from `util.js`;
* state must not depend on previously rendered frames (closed-form motion, or re-simulate
  from the scene start with a fixed step — cache is fine if recomputation gives identical
  results). GSAP is available as `window.gsap` — only with `paused:true` timelines driven by
  `tl.seek(lt)`.
* async work only in `init` (texture generation, image decoding) — `render` should be sync.

### Performance budget
Average ≤ 250 ms/frame in headless SwiftShader (`tools/snap.js --bench`, `tools/check.js`).
Build procedural textures once (cached generators in `textures.js` or `info.buf`). Avoid
full-frame `getImageData` per frame except in short transitions. `ctx.filter = 'blur()'` is
fine on a few layers, not on hundreds of draws. Three.js: < 300k triangles, shadow maps ≤ 2048.

## 2. Core library

| Module | What you get |
|---|---|
| `util.js` | `clamp lerp invLerp remap smoothstep ease.* spring kf seg stagger onTwos rng noise(n2,n3,fbm2,fbm3,ridge2) wiggle handheld shake mixColor shade gradientAt rgba hexToRgb polylineAt bezierPoint` |
| `palette.js` | `C` (named colours), `PAL` (story states), `ROCK` (sandstone ramps) |
| `text.js` | `F` fonts, `text maskRise chars richLine measure wrap fmt odometer` |
| `textures.js` | `paper sandstone rockPath drawChockstone drawRockMass dust godRays softShadow halftone cached` |
| `camera.js` | `cam plane multiplane applyPlane apply2D mixCam project` (2.5D multiplane + pseudo-3D projection) |
| `three.js` | `THREE threeRender canvasTexture disposeTree getRenderer` (shared WebGL renderer) |
| `aaron.js` | `drawAaron drawHead drawHand POSES EXPR mixPose mixExpr AARON_COLORS AARON_BONES` |
| `motifs.js` | `hourCounter HOURS dateCard slitPath strataLines callout` |
| `transitions.js` | transition functions (also callable directly for in-scene blends) |
| `audio.js` | `at(t, dur, bus, fn)` low-level event, `speechAt(t)`, `MIX` |
| `synth.js` | `M.*` instruments, `N chord degree phrase pattern beats MOTIF CHORDS SCALES` |
| `sfx.js` | `S.*` sound effects |

Three.js addons are importable as `three/addons/...` (e.g. `three/addons/geometries/RoundedBoxGeometry.js`,
`three/addons/math/ImprovedNoise.js`, `three/addons/utils/BufferGeometryUtils.js`).
`window.flubber` (SVG path morphing) and `window.gsap` are loaded globally.

## 3. Audio

```js
import { M, N, chord, pattern, phrase, MOTIF } from '../../core/synth.js';
import { S } from '../../core/sfx.js';
M.pad(140.0, 9, chord('G3', 'add9'), { gain: 0.045, cutoff: 1800 });
pattern(140, 100, 'x...x...x...x...', (t, v) => M.kick(t, { gain: 0.3 * v }), { bars: 8 });
S.grind(190.2, 2.4, { gain: 0.2 }); S.impact(210.4, { size: 1.6 });
```
* Register audio at module top level (or inside a function you call at import).
* Events are rendered offline in 60 s windows; each event must be ≤ 13 s (long beds are split
  automatically by `pad/strings/choir/drone`; for your own `at()` events, chop them).
* Music bus is auto-ducked under speech; SFX bus is not (keep SFX subtle under words).
* Check: `node tools/audio.js --from A --to B --sections sN --out /tmp/sN.wav` → reports LUFS
  of your stem vs the VO. Target: stem **≥ 10 LU under the VO** overall, peaks < −3 dBFS.

## 4. Tools

```bash
node tools/words.js 138.2 180                         # word timings for your range
node tools/snap.js --sections s2 --range 138.2:160:0.5 --sheet /tmp/s2a.jpg --cols 8 --thumb 320
node tools/snap.js --sections s2 --times 190.4,191 --out /tmp/s2shots --bench
node tools/check.js --sections s2 --from 138.2 --to 302.25 --step 0.25
node tools/audio.js --sections s2 --from 138.2 --to 302.25 --out /tmp/s2.wav
node render.js --sections s2 --from 170 --to 200 --workers 3 --out /tmp/s2_test.mp4   # real video clip
node tools/serve.js                                   # preview in a browser (space = play)
```
Look at your frames (Read the JPGs) — judge composition, readability, motion continuity across
frame strips (use small `--range` steps like 0.1 s to check motion arcs and cuts).
To isolate a section use `--sections sN`; scratch experiments can be loaded with
`--dev dev/your_file.js --sections none` (put scratch files under `src/dev/`, prefixed with your
section id, e.g. `src/dev/s3_pulley_test.js`).

## 5. Ownership rules (7 agents work in parallel in this tree)

* You own **only** `src/sections/<yours>/**`, `docs/sections/<yours>.md`, and scratch files
  `src/dev/<yours>_*.js`. Never edit `src/core/*`, other sections, `index.html`, `render.js`,
  `tools/*`. If you need a variant of a core helper, copy it into your folder and adapt.
* Don't run `git commit`/`git push` (the director merges). Don't delete others' files.
* Keep `out/` for your renders (it's git-ignored); prefer your scratchpad or `/tmp/<yours>/`.

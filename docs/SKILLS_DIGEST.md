# SKILLS DIGEST — the rules we adopted from every studied skill

Every section agent applies ALL of these. (Sources: the 11 skill repositories the client
supplied; studied in full by the director. Only the rules relevant to a code-built
documentary are kept, translated into this project's tools.)

## director-agent (ai-film-skills) — directing
* Audience experience first; form is content; restraint beats accumulation.
* Decide per beat: what the audience knows vs the character, where attention goes, what remains.
* **No default coverage** (wide → close-up → pretty shot). Every shot carries a concept.
* **Action before emotion**: show a playable action (fingers drumming, rope pulled, eyes closing)
  instead of "he felt…".
* **Objects carry meaning** (the blank note, the blue tube, the dull blade, the chockstone).
* **Sound has a job** in every scene, including silence. **Every cut has a motive** (information,
  emotion, action, sound, eyeline, rhythm).
* Creative transitions must change how the audience discovers information / feels a turn / reads a
  time jump; describe start image → trigger → mechanism → end image.
* Time control: compression (days), expansion (the fraction of a second), freeze (physics),
  subjective time (delirium, vision).

## creative-direction (rampstackco) — the four axes
Professional-with-teeth tone · controlled maximalism inside editorial restraint · companion
relationship · resonant ambition. Keep the rejection list (ART_BIBLE §0). The brief is checked
before every output; violations are deliberate decisions, not accidents.

## atelier (jangles-byte) — anti-generic, motion, generative, finishing
* Genericism = absence of decisions. Make **one structural, one colour, one type decision** per
  sequence that a template would never make; execute the rest with restraint.
* Tests: describability (can a viewer describe one image tomorrow?), swap test, screenshot test.
* Motion answers *what happened / where did it go / is it alive*; otherwise delete it.
* Durations by weight; exits faster than entrances; no linear on anything the eye follows;
  compositor-friendly properties; every entrance has an exit.
* **Watch it**: you can't judge motion from code or from a single still — render strips.
* Generative work: colour is earned (maps to a property: heat, depth, age, speed); seed the
  randomness; density needs negative space; evolve slower than feels right; no rainbow; no pure
  black ground; vary size/speed/lifetime; offset centres.
* Finishing order: render → bloom (bright only, soft knee) → aberration (edges only) → tone →
  grade → vignette → grain last. If the viewer can name the effect, it's too strong.

## motion-art-direction (iart-ai) — motion language
* Lock the spec (easing family, base unit, transition family, stagger, intensity, holds) and obey
  it (ART_BIBLE §1). Two eases max; a third must justify itself.
* Motion hierarchy: hero (slowest, most eased, lands on the beat) / support / texture.
  Two elements competing for the eye = failed direction.
* Restraint: don't animate the whole frame at once; don't transition the transition; don't loop
  text that's being read; no overshoot on serious content; **one "wow" per sequence**.
* Pacing: low open → build → peak → settled end; silence and stillness are tools.

## motion-graphics-skills (imMamdouhaboammar) — craft + failure lessons
* Three pillars: emotional intent, visual narrative (setup → action → resolution), craft.
  Three layers: primary, secondary, ambient — flat animation = missing layers.
* Anti-slop: no equal-emphasis frames, no card soup, no scene sampler (2–3 transition families
  reused with variation), vary composition families (full-frame type, asymmetry, close detail, wide
  environment, depth, negative-space proof), no busy endings — resolve, clear, hold.
* Typography slop: not everything Black weight; no transcript wallpaper; no narrow headline walls;
  no accidental crops of letters/descenders.
* Failure lessons: never opacity-crossfade two saturated fields (check midpoint colour);
  perspective corridors converge onto the headline — show quantity on one readable plane; objects
  passing the lens leave by **moving**, not by turning translucent; labels need exits when the
  camera travels; assets must be ready before the frame (init!); duration lives in one place; the
  final hold must be planned.
* Vox-explainer rules: sound is not optional; objects move in depth, not single lines sliding;
  the voice sits on top; the opening promises what's coming; stunning in the first 3 s.
* Audio mastering: tactile foley (ticks, clicks) over constant whooshes; whooshes only for real
  camera moves; leave clean space before the hero hit; music ≥ 12 dB under the voice.
* Canonical moves (rise, pop, count-up, blur-in, punch-in, reframe, bar fill) are a vocabulary —
  combine with intent, never as decoration.

## remotion-motion-graphics-skill (Liamrjohnston) — cinematic camera & rejections
* **Build one world larger than the viewport and move a shared camera through it** — open tight
  on an action, hold while it completes, reveal context, travel to the contrast/payoff, settle.
* Rejected: one paper/card centred in an empty frame; rows appearing while the camera slowly zooms;
  floating glass cards in a void; glowing badges; decorative status pills; slow zoom as the only
  camera idea; empty travel before action; unrelated particles/sweeps; fabricated proof.

## remotion-dev/skills — sequencing, transitions, voiceover
* Think in sequences with explicit durations; transitions overlap two scenes (our `in` blends) vs
  overlays that sit on the cut without shortening (our z-overlays, light leaks).
* Voice-over drives timing: derive scene durations from the narration timestamps (we have word
  timings — cut on words).

## claude-remotion-skill (haidrrrry) — design rules
* 60/30/10 colour; the hero colour on at most one element per frame.
* Hero text 600–800 weight, tight tracking; highlight ONE word per headline.
* A new visual element at least every ~3 s; holds as a design tool: fast move → stillness → next.
* SFX lands 2–3 frames **before** the visual hit (early feels synced); riser into the cut, hit on it.
* Checklist: no linear easing; entrances use 2–3 properties staggered; exits faster; stills get a
  slow camera move; fast moves get motion blur; 5-layer stack (ground, assets, graphics, grade,
  grain+vignette); ≥ 3 moments of stillness per minute.

## motion-canvas — procedural timing model
* Animation as a function of time with signals/tweens; every property derived from time;
  generators = sequential beats (`kf`, `seg`, `stagger` in util.js play this role here).

## motion-design-director (liangming99) — gates & terminology
* Lead with judgment; use precise terms (container transform, shared axis, fade through, kinetic
  typography, track matte, speed graph, anticipation, follow-through, overshoot, motion blur).
* Gates: no many-unrelated-things-moving; not every word equal emphasis; no "magic" without
  input → process → result; decorative parallax/glow/blur that doesn't clarify focus is a defect.
* Timing: micro 70–150 ms, enter 150–240, transitions 240–420, hero beats 600–1600, reveals
  1200–3000 ms.

## video-editor (theneoai) — editorial rhythm
* Every cut feels inevitable; cut on audio cues (word emphasis, music hits, ambient changes).
* J/L-cut thinking: let sound lead into the next picture (score/sfx can arrive a few frames early).
* Don't cut on every beat — hold 2–3 beats between hits; B-roll must illustrate or metaphorise
  the narration, never "because it looks cool".
* Rule of three: information, emotion and visual interest build in threes.

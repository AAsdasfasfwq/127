# 127 — ART BIBLE (director's contract for all sections)

> A 17-minute YouTube documentary about Aron Ralston, built entirely in code.
> Seven agents build seven time ranges. This document is what makes them **one film**.
> Read it fully before designing a single frame. When in doubt: **what must the viewer
> see right now to understand this sentence?**

---

## 0. The film in one paragraph

A man who believed nothing could stop him walks into a maze of stone, tells no one, and is
pinned by an 800-lb boulder for 127 hours. The film moves from **open, warm, confident**
(wide desert, editorial paper world, kinetic swagger) → **narrow, cold, airless** (slot of sky,
shadow palette, hour counter) → **hallucinatory** (delirium, the vision of a son) → **brutal
resolve** (x-ray mechanics, white-hot pain) → **light and people** (sky-blue help arrives,
the lesson: leave a note). The visual space literally **narrows** as he gets trapped and
**opens** again when he is free.

**Audience endpoint:** the viewer leaves remembering two images — the vertical slit of blue sky
above a man who cannot move, and a handwritten note on a kitchen table.

### Four axes (creative-direction brief)
| Axis | Position | Why |
|---|---|---|
| Tone register | **Professional with teeth** — measured, documentary, with flashes of sardonic irony (cheap multi-tool, "invulnerable") | true story, real suffering; irony only where the script itself is ironic |
| Aesthetic philosophy | **Controlled maximalist** inside **editorial restraint** — every frame dense with *meaning*, never with *stuff* | YouTube retention + premium feel |
| Audience relationship | **Companion** — we walk with Aron, close, at his eye level, then step back to explain | survival story |
| Sensory ambition | **Resonant** | the viewer must *feel* the narrowing |

**Rejection list:** no stock-icon lists, no rounded-card soup, no glass cards in voids, no
purple/cyan gradients, no neon/bloom fog, no transcript wallpaper (subtitles), no
centred-headline-over-object on every beat, no pure #000/#fff fields, no "AI demo" floating
particles, no logos of real brands (Intel, Leatherman, Coca-Cola are type or generic objects),
no gore (the amputation is told through x-ray schematics, light, sound, the face, the hand).

---

## 1. Motion language (one hand for 17 minutes)

| Property | Rule |
|---|---|
| Signature easing | `ease.film` / `ease.outExpo` / `ease.outQuart` for entrances; `ease.inQuart`/`inExpo` exits (≈20 % faster than entrances); camera `inOutCubic`/`inOutSine`. `outBack` **only** for ironic/playful beats (S1 bio swagger, S2 cheap multi-tool). No linear easing on anything the eye follows. |
| Base timing unit | **0.4 s** (12 frames). Micro 0.2 s, standard 0.4, big 0.8, hero reveal 1.2–1.6. |
| Stagger | 60–90 ms cascades. |
| Hold discipline | ≥ 0.3 s stillness after a landing — but the *frame* is never dead: something always breathes (camera drift, dust, light flicker, parallax, a slow push). |
| Shot length | **1.5–4 s per visual idea** in explanation; up to 6–8 s only for an emotional hold with internal motion. Never a static frame > 1 s. |
| Hierarchy | exactly **one hero** per frame; support moves smaller/faster; texture is subliminal. |
| Camera | always alive: push, pull, dolly through multiplane, crane, orbit (3D), rack-focus (DOF via multiplane), handheld only in fear/trauma. No endless zoom-in as the only idea. |

### Montage families (choose with intent; don't sample everything)
1. **Shape/object match** (primary family): circle → circle, crack → slit → rope, boulder → number,
   watch face → sun, multi-tool → blueprint, etc. The strongest cuts in this film are matches.
2. **Canyon slit** (`in:{type:'slit'}`): reserved for entering the canyon / moments of light.
3. **Strata wipe** (`'strata'`): chapter-like turns inside explanatory passages.
4. **Foreground occluder** (`'occluder'`): a rock wall passes the lens — moving through space.
5. **Hard cut on the word**: for shocks, numbers, dates, and rhythm. Cut *on* the stressed word.
6. **Light** (`'light'`): heat, revelation, vision, freedom. Rare.
7. Time-jump interstitials (`motifs.dateCard` or your own variation): clean bg, big date, small meta.

Don't use the same transition twice in a row. Don't put a whoosh on every transition.

---

## 2. Colour (story-driven, related palettes) — `src/core/palette.js`

* **Warm earth is home**: paper `#F1E8D8`, sand, ochre, terracotta `#C4552D`, rust, oxide, umber.
* **SKY BLUE `#5FB8E6` = the outside world / other people / help.** The sky slit, parents,
  friends, roommates, the Dutch family, the helicopter, the note on the table. Use it *sparingly*
  so it means something. When Aron is cut off, blue is absent or distant.
* **SIGNAL RED `#D2301E` = danger, the mistake, pain, blood.**
* State palettes (`PAL.*`): `day`, `canyon`, `office` (cold fluorescent sage — the cage of office
  life), `danger`, `shadow` (slate canyon shade), `night`, `delirium` (violet/magenta/sick ochre),
  `vision` (golden, the ONLY lush green in the film), `xray` (bone on oxide black), `bleach`
  (overexposed midday desert), `rescue` (sky blues), `winter` (peaks).
* Black backgrounds only when they *serve* the moment (shock, x-ray, night). Default grounds are
  tinted (paper, sand, slate, umber), never `#000`.
* Never opacity-crossfade two different saturated fields (muddy third colour). Cut, wipe, or carry
  an object across.

---

## 3. Typography — `src/core/text.js`

| Role | Font | Use |
|---|---|---|
| Numbers, dates, big words | **Big Shoulders Display** 700–900, CAPS | `800 LB`, `APR 26`, `127` |
| Connective phrases | **Instrument Serif** italic | small poetic counterpoint: *the most*, *he told* |
| Chapter / headline | **Fraunces** 300–900 (+italic) | chapter titles, editorial headlines |
| Data / labels / HOUR | **Martian Mono** | coordinates, units, callouts, timecodes |
| Hero statement (rare) | **Unbounded** 800 | book/film title, one or two moments max |
| UI-ish labels | **Bricolage Grotesque** | phone UI, search notice, secondary |
| Handwriting | **Reenie Beanie** | the note, diary scribbles, goodbye |
| Scratched in stone | **Rock Salt** | "ARON RALSTON · OCT 1975 – APR 2003" carved |
| Typewriter | **Special Elite** | police report, missing-person, medical record |

The signature typographic voice (see ref sheets): **mixed-style lines on one baseline** —
small italic serif + huge condensed caps (`richLine`). Words rise from masks (`maskRise`),
characters can be animated individually (`chars`). Text is **scarce**: names, numbers, dates,
places, key terms, a short quote. Never the sentence the narrator is saying. Spell the name
**ARON RALSTON** on screen (the transcript's "Aaron" is a transcription artifact).

Safe area: keep text and key subjects inside x 120–1800, y 90–990.

---

## 4. Graphics mix & depth

Target across every section: **2D ≈ 50 %**, **2.5D ≈ 35 %**, **3D ≈ 15 %** of screen time, and
**motion design (infographic / kinetic type / diagrams / collage) ≥ 60 %** of the edit.
Character animation is the minority, used where a human moment explains better than a graphic.

* **2D is never flat**: layered planes, cast shadows (`softShadow`), rim light, textured materials
  (`paper`, `sandstone`, `drawChockstone`, `drawRockMass`), atmospheric haze, depth blur.
* **2.5D**: use `camera.multiplane` — foreground occluders (z≈0.35–0.6, blurred), subject (z=1),
  mid (z 1.5–3), far (z 4–8 with haze), sky (z 20). Push/dolly the camera so parallax *reveals*.
  Objects should also move in depth (scale + y-shift + shadow change), not only sideways.
* **3D** (`src/core/three.js`): Three.js with real materials — canvas textures from `textures.js`,
  displaced geometry, ACES tone mapping, soft shadows, hemisphere + key light. No untextured
  white models, no default cubes, no empty voids. Composite the WebGL canvas into your 2D frame and
  add 2D typography/grain on top so it belongs to the same film.
* **No primitives as finished objects.** Every object gets texture, edge detail, shading, and a
  contact shadow. A "rock" is `rockPath`+`sandstone`+shading, not a circle; a "rope" has twist
  stripes and sag; a "bottle" has a label, highlights and liquid level; a "truck" has panels,
  wheels with hubs, windows with reflections.

---

## 5. Characters — `src/core/aaron.js` (the model sheet in code)

**ARON** (always via `drawAaron` / `drawHead` so he's one character): tall, lanky, long limbs, big
hands/feet; long face, angular jaw, cleft chin; big hooked nose with a bump; thick dark straight
brows; short dark-brown hair with a **three-strand cowlick** (signature silhouette); hazel-grey eyes;
sunburnt nose/cheeks. Outfit: mustard tee, olive cargo shorts, grey shoes with **red laces**,
slate-teal hydration pack with a **sky-blue drinking tube** (the tube later becomes the
tourniquet), black watch on the left wrist. Office outfit for the Intel beat.
Continuity: `beard` grows 0.05 (Sat) → 0.25 (Sun) → 0.45 (Mon) → 0.6 (Tue) → 0.8 (Wed) → 0.95
(Thu). `dirt` and `tired` rise from 0 (fall) to ~0.8 (Thu). After the amputation:
`rightArm:'stump'` (bandaged). Light direction should match the scene's key light.

Animate with life: anticipation → action → follow-through; breathing (subtle torso/root bob),
blinks (`expr.blink`), eye darts (`expr.look`), head tilts, weight shifts; poses blend with
`mixPose`, expressions with `mixExpr`. Avoid "paper cut-out" motion: move characters in depth
(scale/perspective), rotate head yaw through 3/4 views, overlap body parts, let the camera move
around them in multiplane sets.

**Supporting cast** (draw in the same style: cel-shaded, outlined `#2A1712`, caricatured,
individual silhouettes — never generic people):
* **Donna (mother)** — small, round, short silver bob, big round tortoise-shell glasses, sky-blue
  cardigan, phone always in hand. Worried brows. (S1 tease, S7 the search she forces.)
* **Friends / roommates** — silhouettes with personality (a tall bearded one with a beanie, a
  curly-haired one with a mug) in sky-blue accents; mostly in S1 and S4 (hallucination).
* **Eric & Monique Meijer + son** — Dutch hikers: Eric very tall, sun hat, round glasses, beard;
  Monique blond braid, red bandana, trekking poles; the boy ~9 with binoculars. Their clothes carry
  sky blue. (S6, S7.)
* **The boy in the vision (future son)** — ~3 years, straw-coloured messy hair, yellow tee, laughing.
  **Older Aron** — same face, fuller beard with grey, prosthetic right arm (S4 vision, S7 Leo).
* Rescuers, doctors — S7.

---

## 6. Recurring motifs — `src/core/motifs.js`

1. **HOUR counter** (`hourCounter`) — appears from the moment of entrapment (S2 ≈ 212 s) and at
   key moments after; narrative hours in `HOURS`. It lands on **127** at "He was free" (S6 ≈ 782.9 s)
   — the film's single biggest typographic payoff. Show `total:'/127'` only from S6 onward.
2. **The slit of sky** (`slitPath`, transition `'slit'`) — the shape of being trapped. Width
   shrinks as days pass; it's where the 15 minutes of sun come from; it opens wide at freedom.
3. **Strata lines** (`strataLines`) — sandstone layers as contour lines: maps, charts, backgrounds,
   time.
4. **The chockstone** (`drawChockstone`) — ONE boulder design (lichen spot = its "eye", two
   diagonal bands, pale scar). In 3D, match its colours and the lichen spot.
5. **The note** — a blank paper card first seen (subtly) in S1 when he leaves without writing it;
   the final image of the film (S7) is the note written. Handwriting in Reenie Beanie, blue ink.
6. **Red dust** — fine particles connect spaces (dust motes in light shafts).
7. **Musical leitmotif** (`MOTIF` in synth.js) — D–F–A–G (questioning); hope variant D–F♯–A–B–A.

---

## 7. Sound & music — `src/core/synth.js`, `src/core/sfx.js`

* Narration is king. Score + SFX are rendered into one stem that is mixed **under** the VO and
  auto-ducked during speech. **Check your range with `node tools/audio.js`**: the stem should sit
  **≥ 10 LU below the VO** overall; true peak below −3 dBFS.
* Music is **almost always present** but **changes with the story**: genre, tempo, instrumentation
  and key follow the emotional curve (see each section brief for its cue sheet). Use the motif.
* SFX accent visual beats: number reveals (tick/click), scale changes (sweep), time jumps
  (soft impact/tonal hit), reveals (stinger), real actions (grind, crack, rope, steps, wind).
  Whooshes only for real camera moves. 60 ms of near-silence before hero impacts.
* Never loud, never harsh. Low gains (defaults are safe). Fades at section edges: start your cues
  with ≥ 0.4 s fade-in at your section start unless a hard hit is intended; let tails ring ≤ 3 s past
  your end at most and keep them quiet — the next section starts its own cue.

---

## 8. Quality gates (run on every shot before calling it done)

* **Meaning** — why this image on this line? Cut on the word.
* **Composition** — clear focal point, one hero, negative space, foreground/mid/background.
* **Readability** — understood in 1–2 s, readable at phone size (text ≥ 34 px unless decorative).
* **Motion** — something always moves with intent; no frame static for > 1 s; no jank at cuts.
* **Overload** — remove one element; is it stronger? Then remove it.
* **No overlaps/collisions** — text never collides with other text or crosses busy detail; nothing
  gets stuck on screen past its beat; nothing pops in/out without an entrance/exit.
* **AI-flavour check** — if it looks like a template or a demo, redesign it.
* **Continuity** — Aron's look, the chockstone, palettes, fonts, HOUR counter consistent.

---

## 9. Reference lessons (from the supplied videos)

* *Ref 1 (brain/eye)*: paper-grain ground with vignette; real-looking objects with soft contact
  shadows; thin connector lines; spotlight cones; small serif + bold sans word mix; shape match
  (eye → brain circle); light → dark ground change for a turn in meaning.
* *Ref 2 (editorial brand story)*: light editorial ground, blurred foreground leaves (occluders),
  pink ribbon curve as a path that guides the eye, word-by-word reveals in mixed type,
  framed photos with depth shadows, 3D objects (money stacks, jacket) integrated with type.
* *Ref 3 (time is money)*: clock → coin shape match; sticky notes with handwritten crossed words;
  a path/road in perspective toward a flag; colour flood at the end beat.
* *Ref 4 (collage)*: kinetic single words, collage objects (cash pillow on a stool), greyscale
  collage + one colour, red field with diagonal stripes, year numbers behind a subject.
* *Ref 5 (showreel)*: variety of worlds held together by craft — isometric architecture,
  illustrated characters with personality, cinematic 3D light, paper sculpture, fire, macro
  materials. Each shot is one strong idea, 1.5–3 s, transitions carry momentum.
Contact sheets: `docs/refs/*.jpg`.

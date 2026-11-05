# SECTIONS — the director's treatment and hand-off contracts

Seven agents, seven time ranges. Each agent owns **everything** inside its range: visual plan,
scenes, characters, infographics, typography, transitions, camera, score and sound design.
The treatments below are the director's intent — beat ideas you should develop, refine or
replace with something stronger (never weaker). Exact narration: `docs/SCRIPT.md` and
`node tools/words.js A B`. Art rules: `docs/ART_BIBLE.md`. API: `docs/ENGINE.md`.

## Boundary contracts (frames that two agents must agree on)

| Boundary | Out-going section must end with… | In-coming section must start with… |
|---|---|---|
| **B1 138.20** S1→S2 | Aron stemming in a warm sunlit slot (2.5D). Keep that scene renderable until 140.5. | S2 opens on "On Saturday afternoon…" with a date beat (`SAT · APR 26 · 2003`) via cut or `slit`. |
| **B2 302.25** S2→S3 | The cheap multi-tool, blade open, lying horizontally at frame centre (≈960,560), ≈1000 px long, tilted −8°, on a dark slate ground `#2E3A48` under warm top light. Hold/drift it to 304.5. | S3 match-cuts / morphs that same object into the PLAN A blueprint. |
| **B3 454.20** S3→S4 | Cold blue-slate shade after the 15-minute sun has left; Aron in shadow. Renderable to 456.5. | S4 hard-cuts on the word "Aaron" (454.36) to the camcorder. |
| **B4 600.76** S4→S5 | Extreme close-up of Aron's eyes opening in darkness, faint pre-dawn blue in the sky slit. Renderable to 603. | S5 uses `light` (dawn) into `THU · MAY 1`. |
| **B5 717.05** S5→S6 | The x-ray of the broken forearm dimming to near-black `#120D0B` by 717.05. | S6 hard cut to black: "Now came the hardest part." |
| **B6 885.26** S6→S7 | A phone screen in a Dutch hiker's hand searching for signal (bars empty), canyon behind. Renderable to 887.5. | S7 pulls back from the phone into an aerial search map (zoom/match). |

Music at boundaries: fade your cue tail out within ≤ 2 s after your end; the next section
fades its cue in. Keep both quiet over the seam (the narration bridges it).

HOUR counter (`motifs.hourCounter`): starts at S2 ≈ 212.8 ("In a fraction of a second") with
`HOURS.trapped`; S3: plans ~3, first night ~7, SUN 21, MON 45, TUE 69; S4: WED 93, vision night
~105; S5: THU morning 114, decision ~118; S6: counts the last hour and lands on **127** at
"He was free" (782.94). Use it at key beats — don't keep it on screen permanently.

Beard/dirt/tired continuity for Aron: see ART_BIBLE §5.

---

## S1 · 0.00 → 138.20 · "The Maze & The Man"
**Arc:** majestic → confident swagger → ironic warning → isolation. **Palettes:** `canyon`/`day`,
`office` for Intel, `danger` flash on "fatal mistake", dusk for departure.
**Beats (develop):**
- 0–6.4 Cold open: cinematic 3D flight low over procedural Canyonlands at golden hour (Three.js
  displaced terrain, strata-banded colouring, haze). Tiny mono coordinates, "UTAH" tracked type.
  Light dips on "unforgiving".
- 6.4–15.4 Camera rises to top-down: canyons read as a MAZE (strata contour lines draw on);
  2.5D cross-section of rock layers being incised by water — "millions of years" counter rolling.
- 15.4–23.9 "Martian wilderness": the red world from above, adventurers' dotted routes converging
  from beyond the frame; "mistakes · carelessness · overconfidence" — each carved/cracked into a
  rock face, the last one (OVERCONFIDENCE) stays and turns red.
- 23.9–30.7 `2003` beat → hero introduction of ARON: he steps into frame on a ridge in multiplane
  depth, cowlick silhouette against sky. "ARON RALSTON · 27".
- 30.7–37.1 "test the limits of endurance": a limit line he steps over / a gauge pushed past red.
- 37.1–45.7 Intel: cold sage isometric cubicle world, Aron in office outfit, fingers drumming,
  clock ticking, mountain poster; diploma "MECHANICAL ENGINEERING", "INTEL" as badge type (no logo).
  Sardonic pizzicato.
- 45.7–56.7 He quits (badge tossed) → gear flies into a box → map route to the Colorado Rockies
  → fast 2.5D montage: climbing / skiing / summit, peak silhouettes + altitude numbers.
- 56.7–62.7 "endurance, equipment, conditioning": an engineering spec sheet of the athlete (he's
  an engineer) — callouts on a drafted figure; gear knolling.
- 62.7–77.7 "one critical weakness… invulnerable… skills, sharp mind, strength…": the spec sheet's
  WEAKNESS callout blinks red; INVULNERABLE as heavy armour-like type around him; then a balance
  scale: skills + mind + strength outweighing "anything" — whose silhouette is a boulder (first
  foreshadow of the chockstone).
- 77.7–86.6 "most basic and most fatal mistake": light drains to `danger`; `richLine` type.
- 86.6–94.1 Friday evening, house at dusk, pickup leaves; on the kitchen table a **blank note card**
  and pen — unwritten (motif). "TOLD NO ONE".
- 94.1–101.6 Parents, friends, roommates as sky-blue figures connected to Aron by blue threads —
  threads go slack / snap, "?" never as a clip-art icon.
- 101.6–112.4 Truck on a long desert road shrinks into the enormous red landscape; phone signal
  bars drop to zero; the last blue thread snaps.
- 112.4–116 "SLOT CANYON" — dive into the slit (`slit` transition).
- 116–126.7 Infographic: cross-section, `20 IN` width vs Aron's shoulders, `100+ FT` walls vs a
  10-storey building; camera tilts up the wall.
- 126.7–138.2 Aron stemming between the walls (POSES.chimney animated), force-vector arrows
  for hands/feet; warm light bands. → B1.
**Score:** 0–24 epic western panorama (D Dorian, ~72 bpm: cello drone, taiko swells, KS
baritone guitar twang, airy pad; dark stab + sub at "overconfidence"); 24–62 upbeat
indie-folk/electronic (~112 bpm: plucked arps, shaker, claps, warm bass) with a **sardonic
office interlude** 37–46 (pizzicato, ticking, muted clarinet-ish FM) → energetic burst on "quit";
62–88 the groove filtered down + fragile music-box motif → silence + low hit on "fatal mistake";
88–112 tense pulse (ticking 16ths, muted piano ostinato, ~96 bpm), wide lonely reverb for the
drive; 112–138 curious/technical (marimba/kalimba, airy pad, light percussion, E minor).

## S2 · 138.20 → 302.25 · "The Boulder"
**Arc:** sunny ease → creeping suspense → the fall (shock) → pain/panic → bleak stillness →
cold engineering inventory with sardonic sting. **Palettes:** `canyon` → `danger` → `shadow`.
**Beats:**
- 138.2–146.4 Date beat `SAT · APR 26 · 2003`; route map of Blue John Canyon with a moving dot;
  Aron moving through sunlit narrows.
- 146.4–153 Great mood, clear weather, predictable route — wide blue sky slit above, a smiling Aron.
- 153–166.8 THE CHOCKSTONE reveal: camera rises over a drop to the boulder wedged between walls
  (2.5D/3D). Mini flashback: it fell from the rim long ago and wedged (diagram, years rolling back).
  Label "CHOCKSTONE".
- 166.8–177.3 Routine move: foot braced, right hand on the boulder (hand close-up), lowering.
- 177.3–187 Freeze-frame: "laws of physics + geological instability" as an overlay diagram on the
  frozen moment (vectors, stress cracks), red.
- 187–199.9 The boulder shifts — grinding, dust; schematic of the narrowing V passage, it slides.
- 199.9–212.8 Fast action edit: hand pulls back, push, fall to the bottom, the boulder crashes after
  him — impact, shake, dust explosion, `800 LB` slams in.
- 212.8–225.4 Slow-mo "fraction of a second": cross-section of the arm pinned between rock and wall
  (red pressure zone); **HOUR 000 appears**; white pain flash; reaction close-up (shock → pain).
- 225.4–243.3 Struggle (handheld, repeated attempts, scream), then the **steel wedge** diagram
  (V-wedge force arrows).
- 243.3–263 Dust settles in silence. Infographics: shaft `< 3 FT` wide; zoom-out map — miles from
  the nearest paved road; weight comparison boulder vs large motorcycle on a scale.
- 263–276.4 Panic → engineering mind: the image becomes a drafting sheet; calm-determined face.
- 276.4–302.25 Grim inventory as a top-down **knolling** flat-lay on rock: `12 FL OZ` water (liquid
  sloshing), 2 foil burritos, carabiners, rope coil, and the cheap multi-tool → hero; sardonic
  "NOT EVEN A LEATHERMAN" (type only), blade edge magnified: dull, short, poor steel. → B2.
**Score:** 138–177 sunny fingerpicked guitar (G major, ~100 bpm, brushes) with a low drone and
reversed swells creeping in from ~153; riser into 177. 177–213 thriller ostinato strings
(~140 bpm), taiko, ticking; grinding SFX; BIG impact at the crash then near-silence + tinnitus.
213–243 horror textures: dissonant string clusters, heartbeat, distorted sub pulses. 243–270 bleak:
drone, wind, single piano notes (D minor), space. 270–302 sneaky/sardonic: walking pizzicato bass,
muted clarinet-like FM, finger snaps (~92 bpm); a wobbly comic sting for the cheap multi-tool.

## S3 · 302.25 → 454.20 · "Plans, Night, Thirst"
**Arc:** methodical hope → futility → engineering hope → collapse → dread → cold → thirst →
fifteen minutes of warmth → cold again. **Palettes:** drafting (bone on ink/oxide), `canyon`,
`night`, `shadow`, `gold` sun moment.
**Beats:**
- 302.25–310.5 From the multi-tool (B2) → PLAN A blueprint ("CHIP THE ROCK").
- 310.5–337 Macro: blade scraping sandstone, chip after chip on a rhythm; **Sisyphus** metaphor in
  a red-figure Greek pottery style (tiny figure, eternal boulder) → back to reality; ruler/progress
  `≈ 0.1 IN / HOUR`; HOUR counter crawls; the blade's edge profile bends and dulls; plan abandoned.
- 333.7–368.3 PLAN B "the laws of mechanics": pulley system as an exploded engineering view (3D or
  2.5D): rope path travels over a second wedged boulder upstream, carabiners as nodes, `660 LB` vs
  body weight, mechanical advantage maths, friction; the rope rings like a string (vibrating
  waveform + tone); displacement readout `0.000 IN`. Fail.
- 368.4–393 Twilight drains the sky slit (time-lapse); "NO ONE" beats; the timeline that kills:
  SAT → TUE (work notices) → +days (truck found) → +weeks (search hundreds of sq mi) vs his water
  running out long before; search grid spreading on the map.
- 393–412.4 Night: temperature falling (°F), Aron cocooned in rope, shivering, breath vapour;
  `SUNDAY · MONDAY · TUESDAY` interstitials, HOUR 21 → 45 → 69, the slit narrowing, beard growing.
- 412.9–437.9 "brutal battle… mind unravelling": water level 12 oz → 0 on day 2; dehydration
  body diagram (kidneys); the urine bottle handled with dignity (amber level, "last resort");
  type that starts to crack/glitch.
- 438.3–454.2 A 24-hour dial with a thin golden 15-minute wedge; the sunbeam slides down the wall
  onto his upturned face (god rays, warmth, eyes closed); then shade returns cold. → B3.
**Score:** 302–337 mechanical futility (metallic ticks on each chip, odd-meter ostinato on
prepared-piano/marimba, slowly decelerating, falling drone on failure); 337–368 engineering build
(driving arpeggio ~120 bpm, rising tension, the rope "ring" as a pitched string glide, collapse to
silence on "not even a hair"); 368–412 dread/horror ambient (low string tremolo, bowed-metal
texture, wind, crystalline high shimmer for the cold night, three low bell tolls for SUN/MON/TUE);
412–438 psychological thriller (detuned pulsing pad, heartbeat, warped textures); 438–452 a brief
warm major bloom for the sun, then cold again.

## S4 · 454.20 → 600.76 · "The Diary & The Vision"
**Arc:** intimacy → acceptance → goodbye → body failing → delirium → carving his own epitaph →
the vision (the most beautiful minute of the film) → the jolt. **Palettes:** camcorder DV look
(desaturated, green-ish low light), `delirium`, `vision` (golden, lush green), back to night.
**Beats:**
- 454.4–463 The camcorder (detailed 3D or illustrated object, flip-out screen); DV-tape flashback
  snippets of biking tricks; the camera set on a ledge facing him — "confessor".
- 463.9–481.5 DV viewfinder UI (REC ●, timecode, low battery blinking, date `APR 30 2003`), Aron's
  exhausted calm face in low-light; "no bravado · no hysteria"; survival gauge sinking to 0 %.
- 481.5–506.9 Goodbyes: messages travel up the S1 blue threads (now one-way) to mother, sister,
  friends; "SORRY" handwritten; a handwritten page of instructions (savings, possessions) writing
  itself.
- 506.9–528.7 `WEDNESDAY` · HOUR 93 · body failing: thickening blood (crowded red cells slowing
  in a vessel), cracked lips macro; DELIRIUM: walls warp, friends at the rim with sweating
  ice-cold red soda cans (no logos), echoing "ARON…" voice-typography.
- 528.8–547.2 He scratches his epitaph into the sandstone — Rock Salt letters carved with raking
  light: `ARON RALSTON · OCT 1975 – APR 2003`; pull back into the enormous anonymous desert.
- 547.2–600.6 The night vision: golden sunlit park in deep multiplane (trees, grass, bokeh, light
  rays), a 3-year-old straw-haired boy running and laughing, older Aron (grey-flecked beard) scoops
  him up; celesta plays the hope motif. "Dying brain or providence" — the image trembles; the
  defibrillator jolt: white flash, ECG flatline → spike; darkness; Aron's eyes snap open. → B4.
**Score:** 454–507 intimate melancholy (solo felt piano + cello, ~66 bpm, A minor → F major);
507–547 psychedelic horror (reversed swells, pitch-wobbling pad, ghostly choir, distorted
whispery textures), a funereal low choir + single bell toll on "April 2003"; 547–588 ethereal hope
(celesta/bells hope motif, warm pad, soft choir "aah", E/D major, building); 588 defib charge +
thump; resolute chord on "He could not die here"; gentle resolution on "father."

## S5 · 600.76 → 717.05 · "The Decision"
**Arc:** cold resolve → why it seemed impossible → the engineering insight → monumental statement →
preparation → the two breaks. **Palettes:** dawn steel, `xray`, ink/bone, red accents.
**Beats:**
- 600.9–610 Dawn light → `THU · MAY 1`, HOUR 114, a determined face.
- 610–633.6 Why not earlier: blade vs bone (forearm cross-section: skin, muscle, radius, ulna);
  the knife barely cuts nylon rope (fibre macro); "blood loss + shock" as a red falling curve.
- 633.6–660 The insight in x-ray/engineering style: forearm pinned, fulcrum point, lever arm,
  body-weight force arrow, torque `τ = r × F`, stress gradient concentrating to a break point; the
  knife only for soft tissue. "mathematically precise mechanics of survival". Tasteful, schematic.
- 660–672.7 Monumental statement beat — "one of the most extraordinary examples of human
  endurance… in the history of medicine and extreme sports": a big editorial typographic moment
  with depth (Fraunces / Unbounded), camera pulling back; music swell.
- 672.7–690.6 Tourniquet: the **sky-blue drinking tube** (motif payoff) wraps the forearm, a
  carabiner twisted as a windlass; artery diagram — flow stops; a red `MINUTES` warning.
- 691.4–717 The breaks, told through x-ray schematics + silhouette + sound: force arrow, dry crack,
  `RADIUS` fractures; breath; opposite direction, second crack, `ULNA`; the x-ray dims. → B5.
  No gore, no realistic wounds.
**Score:** 600–640 heroic minimal resolve (low pulse ostinato strings, ~100 bpm, D minor);
640–660 mechanical clockwork tension; 660–672 epic swell (brass-like, taiko); 672–690 tense
ticking + heartbeat; 690–717 horror stingers: ~60 ms clean silence before each crack, dry crack,
sub hit, ringing — restrained.

## S6 · 717.05 → 885.26 · "The Hardest Part & The Walk Out"
**Arc:** unbearable intensity → the nerve (white-hot) → FREE (the film's biggest release, HOUR
127) → alive but dying → the vertical drop → the burning march → voices, people, colour.
**Palettes:** black/red/white-hot, light burst, `bleach` midday, sky-blue tourists.
**Beats:**
- 717.2–731.8 Black → "THE HARDEST PART" type; the dull `2 IN` blade; tissue after six days without
  circulation as a schematic colour shift.
- 731.8–749.3 Layered anatomical cross-section as concentric rings (skin → muscle → tendon →
  nerve — echoing sandstone strata), each layer lighting up as progress; pliers for the tendons;
  sweating gritted face, handheld, heartbeat.
- 749.3–776.2 The nerve bundle as a glowing fibre cable; the signal path races to the brain; ZAP —
  white-hot electric lightning through a silhouette, frame inverts. Eyes shut, teeth clenched.
- 768.9–782.9 Stopwatch `1:05:00`; one final pull; silence → "He was free." → **HOUR 127** (the
  biggest typographic payoff), the sky slit tears wide open into light; epic release.
- 783.7–799 Wide: the boulder alone (the trapped hand only implied by shadow); Aron standing small,
  bandaged stump, bleeding, exhausted — ALIVE.
- 797–812 "Freedom did not mean rescue": body silhouette with blood level dropping to 75 % (−25 %),
  dehydration + shock gauges, a countdown.
- 812–838 The `65 FT` drop (vertical camera / scale vs a 6-storey building); rappel set up with one
  hand and teeth (macro of rope through the descender), Aron lowering himself (POSES.rappel).
- 838–859.8 `≈ 6 MI` across blinding open desert (`bleach`), heat shimmer, staggering steps,
  leaning on rocks, sun hammering; then sound-wave typography: voices.
- 859.8–885.3 The Meijer family (Eric, Monique, son) in sky-blue — their shock, his rasped request,
  water (blue bottle) and cookies; someone runs for a cell signal; phone searching. → B6.
**Score:** 717–782 sustained horror/thriller intensity (heartbeat accelerating, dissonant clusters,
electric zap at the nerve ~767, relentless pulse building); 782.9 massive release (choir/brass,
D major hope motif); 783–799 exhausted quiet; 799–838 determined tense-epic (low ostinato, taiko,
wind, ~90 bpm); 838–860 heat and dragging (slow heavy drum like staggering steps, shimmering drone,
desolate guitar twangs); 860–885 hope emerging (warm pads, gentle plucked guitar, glockenspiel).

## S7 · 885.26 → 1030.30 · "Rescue & The Lesson"
**Arc:** converging coincidence → rescue → sobering medicine → the world → the price → rebirth →
triumph → the son → the lesson → the note. **Palettes:** `rescue` blues, clinical whites, golden
hour, `winter`, `vision` gold for Leo, warm morning kitchen for the note.
**Beats:**
- 885.4–899.2 Parallel timelines converge: Donna (mother) on the phone pushing the police, a
  typewritten `MISSING PERSON` report, `6 DAYS`; aerial map with a search grid and helicopter paths
  circling the park.
- 899.2–911.4 3D Utah DPS-style helicopter (textured, no real insignia) over the canyon terrain,
  landing in a dust storm, Aron aboard.
- 911.4–917.5 "a few more hours…" — survival curve on a medical chart hitting zero just after the
  rescue time.
- 917.5–931.7 The story spreads: globe/news typographic collage; hero portrait — at a terrible price.
- 931.7–946.9 Recovering the boulder: hydraulic jacks and winches diagram, `660 LB`, `SEVERAL DAYS`;
  respectful mention of the hand (cremated — no imagery of it).
- 939.5–954 `6 MONTHS LATER`: same crevice in golden light, ashes drifting in a sunbeam — reborn.
- 953.6–974.2 Prosthetic exploded engineering view (ice-axe attachment); 3D winter mountain range,
  59 peaks lighting one by one (counter 0 → 59), altitude line `13,120 FT`.
- 974.2–982.2 Book + film: stylised book object and film strip (no real cover art), `127 HOURS` in
  Unbounded — the title finally spoken; "OSCAR-NOMINATED · DANNY BOYLE" small.
- 982.4–995 Callback to the S4 vision — now real: golden park, Aron with a prosthetic and his son
  `LEO · 2010`; celesta hope motif.
- 995–1007.3 "He no longer feels invulnerable": the S1 INVULNERABLE type cracks and falls away.
- 1007.3–1019.2 THE NOTE: kitchen table (callback to S1's blank card) — now handwritten in blue
  ink: route + "back by…"; then a perspective path to a flag and a rock drops onto it.
- 1019.2–1027.5 Knife and rope fall away; blue threads reconnect him to people (the S1 network,
  restored) — "the people who know where to look for you".
- 1027.5–1030.3 Final hold on the note, slow push, fade to warm black. (Optionally a tiny `127`.)
**Score:** 885–917 rising hopeful epic (helicopter rotor rhythm folded into drums, strings rising,
uplift at the landing; somber dip at the doctors' line); 917–953 bittersweet reflective (piano +
strings, soft choir and wind for the ashes); 953–982 triumphant energy (driving drums, guitars,
brass, the 59-peak counter on the beat, cinematic flourish for book/film); 982–995 tender celesta
/music-box hope motif (callback); 995–1030 the main motif on piano, calm and resonant; final chord
swells under the last line and rings out through the tail.

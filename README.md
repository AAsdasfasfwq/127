# 127 — motion-design documentary built in code

A 17-minute (1030.3 s) YouTube documentary about Aron Ralston's 127 hours in Blue John Canyon,
made entirely with code: Canvas 2D + Three.js (WebGL) + procedural textures + a cel-shaded
character rig + a procedural Web Audio score and sound design, laid under the supplied narration.
1920×1080 · 30 fps · H.264 + AAC, loudness-normalised for YouTube (−14 LUFS).

## Render the film

Requirements: **Node.js ≥ 18** and **ffmpeg** in your PATH.

```bash
npm install
```

```bash
node render.js
```

Result: `out/127_final.mp4`. The renderer:
1. starts a tiny local server and opens the film in headless Chrome (Puppeteer);
2. renders the procedural music + sound-design stem offline (Web Audio `OfflineAudioContext`)
   → `out/tmp/fx_music.wav`;
3. renders every frame (each frame is a pure function of time) in parallel browsers and pipes
   them into ffmpeg (x264);
4. mixes the voice-over on top of the music/SFX stem and normalises loudness.

Useful options:

```bash
node render.js --workers 6                 # more parallel browsers (≈ CPU cores / 2)
node render.js --gpu                       # use your GPU for WebGL (faster 3D shots)
node render.js --from 138.2 --to 302.25 --out out/part2.mp4   # render a time range
node render.js --resume                    # continue after an interruption (reuses finished chunks)
node render.js --png --crf 14              # lossless frame transfer, higher quality encode
node render.js --chrome "/path/to/chrome"  # use an installed Chrome instead of Puppeteer's
```

Rendering 30 909 frames takes roughly 1–3 hours depending on CPU/GPU and `--workers`.

## Preview in a browser

```bash
node tools/serve.js
```

Open the printed URL in Chrome: **space** play/pause (voice + score), **←/→** scrub, `,` `.`
step frames, `?t=SECONDS` jump, `?sections=s3` load a single section.

## How it is organised

| Path | What |
|---|---|
| `index.html`, `src/main.js` | the player / render page and its API (`__seek`, `__renderAudioWindow`) |
| `src/core/` | engine (timeline, compositor, transitions, post), typography, palette, procedural textures, 2.5D camera, Three.js glue, the Aron character rig, motifs, audio engine, synth orchestra, SFX |
| `src/sections/s1 … s7/` | the film, in seven time ranges (each built by its own agent) |
| `docs/ART_BIBLE.md` | the creative contract (motion language, colour story, type, characters, motifs, sound) |
| `docs/SECTIONS.md` | the director's treatment per section + boundary hand-off contracts |
| `docs/sections/sN.md` | each section's detailed beat map |
| `docs/SKILLS_DIGEST.md` | the motion/direction skill rules applied |
| `assets/` | narration (`voiceover.mp3`), word-timed script (`script.json`), fonts |
| `tools/` | QA: `snap.js` (stills/contact sheets), `check.js` (errors/gaps/speed), `audio.js` (stem loudness), `words.js` (timings) |

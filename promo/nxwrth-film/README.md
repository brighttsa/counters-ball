# NXWRTH × KONK! — promo cinematic

"KONK! has a sound." A ~30 second film, rendered live in the browser with the
game's own venues, caps and physics, cut to NXWRTH's beat. It sits beside
Codex's shorter reveal in `promo/nxwrth/`; the two share nothing but the track.

The Pages deploy copies `promo/`, so once pushed this viewer is reachable at
konk.world/promo/nxwrth-film/ (unlinked, `noindex`).

## Run

```bash
node scripts/dev-static-server-no-cache.mjs 4180
```

Open <http://localhost:4180/promo/nxwrth-film/> and press **Play**.

| Control | Key | |
|---|---|---|
| Play / Pause | Space | |
| Restart | R | |
| Scrub | ← → (one frame), Shift+← → (one second), or the slider | |
| Tag ↺ | G | Replays from 2 s before the "NORTH!!!" tag |
| Mute | M | |
| Fullscreen | F | |
| Capture | C (Esc leaves) | Hides controls and cursor, rewinds to zero; one click starts a clean take |
| Format | menu, or `?format=9:16` / `?format=1:1` | Titles stay inside a centred 16:9-shaped safe box |

`?capture=1` opens straight into capture mode.

## The soundtrack

The film looks for the lossless master first:

```
promo/nxwrth-film/audio/nxwrth-afro-rave35-155bpm-konk-world.wav
```

That file is git-ignored. Without it the film uses the game's web copy,
`assets/audio/afro-rave35-155bpm-konk-world.mp3`. Export from the WAV: an MP3
decodes with a few milliseconds of padding, which is fine for viewing but not
for a master.

## Timing: one file

Everything is derived in [`nxwrth-promo-timeline-config.js`](nxwrth-promo-timeline-config.js):

- `NXWRTH_TAG_TIME` — **track** seconds of the "NORTH!!!" producer tag. NXWRTH's
  name, lockup and cap never appear before it.
- `TRACK_DROP_TIME`, `BPM`, `TRACK_IN`, `MUSIC_START` — the other anchors.
- `MARK` — every cut point, expressed in bars and beats from those anchors.

**Tuning the tag by ear:** play, and press `T` at the instant you hear the tag,
or nudge with `[` and `]` (10 ms). The page reloads with `?tag=…` and prints the
value in the console; paste it into `NXWRTH_TAG_TIME` to keep it.

The current value (12.00 s) was found by analysis, not by listening: the two
halves of the bounce are sample-identical except for a one-beat dropout at
12.00–12.39 s, right before the drop. Confirm it by ear.

## How it is built

| File | Role |
|---|---|
| `nxwrth-promo-timeline-config.js` | Tempo, tag time, edit marks, palette |
| `promo-audio-master-clock-transport.js` | The audio context is the clock; play, pause, seek, mute, offline mix |
| `nxwrth-promo-director.js` | For any film time: shot, take, camera, lens, sound cues |
| `promo-shots-*.js` | The shot list (camera moves, sync points) |
| `promo-take-layouts-and-flicks.js`, `promo-recorded-physics-takes.js` | Flicks played through the game's physics and recorded, so any frame can be drawn exactly |
| `promo-title-and-graphic-cues.js` | The copy and when it appears |
| `promo-screen-graphics-cue-renderer.js`, `promo-ink-and-chalk-graphic-primitives.js` | Chalk, paint swipe, spray, cap-ring and tactics-board marks |
| `promo-hero-cap-geometry-and-painted-faces.js` | Film-resolution caps and ball; the printed NXWRTH cap |
| `promo-venue-stages-and-hero-caps.js` | Jamestown (bulb), kiosk (late afternoon), veranda (golden hour) |
| `promo-cinematic-post-processing.js` | Depth of field per shot, bloom, grain |
| `promo-foley-synth-recipes.js`, `promo-contact-dust-from-recorded-impacts.js` | Table sounds and dust, both derived from the recorded impacts |
| `nxwrth-promo-viewer-controls.js` | The viewer and its controls |

The film is a pure function of film time. Nothing uses `setTimeout`; the picture
asks the audio clock what time it is on every frame.

## Export a video file

Frame-exact, independent of machine speed. Needs the dev server, `ffmpeg`, and
Playwright from `promo-video/` (`npm i` there once).

```bash
node promo/nxwrth-film/capture/export-nxwrth-promo-film.mjs            # 16:9, 1920x1080, 60 fps
FORMAT=9:16 FPS=30 node promo/nxwrth-film/capture/export-nxwrth-promo-film.mjs
node promo/nxwrth-film/capture/export-nxwrth-promo-film.mjs stills 12.6 14.5
promo/nxwrth-film/capture/contact-sheet-of-stills.sh review 1.3 12.6 14.5 24.5
```

Output lands in `promo/nxwrth-film/capture/out/` (git-ignored).

## Known limits

- The tag time is measured, not heard (see above).
- Cameras are composed for 16:9. In 9:16 and 1:1 the lens widens to keep the same
  width of table in shot (top-down shots turn a quarter in 9:16), so subjects sit
  smaller in the frame; the shots are not individually re-composed.
- No motion blur: the game has none to reuse.
- The finger is implied by its shadow (an unseen caster under the bulb), not modelled.
- Reduced-motion preference removes flashes and camera shake.
- Rights: confirm NXWRTH's approval of his name on the cap before the film is published.

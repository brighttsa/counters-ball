# KONK! Has a Sound

Cinematic director at `/promo/nxwrth/`, published by owner request. It builds the actual
Roadside Showdown stage with the game's cap, paper-ball, matchstick-goal,
lighting, surface, and backdrop code. The existing shared renderer and
post-processing stack are reused; normal game entry and match lifecycle are
not changed.

## Master audio

The owner-approved Afro Rave 35 loads automatically from
`assets/audio/afro-rave35-155bpm-konk-world.mp3`. This 128 kbps web copy was
encoded from the WAV supplied on 2026-10-03 (74.338707 seconds). The original
WAV remains outside the repository. **Master Audio** optionally selects a local
replacement without uploading it.

The audio element is the film clock. Pause holds its playhead, resume continues
it, restart returns to the selected section start, and scrubbing seeks the same
playhead. The default producer-tag cue is **12.00 seconds** in the source file.
Change **NORTH!!! TAG** if the delivered master changes. **SECTION START** is an
absolute source time; the cue is converted to film-relative time. The reveal is
gated by that cue, including the printed cap face and end-card credit.

**BEAT ENTRY** defaults to 3.4 seconds in the source file. The soundtrack fades
up there so the opening has room for the wooden scrape, flick, and metallic cap
collision. Adjust it to fit the actual master. The brief's 27-second film length
can be adjusted from 25 to 30 seconds and short masters are clamped to their
available duration.

## Preview and capture

Load the audio, verify its tag against the displayed 12-second marker, then
press **PLAY FILM**. **SILENT PREVIEW** is for inspecting the shot timing and
the gated reveal without pretending to provide the music. The existing approved
KONK! wood-slide, hard-flick, and hard cap-to-cap samples score the physical
opening; no new audio files are created.

Select 16:9, 1:1, or 9:16 before **CAPTURE MODE**. Capture mode locks the render
canvas to 1920×1080, 1080×1080, or 1080×1920, hides director UI and enters
fullscreen where supported. To export a file, load the cleared master, press
**PLAY FILM**, then **RECORD** to download the browser-supported
MP4 or WebM capture. The recorder composites the WebGL frame with the crisp
typography layer and records that video alongside Web Audio, including physical
Foley cues. A browser without
`MediaRecorder` can use Capture Mode with its normal screen-capture tool.

The route is `noindex` and does not ship in a separate application bundle; this
static project deploy publishes it along with other repository routes. Treat it
as a private development/capture tool until access control is available.

## Limits to clear before release

- The owner supplied the soundtrack and specified the 12-second producer tag.
  Final editorial audio-quality review remains a listening check.
- Tag detection is intentionally manual; there is no speech recognition or
  guessed timestamp. Default source timestamp is 0:12 per owner direction.
- Browser recording format and frame pacing depend on the browser/GPU. Review
  the captured file's audio sync, codec, and frame pacing before publishing.
- No endorsement statement, quote, artist logo, or third-party mark is invented.

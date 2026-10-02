# KONKERS Community Campaign

An isolated, no-build ES-module campaign studio. No game files or global game
styles are loaded or changed by this page. The permanent address is
https://konk.world/social/; it does not depend on a running laptop server.

## Open the studio

```sh
NODE_PATH=/Users/bskt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node scripts/social/serve.mjs
```

The optional local service at http://localhost:4186/social/ adds custom MP4
rendering using Playwright, Google Chrome, system zip and Homebrew ffmpeg.
`SOCIAL_PORT` can select a different port. The hosted studio uses small, pinned,
MIT-licensed html-to-image and fflate libraries, vendored with their licenses.
Edited PNGs render in the browser; finished PNG/MP4 assets and ZIP packs are
direct downloads. No Node server is needed to open the studio or export PNGs.

Select any of 25 compositions, then a format. Edits save in this browser's local
storage. Headlines use one intentional line per textarea line. Palette swatches
set brand colorways; color inputs override ground/type/accent. Gameplay-led
templates accept a locally uploaded PNG/JPEG/WebP, up to 5 MB. The score template
has editable player names and goals; its 03–01 display is an example template,
not a claimed community result. Reset restores only the selected composition.

PNG exports include the current edit. Finished MP4s are available in their
exported formats; visual edits and additional MP4 formats require the optional
local service. The hosted studio disables those unsupported MP4 combinations
instead of returning old artwork. Collection and search filters
are available on desktop and mobile. Export collection downloads the matching
compositions in the selected format, plus captions, as a ZIP, even when only one
composition matches. Download
campaign data backs up all edits as JSON. Built-in data and captions live in
`data/campaign.js`. Motion editions are three-second silent editorial loops for
We Are Konkers, YƐ Konki and Our Game / Our Culture / Our Turn. Silent output
leaves room for the creator's chosen social audio rather than adding stock music.

## Ready-to-post exports

`exports/` contains 100 PNGs (25 compositions × 4 exact formats), 8 MP4s,
the editable campaign-copy snapshot and export manifest. `KONKERS-Campaign.zip`
contains all 25 compositions; `KONK-New-Features.zip` is the new 6-poster
pack (24 PNGs, 3 MP4s and captions). Still and animated exports use the same DOM, CSS,
fonts, imagery and deterministic fitting as the editor; PNG has no UI chrome.
Motion timing is frame-indexed at 30 FPS, not screen-recorded.

The feature campaign uses Ghanaian Pidgin. Voice chat has a dedicated
"VOICE CHAT / FINALLY DEY HERE." announcement with "Chale, see goal!" and
"You dey talk plenty." dialogue. Captions accurately explain optional,
private-room-only voice and the microphone permission step. The original
Twi-first wording remains unchanged. Copy should receive the owner's cultural
review before a social post is published.

After regenerating finished assets, `scripts/social/publish-studio.mjs` validates
their fingerprints, makes clean downloadable packs, removes machine-specific
paths from the public manifest and optionally copies the studio to a release
checkout. GitHub Pages explicitly includes `social/` in the runtime artifact.

Finished exports are reused when their visual configuration and source art
match. All eight existing motion files are ready to download without rendering
again. Edited motion or a new format still renders frame by frame, with visible
frame counts and an encoding stage. Starting an export restores the complete
still preview instead of leaving a half-built animation on screen.
Cache entries include source and configuration fingerprints; altered headlines,
colors, fonts, artwork or motion do not receive stale files. Normal render scripts
record these fingerprints automatically. `scripts/social/index-ready-exports.mjs`
is the one-time migration for the previously verified, unchanged export collection;
do not use it to bless outdated artwork after changing the poster sources.

Twi-first composition 19 preserves the supplied question, closing and caption
exactly. Opening/closing copy is editable in its dedicated inspector fields.
Its six-second motion sequence has a headline strike, cap-to-ball collision,
"ONE CLEAN KONK!" at impact, closing invitation, then KONK! and the URL end card.
Portrait and Story/Reel MP4s accompany four PNG sizes in `KONK-Twi-First.zip`.
Re-export that dedicated pack with `scripts/social/export-twi-first.mjs`.

```sh
# With the studio server running:
NODE_PATH=/Users/bskt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node scripts/social/export-collection.mjs
NODE_PATH=/Users/bskt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node scripts/social/check-studio.mjs
node --test tests/social-campaign.test.mjs
```

Source provenance: existing `assets/konk-logo.svg`, the project's bundled Anton
and Patrick Hand fonts, actual game venue captures, and clean Three.js renders
of the existing cap meshes and paper ball. No stock photography, invented Ghanaian
patterns, generated new brand mark or third-party artwork was introduced. Capture
script: `scripts/social/capture-brand-assets.mjs`, using the game at port 4181.
Source images are campaign-only derivatives, not new game runtime assets.

## New Features

Compositions 20–25 promote private shared-link rooms, four-player knockout,
Find a Rival, optional private-room Table Talk, optional KONKER profiles and
upcoming earned special moves. All reuse the original cap renders, logo, fonts
and venue images. Friend invites, knockout and voice have four-second silent
portrait motion editions. No generated voices or new music were added.

Copy distinguishes current functionality from planned releases: special moves
are labelled Coming Next; profiles do not claim cloud progress sync; voice
does not claim public-rival access and microphone capture remains opt-in.
Edit the collection in `data/feature-campaign.js`. Rendering and motion are
shared in `components/feature-art.js`, `templates/features.css` and
`motion/feature-motion.js`. Re-export only the new pack with:

```sh
NODE_PATH=/Users/bskt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node scripts/social/export-new-features.mjs
node scripts/social/verify-feature-export-api.mjs
```

Verification: 76 exact-size PNG checks, four-format visual contact sheets,
desktop/mobile overflow checks, and browser-driven download/persistence/reset
checks. Edited native-size preview and PNG agree within one 8-bit color rounding
step on rotated images; text and layout are unchanged. Run
`scripts/social/verify-download-and-preview.mjs` with the same NODE_PATH for the
browser download checks.

The supplied Twi copy is preserved, including Ɛ and ɛ. Story type is kept out of
the top/bottom platform overlay regions. Layouts intentionally recompose for
landscape rather than crop a portrait poster. Real user-generated photos/clips
and personal information require permission before posting.

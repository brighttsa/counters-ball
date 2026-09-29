# 06. Proposed Audio Architecture

This proposal evolves the existing Web Audio system; it does not require a game
rewrite or change physics outcomes.

## Central manager

Replace `ProceduralSoundBoard` as the public facade with one `AudioManager` while
retaining procedural synthesis as a fallback provider.

```text
AudioManager
├── AudioAssetStore          fetch, decode, cache, unload, memory accounting
├── VariationSelector       weighted shuffle-bag, no immediate repeat
├── PhysicsAudioController  flick, impacts, motion state, surfaces, priorities
├── GoalAudioDirector       context-aware goal/near-miss/win sequences
├── VenueAudioController    package load, bed, distance-tier scheduler, acoustics
├── UiAudioController       navigate/select/back/locked/unlock/start
├── DynamicMixController    focus and event ducking, camera perspective
├── SoundtrackDirector      existing owner recordings and loop system
└── AudioDebugController    opt-in instrumentation and audition commands
```

Callers continue to send semantic events. They must not know filenames.

```js
audio.play('physics.capCap', {
  strength,
  approachSpeed,
  angle,
  position: { x, z },
  surface: level.surface.kind,
});
```

## Bus graph and nominal headroom

```text
physicsGain      -4 dB ┐
eventGain        -5 dB ├─ sfxGain -2 dB ┐
uiGain           -8 dB ┘                 │
voiceGain       -10 dB ┐                 ├─ masterGain -3 dB ─ limiter ─ output
environmentGain -13 dB ├─ ambienceGain   │
bedGain         -18 dB ┘                 │
musicGain       -14 dB ──────────────────┘
```

These are starting points, not promises. Use per-family loudness normalization and
true-peak checks; do not normalize every asset to the same perceived loudness.
Keep at least 6 dB of practical mix headroom before the final safety limiter.

Priority classes are: player action 100, critical collision 90, goal/event 85,
UI 70, reaction 60, environment event 35, bed 20, music 10. Voice stealing should
drop the oldest lowest-priority source first, never the current flick or goal post.

## Asset packages

### Core package

Preload after audio unlock and before a match becomes interactive:

- Flick light/medium/hard winners.
- Cap-cap and cap-ball winners.
- Post and rail winners.
- One short movement, wobble and settle set for the selected surface.
- Essential UI and goal reward sounds.

### Level package

Begin loading from the level preview/intro:

- Venue bed and environmental one-shots.
- Remaining movement lengths for its surface.
- Venue mechanism sounds and Street Legends intro where applicable.
- Optional local reaction subset if a venue-specific perspective is approved.

Keep shared surface packages reference-counted. Leaving Roadside must not unload
wood while entering Veranda. Abort obsolete fetches and release decoded buffers
only when no active voice or package references them.

Deploy edited audio as compressed files appropriate to browser support, while
retaining WAV masters outside runtime assets. Prefer one modern codec plus a tested
fallback only if device coverage requires it. Measure real decoded memory and first
match latency before deciding the final codec/bitrate.

## Variation engine

Each family defines weighted variants, strength range, gain range, pitch range,
cooldown, polyphony and priority. Selection uses a shuffled bag with history:

- Never repeat the previous sample when at least two alternatives are eligible.
- Penalize either of the last two samples rather than strict round-robin order.
- Map strength continuously inside light/medium/hard overlap zones to avoid audible
  threshold steps.
- Keep pitch variation at roughly ±1.5% for metal impacts and ±2.5% for textured
  movement. Human reactions and signature sounds receive no random pitch shift.
- Vary gain within about ±1 dB after velocity mapping.
- Treat hard-contact layers as authored components of a family, not a universal
  extra thump.

## Physics and movement model

Use existing impulse-derived approach strength for impacts. Add collision angle and
relative velocity to event payloads. Route by the actual pair:

```text
cap + cap      -> capCap
cap + ball     -> capBall
ball + post    -> ballPost
ball/cap + rail-> objectRail
object + venue -> ruler/dish/pot/boom/coin/bottle family
```

Motion audio is an event state machine per cap, not a loop tied directly to speed:

```text
silent -> launch -> intermittent slide/spin grains -> wobble candidate -> settle
```

- Start a movement grain only after a speed threshold and random refractory gap.
- Choose short/long based on estimated remaining kinetic energy.
- Gain and brightness follow speed, while surface controls texture.
- Until rotational physics exists, derive spin likelihood from collision offset,
  visual cap tilt/rotation, and lateral-to-forward velocity; expose it as an
  explicitly approximate value in debug mode.
- Arm wobble only below the slide threshold and suppress it if another collision
  occurs. Fire one settle when the body crosses to rest.
- Enforce a small global movement voice budget so six moving caps never become a
  continuous scrape wash.

## Goal and reaction director

The goal director receives scorer, score, match winner state, post contact history,
collision count, speed, Street Legends label and replay eligibility. It schedules:

```text
last physical contact
optional post ping
50-150 ms breathing space
net/goal-frame detail
reaction selected by significance
short reward accent
smooth return of ambience/music
```

Ordinary goals remain under two seconds. Great/ricochet goals can delay the reaction
slightly. Match winners receive the fullest small-group reaction. Opponent goals use
a neutral/smaller local response. Near misses only receive a human reaction when the
shot speed, distance to mouth and match context justify it.

## Venue scheduler and acoustics

Replace independent `setTimeout` loops with a scheduler updated by pausable game
time. Each venue defines:

- `bed`: one stable low-detail loop.
- `distant`: broad events with long cooldowns.
- `mid`: visible/implied activity.
- `close`: rare signature events.
- probability, min/max cooldown, quiet-window rules and anti-repeat history.

Only one close signature may run at once. After a goal, reserve a short quiet window
before ambience punctuation returns. Use stereo pan or `PannerNode` only when the
source has a meaningful world position. Acoustics should be short convolution or a
tiny early-reflection network on a low wet send:

- Schoolyard: almost dry/open.
- Kiosk: bright short metal reflection.
- Veranda: short courtyard reflection.
- Roadside: broad exterior, minimal reflection.
- Harmattan: dry and absorption-heavy.
- Lights Out: intimate short kiosk/quay reflection.

## Camera perspective

Interpolate bus sends over 250-400 ms when camera mode changes:

| Camera | Physics | Environment | Reactions | Spatial behavior |
|---|---:|---:|---:|---|
| Tactical | Reference | -2 dB | -2 dB | Narrower pan for clarity. |
| Broadcast | -1 dB | Reference | +1 dB | Wider ambience, normal contact pan. |
| Street | +2 dB movement detail | +1 dB close events | Reference | Strongest near-field scrape/spin detail. |
| Free | Distance-aware | Distance-aware | Reference | Listener follows camera, with bounded attenuation. |

Never switch filters or levels instantly.

## Dynamic mixing

- **Aim:** reduce environment events 1.5-2 dB; leave the bed largely intact.
- **Flick:** dip bed/environment by 2-3 dB for 80-140 ms around the transient.
- **Hard collision/post:** momentary 1-2 dB competing-SFX duck.
- **Goal:** ambience down 3-5 dB, music down about 6 dB, then staged recovery.
- **Major reaction:** enforce reaction polyphony and lower the bed, never stack all
  celebration variants.
- Smooth every automation with scheduled ramps/targets and cancel prior automation
  before scheduling a new envelope.

## Preferences and compatibility

Preserve all-sound mute, music level and effects off. Add no mandatory settings.
Internally separate UI, reactions and ambience so future accessibility controls can
be added without graph changes. On decode/fetch failure, log once and use procedural
fallbacks; gameplay must remain functional and audible where possible.

## Developer audio mode

Enable only through a development query flag or console API, never normal menus.

```text
?audioDebug=1
window.__countersBall.audioDebug
```

Display current semantic event, chosen asset, variation history, strength/velocity,
surface, gain, pan/distance, active venue/bed, active voice counts by bus, ducking,
loaded package memory and recent rejected events. Provide audition controls grouped
by Flick, Collisions, Movement, UI, Reactions, Venue and Mix. Include stop-all and
music-off toggles. Debug playback must use the real manager and priorities.

# 07. Staged Implementation Plan

No implementation pass begins until the manifest is approved and its required
assets are supplied.

## Pass 1 - Audit and manifest

**This packet.** Owner approves scope, prompt language, human-reaction policy and
proof-batch list. No audio replacement.

Exit criteria: six venues accurately mapped; current/missing events agreed; proof
batch authorized.

## Pass 2 - Core flick and collision Foley

Build `AudioManager`, asset store, variation selector and buses behind the existing
public calls. Integrate approved flick, cap-cap, cap-ball, post and rail winners.
Keep procedural fallbacks.

Verification: syntax/tests, audio unlock on iOS, no load-time regression, impulse
mapping sweep, 100 repeated collisions with no consecutive duplicate, music-off
blind comparison, no clipping.

## Pass 3 - Movement and surfaces

Add motion state controller, three surface packages, global movement voice budget,
wobble and settle. Do not alter physics.

Verification: slow/medium/fast shots on all surface types, pause/replay/restart
cleanup, six-cap stress, silent resting table, dusty card clearly shorter/rougher
than clean card, wood identifiable without venue visuals.

## Pass 4 - Goals and human reactions

Add goal/near-miss director and approved nonverbal pools. Map ordinary, skill,
ricochet and match-winning context. Preserve replay timing.

Verification: goals with/without post, both scorers, winner/loser/draw/tiebreak,
rapid goals, replay capture audio, no celebration stack, music entirely off.

## Pass 5 - Level ambience

Add package loading, six beds, distance-tier scheduler, quiet windows, signatures
and subtle acoustic sends. Replace scheduler pause-loss behavior.

Verification: identify venue from audio-only randomized test, 20-minute loop and
repetition review per venue, pause/background recovery, package unload/re-entry,
network/offline package failure fallback.

## Pass 6 - UI and Street Legends

Replace generic cardboard UI with cap-world navigation/select/back/locked/unlock
and match-start families. Integrate six entrances and six mechanism families.

Verification: pointer, touch and keyboard navigation; pause/resume; locked/unlock;
all 18 acts; normal campaign remains free of Legends stings; no UI sound spam.

## Pass 7 - Dynamic mix, spatialization and camera

Add focus ducking, priorities, mode interpolation and bounded free-camera listener.

Verification: rapid camera switching without audible steps, aim/flick/goal envelopes,
voice stealing under stress, mono phone speaker, headphones, Bluetooth latency and
iOS interruption recovery.

## Pass 8 - Final mix and QA

Tune on calibrated headphones, laptop speakers and at least one physical iPhone.
Test every venue and primary mode with music off, then reintroduce music below the
physical world. Run a 20-minute fatigue session and a cold-load/offline session.

Final acceptance questions:

- Light, medium and power flicks are recognizable without looking.
- Cap-cap, cap-ball, post and rail cannot be confused.
- Clean card, dusty card and wood are identifiable.
- Motion loses energy naturally and ends in silence.
- Post and goal reactions create payoff without oversized sound.
- Every venue is identifiable from ambience alone above chance.
- Repeated events do not reveal a sampler pattern.
- UI belongs to the same bottle-cap world.
- No sound becomes irritating over 20 minutes.
- The complete game remains compelling with music at zero.

## Change-control gate

Each pass lands as a focused change with tests and an owner-listening checkpoint.
Do not delete procedural fallbacks or old mappings in the same commit that first
introduces new assets. Remove temporary systems only after the replacement passes
the relevant exit criteria.

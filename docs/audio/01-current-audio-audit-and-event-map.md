# 01. Current Audio Audit and Event Map

Audit date: 2026-09-29. Scope: the current `main` source tree at `22420c9`.

## Executive assessment

KONK! already has a disciplined procedural Web Audio foundation, semantic event
names, bounded voices, screen-space panning, separate music control, venue beds,
and randomized environmental events. It does **not** yet deliver the requested
close-miked material realism. Almost all effects and ambience are oscillators and
filtered noise. Motion has no audio lifecycle, most object/material distinctions
collapse into a few recipes, goals are whistle-plus-net rather than a responsive
sequence, UI has only three generic families, and there are no human-reaction
assets in the current tree.

The three owner-recorded soundtrack files deserve to survive the audit. They are
the only deployed sample assets and already have robust loading, loop repair,
crossfades, independent volume, and goal ducking. They should remain optional and
sit below the new physical world.

## Existing assets

| Existing file | Current role | Audit decision |
|---|---|---|
| `assets/audio/konk-home-theme-three-contact-motif.mp3` | Home/menu loop | Keep; re-mix after Foley exists. |
| `assets/audio/konk-classic-match-found-object-groove.mp3` | Classic, Versus, Practice and Daily play | Keep; re-mix and test music-off parity. |
| `assets/audio/konk-street-legends-bottle-cap-challenge.mp3` | Street Legends play | Keep; re-mix and test music-off parity. |

The handoff board records four earlier `kids-*.mp3` clips, but those files and a
`kidsReact` implementation are absent from the audited tree. They are therefore
not counted as current assets. Their provenance and licence must be revalidated
before reuse.

## Existing implementation

### Signal path

- `ProceduralSoundBoard` creates one effects `master` gain at `0.9`, one `uiBus`,
  one dynamics compressor, and a one-second reusable noise buffer.
- Physics, semantic cues, ambience, venue one-shots and the momentum layer share
  the effects master. UI bypasses pause through `uiBus` but shares the compressor.
- Music has its own level and dip gains and connects directly to the destination.
- Effects use a global 32-source cap. Sources disconnect on completion.
- Contact pan is derived from camera projection and clamped to a restrained field.
- Pause fades effects in 120 ms, leaves UI active, and dips music by about 6 dB.
- Hidden tabs fade, low-pass, then suspend the audio context.
- iOS requests `navigator.audioSession.type = 'playback'` where available.

### Sample and loading behavior

- No gameplay, UI or ambience sample buffers are loaded today.
- Music is fetched lazily, decoded at 32 kHz, loop-seam repaired, and cached with a
  two-buffer limit. The home track is prefetched; match tracks are warmed.
- There is no core/level audio package distinction, manifest loader, decode queue,
  sample memory budget, or level-package disposal.

### Variation and dynamics

- Procedural noise offsets, oscillator jitter and randomized frequencies make hits
  non-identical, but there are no recorded variation pools or immediate-repeat
  protection.
- Strength affects gain, brightness and some duration. It does not choose authored
  light/medium/hard performances.
- Cooldowns range from 28 ms for contacts to 500 ms for whoosh.
- The ambience bed rises by up to 35% with match heat and falls to 60% under late
  tension. Music alone ducks for a goal. There is no transient-aware sidechain or
  priority allocator.

## Current sound families

| Family | Current construction | Finding |
|---|---|---|
| Flick | High-passed noise, descending low tone, band-passed scrape | Good parameter hook; lacks finger/cap/body/surface performance variation. |
| Cap-cap | Three inharmonic tones plus noise | Readable but synthetic; surface argument incorrectly changes the cap itself. |
| Cap-ball | Filtered noise, low body tone, procedural paper crinkle | Correctly softer than cap-cap; needs close paper-ball Foley. |
| Ball/object | Routes to cap, wood, stone or glass recipe | Useful object-kind routing, incomplete material coverage. |
| Rail/wall | `woodKnock`, adjusted for table surface | Rail material is not independently represented. |
| Post | Also `woodKnock` | No recognizable narrow post ping. |
| Net | Low-passed noise and muted tone | Useful shape; can remain as a temporary fallback. |
| Whistle | Two synthetic pea-whistle phrases | Distinct but dominates every goal and full-time event. |
| Near miss | 300 ms filtered-noise rise | Generic whoosh; no ball pass or human response. |
| Slow motion | 500 ms noise sweep | Presentation effect rather than physical sound; use sparingly. |
| Semantic cues | Bottles, coins, table knocks, cardboard | Coherent found-object intent, but several cues feel tonal rather than physical. |
| UI | Cardboard tap, louder cardboard tap, dull lock | Only navigate/select/locked; no back, unlock, pause or resume identity. |
| Momentum | Low synthetic pulses and a 110 Hz tension drone | Potential fatigue and masks small Foley; remove or radically reduce in music-off QA. |
| Ambience bed | Filtered looping noise per venue | Cheap and stable, but cannot identify a real place unaided. |
| Ambient events | Procedural birds, dogs, horns, vehicles, impacts, insects, wind | Random timing exists; no distance tiers, probability, anti-repeat or source position. |

## Technical issues found

1. The ambient scheduler returns when a timer fires while paused and does not
   reschedule that event. After a pause, one or more venue event families can
   silently disappear until the venue is reset.
2. Venue events use wall-clock `setTimeout`, unlike pausable match events.
3. Physics provides linear velocity and contact impulse, but audio receives no
   angular velocity because bodies do not model rotation. Spin/wobble must initially
   derive from visual angular state or a new lightweight rotational proxy.
4. `hardContact` can layer over the ordinary collision for every strength above
   `0.6`, creating a generic low hit on top of material-specific contact.
5. Post, rail, ruler, toll boom and several venue mechanisms reuse `woodKnock`.
6. Goal celebration does not distinguish ordinary, high-skill, ricochet or winner.
7. Defeat has a semantic cue in source, though historical notes say a loss groan
   was removed. It needs an intentional, restrained final decision.
8. Camera modes alter visuals only; audio perspective is unchanged.
9. There is no developer audio inspector or isolated family audition path.

## 02. Audio event map

Status keys: **Present**, **Partial**, **Missing**, **N/A**.

| Player-facing event | Trigger/data available | Current result | Status | Required direction |
|---|---|---|---|---|
| Finger contact | Flick release, normalized power | Part of procedural flick | Partial | Dry fingertip layer with five authored performances per tier. |
| Cap launch | Same flick trigger | Metal-ish attack and low tone | Partial | Cap attack/body, surface onset and optional fast motion layer. |
| Cap sliding | Per-frame body velocity available | None | Missing | Thresholded one-shots by surface and speed; no permanent loop. |
| Cap spinning | No physical angular velocity | Visual motion only | Missing | Add a derived rotational proxy before authoring triggers. |
| Cap wobbling | Rest transition available; no rotation data | None | Missing | Trigger sparingly in the final low-energy phase. |
| Cap settling | `allBodiesResting()` boundary | None | Missing | Tiny material-specific terminal tick. |
| Cap-cap collision | Impulse, position, surface | Procedural clink | Present | Replace with velocity-tiered variation pools. |
| Cap-ball collision | Impulse, position, surface | Procedural papery tap | Present | Replace with rounder paper-ball pools; preserve strength mapping. |
| Ball movement | Ball velocity each frame | None | Missing | Very quiet intermittent roll/skitter only above threshold. |
| Ball-post collision | Object kind and impulse | Generic wood knock | Partial | Dedicated bright post ping, four light and four hard performances. |
| Ball-wall collision | Wall impulse and position | Generic wood/cardboard knock | Partial | Independent rail material family, not table-surface substitution. |
| Goal | Goal side, score, skill/venue label, match state | Net, whistle, music duck | Partial | Shot/contact/post context, 50-150 ms space, reaction tier, reward accent. |
| Near miss | Slow-motion candidate resolving without goal | Noise whoosh, HUD callout | Partial | Ball pass/post outcome plus optional local `OHH`, significance-aware. |
| Turn change | Side and elapsed pace | Soft table knock | Present | Muted cap placement/tick; suppress when pace would make it noisy. |
| Invalid move | Input rejects control; denied venue goal separately | Usually silence; clay-pot denial knocks | Partial | One restrained dead-cap cue only for meaningful rejection. |
| Countdown | No countdown system | None | N/A | Do not add unless gameplay adds a countdown. |
| Match start | First turn | Two procedural knocks; kickoff whistle elsewhere | Present | Physical `tik, tik-tik, pause, KONK` family, three variants. |
| Halftime/round transition | No halftime system | None | N/A | Do not invent. Tiebreak remains a game-state event. |
| Tiebreak/golden flick | Rules event | Match-point knock cue | Partial | Tension response, no oversized stinger. |
| Victory | Match end and winner | Bottle-note rise plus coin ring | Present | Human reaction tier plus compact bottle-cap reward. |
| Defeat | Match end and winner | Deep table thump | Present | Restrained nearby disappointment; avoid humiliation. |
| Retry/rematch | Menu action only | Ordinary UI tick/select | Partial | Back/reset physical cue; no special fanfare. |
| Street Legends turn mechanic | Every mechanic advances | Same wood knock for all venues | Partial | Ruler, enamel dish, clay pot, toll boom, lorry and coin stack each differ. |
| Street Legends impact | Kind data for most static objects | Mostly wood/stone/glass reuse | Partial | Material-specific mechanic pools. |
| Street Legends level entry | Screen transition and match start exist | Paper flip plus normal start | Partial | Six venue intros, 1-2 s, reused across the three acts of each venue. |
| Street Legends challenge complete | Goal label/result available | Goal and generic win | Partial | Rare heightened tactile accent keyed to achievement. |
| Menu navigation | Any pressed non-primary control | Cardboard tap | Present | Muted metal tick, four variants. |
| Hover/focus | No hover/focus event hook | None | Missing | Desktop/keyboard only; quiet and rate-limited. |
| Select | Primary pressed control | Louder cardboard tap | Present | Clean cap tap, four variants. |
| Back | Action exists; no semantic sound | Generic tick | Partial | Soft scrape plus muted tick, three variants. |
| Locked content | Locked preview/button | Dull synthetic contact | Present | Dead cap contact, three variants. |
| Unlock | Star/progression callbacks | Bottle star dings | Partial | Cap spin-to-KONK sequence, three variants. |
| Pause | Pause action | Button feedback plus bus fade | Partial | Short physical close/latch; preserve smooth mix transition. |
| Resume | Resume action | Button feedback plus bus rise | Partial | Complementary release tick, not a replay of pause. |
| Level entry | Screen transition, prepared level | Paper flip | Partial | Venue signature and short tactile identity. |
| Ambience bed | Level backdrop | Six procedural noise profiles | Present | Six recorded/generated low-information beds. |
| Environmental one-shots | Venue scheduler | 2-3 procedural recipes per venue | Present | Layered distance pools tied to visible/implied sources. |
| Human reactions | Goal/near miss/win significance available | None in current tree | Missing | Small local groups, sparse and culturally neutral unless authentic recordings supplied. |
| Existing music | Screen/mode state | Three owner tracks | Present | Keep optional; rebalance after physical mix. |

## Survival decisions

**Keep:** audio unlock/resume behavior, bounded cleanup, semantic event entry point,
screen pan concept, music director and all three soundtrack recordings, mute and
volume persistence, goal-music duck, procedural fallback capability.

**Refactor:** bus topology, variation selection, ambience scheduling, collision
routing, goal orchestration, camera perspective, voice priorities and level loads.

**Replace after approval:** the audible flick, major collisions, movement,
venue ambience, UI family, reactions and one-size-fits-all Street Legends knocks.

**Remove only after replacements pass QA:** hard-contact overlay, momentum drone,
synthetic environmental imitations and generic post/wall mappings.

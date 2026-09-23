# KONK! — Bottle-Cap Football

(Working title and repository name: Counters Ball 3D.)

A browser game of Ghanaian tabletop football. Flattened bottle caps are the
players, a crumpled paper wad is the ball, the pitch is chalk on cardboard and
the goals are matchsticks — flicked across six street venues, from a schoolyard
at midday to a Jamestown table under a single bulb.

No build step. Every texture, sound and sprite in play is generated in the
browser. The only images are the brand files in `assets/` (logo, favicon,
home-screen icon, link preview), exported from the SVG source in
`plans/visuals/konk-brand-identity.html` by
`node plans/visuals/konk-brand/build-konk-brand-assets.mjs`.

## Run

```bash
python3 -m http.server 4180 --directory "/Users/bskt/Counters ball"
```

Then open http://localhost:4180 (needs internet: Three.js r160 loads from a CDN).

## Play

- **Campaign** — six pitches, each with a neighbourhood opponent. Win a pitch to
  unlock the next. Earn up to three stars per pitch: win · clean sheet · win
  within the flick budget. Progress is saved in your browser.
- **2-Player Table** — hot-seat on any pitch, no AI.
- Hover a cap of your colour, press and **drag back** — a curved trajectory and
  a power ring show direction and strength — then release to flick.
- Knock the ball between the matchsticks to score. Each side gets a limited
  number of flicks; most goals when they run out wins.
- `Esc` pauses. Input is single-pointer by design (turn-based game).

## The venues

| # | Venue | Table | Light | Twist |
|---|---|---|---|---|
| 1 | Schoolyard Break | cardboard | midday | tutorial, first to 1 |
| 2 | Kiosk Corner | cardboard | late afternoon | first to 2 |
| 3 | Veranda Derby | plywood | golden hour | pebbles on the table |
| 4 | Roadside Showdown | plywood | late afternoon | bottle + coin stacks |
| 5 | Harmattan Haze | dusty cardboard | harmattan | heavy dust, caps drag |
| 6 | Lights Out Final | school desk | night bulb | bottles, and the champion |

## How it is built

| Folder | What lives there |
|---|---|
| `src/core/` | Dimensions, seeded RNG, save data, hit-stop/slow-motion clock |
| `src/levels/` | The six venue definitions, teams and rules |
| `src/scene/` | Lighting presets, table surfaces, chalk, caps, ball, goals, obstacles, backdrops, stage build/dispose |
| `src/gameplay/` | Physics, match rules, aim visuals, human input, AI planner + performer, session runtime |
| `src/fx/` | Camera director, juice springs, particles, post-processing |
| `src/audio/` | Procedural sound effects and ambience beds |
| `src/ui/` | Menu screens and match HUD |
| `styles/`, `assets/` | Interface CSS, logo and favicon |

The AI plans by rehearsal: it clones the physics table, simulates candidate
flicks to rest and scores the outcomes, so it understands rebounds, obstacles
and bank shots without any special-casing. Difficulty is the search budget plus
human-like aiming error.

See [docs/design-guidelines.md](docs/design-guidelines.md) for the art and
motion bible, and [plans/](plans/) for implementation plans.

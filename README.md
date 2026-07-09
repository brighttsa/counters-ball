# Counters Ball 3D

A web-based 3D visual-direction prototype for a Ghanaian tabletop football
game. Flattened bottle caps are the players, a crumpled paper wad is the ball,
the pitch is chalk on cardboard, and the goals are matchsticks — played with a
single flick, in warm late-afternoon street light.

## Run

No build step. Serve the folder statically and open it:

```bash
python3 -m http.server 4173 --directory "/Users/bskt/Counters ball"
# then open http://localhost:4173
```

Requires internet access (Three.js r160 loads from the jsDelivr CDN).

## Play

- Red flicks first. Drag one of your caps **back** (slingshot) — a curved
  trajectory line shows direction and power, the cap's rim glows.
- Release to flick. Caps slide with weight; the ball skims and caroms.
- Knock the ball between the matchsticks to score: camera push-in, screen
  shake, bloom swell, **GOOOAL!** banner, then kickoff for the conceding team.
- Turns alternate after each play resolves.

Input is single-pointer by design: the game is turn-based, so only one drag can
be live at a time and a second touch is ignored.

## Structure

Everything is procedural — zero image assets. See
[docs/design-guidelines.md](docs/design-guidelines.md) for the full art bible
and [plans/](plans/) for the implementation plan.

| File | Purpose |
|---|---|
| `src/main.js` | Bootstrap, game loop, turn/goal state |
| `src/scene-and-lighting-setup.js` | Renderer, 45° camera, warm sun |
| `src/cardboard-pitch-surface.js` | Cardboard texture, table, battens |
| `src/chalk-pitch-markings.js` | Hand-wobbly chalk lines |
| `src/bottle-cap-players.js` | Cap geometry + worn team textures |
| `src/match-ball-and-goal-posts.js` | Paper ball, matchstick goals |
| `src/street-background-environment.js` | Blurred street, dust, sun glow |
| `src/flick-physics-engine.js` | 2D circle physics, goals |
| `src/aim-input-controls.js` | Drag aim, trajectory, rim glow |
| `src/post-processing-and-celebration.js` | Bloom, grain, goal celebration |

# Counters Ball 3D — Visual Direction Prototype

## Overview
Web-based playable art-direction prototype for a Ghanaian tabletop football game.
Bottle-cap players on a hand-drawn cardboard pitch, flicked to strike a paper ball.
Deliverable: running Three.js scene embodying the full brief + art-direction doc.

## Status
- [x] Phase 1 — Project scaffold (index.html, import map, static serve)
- [x] Phase 2 — Scene, camera (45° tilt), warm late-afternoon lighting, shadows
- [x] Phase 3 — Cardboard pitch surface + hand-wobbly chalk markings (procedural canvas textures)
- [x] Phase 4 — Bottle-cap teams (scalloped rims, worn paint, rust, scratches), paper ball, matchstick goals
- [x] Phase 5 — Street background environment (blurred Ghana street color planes, dust motes, warm fog)
- [x] Phase 6 — Flick physics (custom 2D circle solver: friction, restitution, walls, goal mouths, static posts)
- [x] Phase 7 — Aim input (drag-to-flick, curved trajectory line, rim glow)
- [x] Phase 8 — Post-processing (bloom, 35mm grain, vignette, dust haze) + goal celebration (push-in, shake, bloom pulse)
- [x] Phase 9 — UI overlay (score, turn indicator, GOAL banner), verify in browser
- [x] Phase 10 — Review + docs (visual-direction art bible)

## Key decisions
- No build step: ES modules + import map, Three.js r160 from CDN, served statically.
- Custom lightweight 2D physics (KISS) — no physics lib needed for circles on a plane.
- All textures procedural (canvas 2D) — zero binary assets, everything tweakable in code.
- Fake DOF: pre-blurred background textures + warm fog (true DOF pass too costly for web).
- Teams: faded red w/ white star vs faded green w/ gold mark (Ghana palette, no real brands).

## Architecture
```
index.html            UI overlay + import map
src/
  main.js                            bootstrap, game loop, turn/goal state
  scene-and-lighting-setup.js        renderer, 45° camera, warm sun + shadows
  cardboard-pitch-surface.js         procedural cardboard texture, table build
  chalk-pitch-markings.js            wobbly hand-drawn chalk lines onto ctx
  bottle-cap-players.js              cap geometry + per-team worn textures
  match-ball-and-goal-posts.js       paper ball, matchstick goals
  street-background-environment.js   blurred street planes, dust motes, fog
  flick-physics-engine.js            2D circle physics, goals, static posts
  aim-input-controls.js              raycast select, drag aim, trajectory, glow
  post-processing-and-celebration.js bloom + grain shader + goal celebration
```

## Success criteria
- Loads with no console errors; renders warm nostalgic tabletop scene at 45°.
- Drag a cap → curved trajectory + rim glow; release → cap slides, ball reacts.
- Ball into goal mouth → score, camera push-in, shake, bloom pulse, banner.
- Film grain/vignette/haze visible but subtle; shadows long and soft-edged.

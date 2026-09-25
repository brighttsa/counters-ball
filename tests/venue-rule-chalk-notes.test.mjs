import test from 'node:test';
import assert from 'node:assert/strict';
import { FlickPhysicsEngine } from './helpers/real-three-session-fixture.mjs';
const { RulerSeesaws } = await import('../src/gameplay/ruler-seesaw-state.js');
const { ChangeDishes, COVER_ANGLES, DISH_SPAN } = await import('../src/gameplay/change-dish-state.js');
const { ClayPotMaze } = await import('../src/gameplay/clay-pot-maze-state.js');
const { TollGateLaneSignals, LANES } = await import('../src/gameplay/toll-gate-lane-signal-state.js');
const { DepartingLorryGoals } = await import('../src/gameplay/departing-lorry-goal-state.js');
const { CoinStackChains } = await import('../src/gameplay/coin-stack-chain-state.js');
const { PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } = await import('../src/core/pitch-dimensions-and-constants.js');

const attached = (State) => { const state = new State(); state.attach?.(new FlickPhysicsEngine()); return state; };

test('every venue chalks symbolic cues on the pitch, not literal rule labels', () => {
  for (const State of [RulerSeesaws, ChangeDishes, ClayPotMaze, TollGateLaneSignals, DepartingLorryGoals, CoinStackChains]) {
    const notes = attached(State).chalkNotes();
    assert.ok(notes.length >= 1 && notes.length <= 4, `${State.name}: ${notes.length} notes`);
    for (const note of notes) {
      const label = note.text ?? note.icon;
      assert.ok(Math.abs(note.x) < PITCH_HALF_LENGTH && Math.abs(note.z) < PITCH_HALF_WIDTH, `${State.name} "${label}" at ${note.x}, ${note.z}`);
      assert.ok(note.icon || note.text.length <= 18, `${State.name} "${label}" is compact`);
      assert.doesNotMatch(label, /LEFT|RIGHT|NO STRAIGHT|SHUTS|LORRY NEXT|GAP NEXT|STRIKE|GOAL OPEN|NEXT:/, `${State.name} "${label}" is not a literal rule label`);
    }
  }
});

test('where a note sits is the rule: the lane that shuts next, the lorry\'s next stop, the next gap', () => {
  const gates = attached(TollGateLaneSignals);
  gates.plazas.forEach((plaza, i) => assert.equal(gates.chalkNotes()[i].z, LANES[gates.closedLane(plaza, 1)].center));

  const lorries = attached(DepartingLorryGoals);
  lorries.goals.forEach((goal, i) => {
    const note = lorries.chalkNotes()[i];
    assert.equal(note.z, lorries.center(goal, 1));
    assert.equal(Math.sign(note.x), goal.sign, 'at the end its lorry serves');
  });

  const dishes = attached(ChangeDishes);
  for (const note of dishes.chalkNotes()) {
    const dish = dishes.dishes.find((d) => Math.sign(note.x) === d.sign);
    const world = Math.atan2(note.z, note.x - dish.sign * PITCH_HALF_LENGTH);
    const relative = dish.sign > 0 ? Math.PI - world : world;
    const phi = COVER_ANGLES[dishes.state(dish, 1)];
    const wrapped = Math.atan2(Math.sin(relative - phi), Math.cos(relative - phi));
    assert.ok(Math.abs(wrapped) > DISH_SPAN / 2, 'a gap note is never on the arc the dish covers next');
  }

  const rulers = attached(RulerSeesaws);
  rulers.rulers.forEach((ruler, i) => {
    assert.equal(rulers.chalkNotes()[i].icon, 'ruler-angle');
    assert.equal(rulers.chalkNotes()[i].value, rulers.angleIndex(ruler, 1));
  });
});

test('coin notes follow each side\'s chain in its own colour, then mark the goal it opened', () => {
  const chains = attached(CoinStackChains);
  const home = () => chains.chalkNotes().find((n) => n.side === 'home');
  const stack = chains.nextStack('home');
  assert.equal(home().x, stack.pos.x);
  assert.equal(home().icon, 'coin-chain');
  assert.equal(home().value, 0);
  chains.lit.home = 3;
  assert.equal(home().icon, 'goal-open');
  assert.ok(home().x > 0, 'home opens the goal it attacks');
});

test('a note slides along the table first, keeping its place across it, to the nearest spot no piece covers', async () => {
  const { placeClear, tableObstacles } = await import('../src/scene/chalk-note-clear-placement.js');
  const physics = new FlickPhysicsEngine();
  physics.addBody({ x: 0.3, z: 0.6, radius: 0.085, mass: 1, kind: 'cap' });
  const note = { x: 0.3, z: 0.62, icon: 'boom-warning' };
  const placed = placeClear(note, tableObstacles(physics));
  assert.equal(placed.z, note.z, 'across the table is what the note means');
  assert.ok(Math.abs(placed.x - 0.3) >= 0.3, `slid clear to ${placed.x}`);
  assert.deepEqual(placeClear(note, []), note, 'an open table leaves it where it asked to be');
});

test('table chalk reads upright on screen from the side and from straight above, in both orientations', async () => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { screenUprightYaw } = await import('../src/scene/chalk-table-score-and-flick-tallies.js');
  const view = (position, up = [0, 1, 0]) => {
    const camera = new THREE.PerspectiveCamera(42, 1.5);
    camera.position.set(...position); camera.up.set(...up); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    return camera;
  };
  // The chalk's top edge after the turn, on the table: (−sin yaw, −cos yaw).
  const topOnScreen = (camera) => {
    const yaw = screenUprightYaw(camera);
    const centre = new THREE.Vector3(0, 0, 0).project(camera);
    const top = new THREE.Vector3(-Math.sin(yaw) * 0.1, 0, -Math.cos(yaw) * 0.1).project(camera);
    return { dx: top.x - centre.x, dy: top.y - centre.y };
  };
  for (const [name, camera] of [
    ['broadcast', view([0, 2, 3])],
    ['tactical, landscape', view([0, 4, 0.36])],
    ['tactical, portrait', view([-0.36, 4, 0])],
    ['straight down, turned', view([0, 4, 0], [1, 0, 0])],
  ]) {
    const { dx, dy } = topOnScreen(camera);
    assert.ok(dy > 0 && Math.abs(dx) < dy * 0.05, `${name}: top points up the screen (dx ${dx.toFixed(3)}, dy ${dy.toFixed(3)})`);
  }
});

test('at every lorry stop the note clears the kickoff caps, moving across by no more than a nudge', async () => {
  const { placeClear, tableObstacles, NOTE_SIZE, NUDGE_Z } = await import('../src/scene/chalk-note-clear-placement.js');
  const { TEAM_FORMATION } = await import('../src/core/pitch-dimensions-and-constants.js');
  const physics = new FlickPhysicsEngine();
  for (const [x, z] of TEAM_FORMATION) for (const sign of [-1, 1]) physics.addBody({ x: sign * x, z, radius: 0.085, mass: 1, kind: 'cap' });
  physics.addBody({ x: 0, z: 0, radius: 0.035, mass: 0.12, kind: 'ball' });
  const lorries = new DepartingLorryGoals();
  lorries.attach(physics);
  const obstacles = tableObstacles(physics);
  const [w, h] = NOTE_SIZE;
  const clear = (n) => obstacles.every((c) => Math.hypot(Math.max(Math.abs(c.x - n.x) - w / 2, 0), Math.max(Math.abs(c.z - n.z) - h / 2, 0)) >= c.r);
  for (let turn = 0; turn < 8; turn++) {
    for (const note of lorries.chalkNotes()) {
      const placed = placeClear(note, obstacles);
      assert.ok(clear(placed), `turn ${turn}: "${note.icon}" for the stop at ${note.z} sits clear (${placed.x.toFixed(2)}, ${placed.z.toFixed(2)})`);
      assert.ok(Math.abs(placed.z - note.z) <= NUDGE_Z + 1e-9, 'still reads as the same stop');
    }
    lorries.advance('home'); lorries.advance('away');
  }
});

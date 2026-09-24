import test from 'node:test';
import assert from 'node:assert/strict';
import { FlickPhysicsEngine } from './helpers/real-three-session-fixture.mjs';
const { RulerSeesaws, ANGLE_NAMES } = await import('../src/gameplay/ruler-seesaw-state.js');
const { ChangeDishes, COVER_ANGLES, DISH_SPAN } = await import('../src/gameplay/change-dish-state.js');
const { ClayPotMaze } = await import('../src/gameplay/clay-pot-maze-state.js');
const { TollGateLaneSignals, LANES } = await import('../src/gameplay/toll-gate-lane-signal-state.js');
const { DepartingLorryGoals } = await import('../src/gameplay/departing-lorry-goal-state.js');
const { CoinStackChains } = await import('../src/gameplay/coin-stack-chain-state.js');
const { PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } = await import('../src/core/pitch-dimensions-and-constants.js');

const attached = (State) => { const state = new State(); state.attach?.(new FlickPhysicsEngine()); return state; };

test('every venue chalks short notes on the pitch, and none says left or right', () => {
  for (const State of [RulerSeesaws, ChangeDishes, ClayPotMaze, TollGateLaneSignals, DepartingLorryGoals, CoinStackChains]) {
    const notes = attached(State).chalkNotes();
    assert.ok(notes.length >= 1 && notes.length <= 4, `${State.name}: ${notes.length} notes`);
    for (const { x, z, text } of notes) {
      assert.ok(Math.abs(x) < PITCH_HALF_LENGTH && Math.abs(z) < PITCH_HALF_WIDTH, `${State.name} "${text}" at ${x}, ${z}`);
      assert.ok(text.length <= 18, `${State.name} "${text}" is short`);
      assert.doesNotMatch(text, /LEFT|RIGHT/, `${State.name} "${text}" never depends on the camera`);
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
  rulers.rulers.forEach((ruler, i) => assert.equal(rulers.chalkNotes()[i].text, `NEXT: ${ANGLE_NAMES[rulers.angleIndex(ruler, 1)]}`));
});

test('coin notes follow each side\'s chain in its own colour, then mark the goal it opened', () => {
  const chains = attached(CoinStackChains);
  const home = () => chains.chalkNotes().find((n) => n.side === 'home');
  const stack = chains.nextStack('home');
  assert.equal(home().x, stack.pos.x);
  assert.equal(home().text, 'STRIKE · 0/3 LIT');
  chains.lit.home = 3;
  assert.equal(home().text, 'GOAL OPEN');
  assert.ok(home().x > 0, 'home opens the goal it attacks');
});

test('a note slides along the table, never across it, to the nearest spot no piece covers', async () => {
  const { placeClear, tableObstacles } = await import('../src/scene/chalk-note-clear-placement.js');
  const physics = new FlickPhysicsEngine();
  physics.addBody({ x: 0.3, z: 0.6, radius: 0.085, mass: 1, kind: 'cap' });
  const note = { x: 0.3, z: 0.62, text: 'SHUTS NEXT' };
  const placed = placeClear(note, tableObstacles(physics));
  assert.equal(placed.z, note.z, 'across the table is what the note means');
  assert.ok(Math.abs(placed.x - 0.3) >= 0.3, `slid clear to ${placed.x}`);
  assert.deepEqual(placeClear(note, []), note, 'an open table leaves it where it asked to be');
});

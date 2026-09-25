import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE, FlickPhysicsEngine } from './helpers/real-three-session-fixture.mjs';
const { createVenueMechanic } = await import('../src/gameplay/street-legends-venue-mechanic-wiring.js');

const MECHANICS = ['clay-pot-maze', 'change-dish', 'ruler-seesaw', 'departing-lorry', 'toll-gates', 'coin-stack-chain'];
const noop = () => {};
const canvasContext = () => ({
  fillRect: noop, strokeRect: noop, beginPath: noop, moveTo: noop, lineTo: noop, quadraticCurveTo: noop,
  arc: noop, ellipse: noop, stroke: noop, fill: noop, fillText: noop, save: noop, restore: noop, translate: noop,
  rotate: noop, clearRect: noop, drawImage: noop,
  createLinearGradient: () => ({ addColorStop: noop }),
  createRadialGradient: () => ({ addColorStop: noop }),
  measureText: () => ({ width: 40 }),
});

function sessionFor(type) {
  const handlers = {};
  const stage = { group: new THREE.Group(), goals: { [-1]: new THREE.Group(), 1: new THREE.Group() } };
  const rules = { on: (event, fn) => { handlers[event] = fn; }, flickLimitFor: () => 1 };
  return {
    handlers,
    session: {
      stage,
      physics: new FlickPhysicsEngine(),
      ballBody: { pos: { y: 0 } },
      rules,
      hud: { setObjective() {}, event() {} },
      sound: { woodKnock() {}, starDing() {} },
      post: { pulseBloom() {} },
      options: { homeTeam: { hudColor: '#d6503a' } },
      level: { objective: 'Score', legend: { act: 2 }, rules: { awayFlickLimit: 8 },
        mechanic: { type }, opponent: { kid: 'Magic', tactics: {}, team: { hudColor: '#4f86c6' } } },
    },
  };
}

test('Street Legends mechanics do not expose or draw live rule cues on the table', () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: canvasContext }) };
  try {
    for (const type of MECHANICS) {
      const { session, handlers } = sessionFor(type);
      const mechanic = createVenueMechanic(session);
      handlers.turn?.('home');
      assert.equal('chalkNotes' in mechanic, false, type);
      assert.equal(session.stage.group.getObjectByName('venue-rule-chalk-notes'), undefined, type);
      assert.equal('chalkNotes' in mechanic.definition, false, type);
    }
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});

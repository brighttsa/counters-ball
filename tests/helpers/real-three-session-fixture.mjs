import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const threeUrl = pathToFileURL(process.env.COUNTERS_TEST_THREE).href;
registerHooks({ resolve(specifier, context, next) {
  return specifier === 'three' ? { url: threeUrl, shortCircuit: true } : next(specifier, context);
} });
const THREE = await import('three');
if (THREE.REVISION !== '160') throw new Error(`Expected Three r160, got ${THREE.REVISION}`);
const { MatchSession } = await import('../../src/gameplay/match-session-runtime.js');
const { FlickPhysicsEngine, FIXED_STEP } = await import('../../src/gameplay/flick-physics-engine.js');
const { MatchRules } = await import('../../src/gameplay/match-rules-turns-goals-and-results.js');
const { MatchPresentationDirector } = await import('../../src/gameplay/match-presentation-director.js');
const { GameTimeController } = await import('../../src/core/game-time-hit-stop-and-slow-motion.js');
const { wireMatchFeedback } = await import('../../src/gameplay/match-session-feedback-hooks.js');

export { THREE, FlickPhysicsEngine, FIXED_STEP };

export function fixture({ goalsToWin = 2, isAttract = false, motionEnabled = true } = {}) {
  const calls = [];
  const surface = (name, methods) => Object.fromEntries(methods.map(method => [method,
    (...args) => calls.push([`${name}.${method}`, ...args]),
  ]));
  // Bypass GPU/DOM stage construction only. Methods, physics, rules and director are real.
  const s = Object.create(MatchSession.prototype);
  s.physics = new FlickPhysicsEngine();
  const body = s.physics.addBody({ x: -0.5, z: 0, radius: 0.08, mass: 1, kind: 'cap', side: 'home' });
  s.entries = [{ side: 'home', body, home: [-0.5, 0], pivot: new THREE.Object3D(), mesh: new THREE.Object3D() }];
  s.ballBody = s.physics.addBody({ x: 0, z: 0, radius: 0.035, mass: 0.12, kind: 'ball' });
  s.rules = new MatchRules({ goalsToWin, flickLimit: 10, threeStarFlicks: 3 }, { home: 'human', away: 'human' });
  s.time = new GameTimeController();
  s.options = { isAttract, controllers: s.rules.controllers, homeTeam: { name: 'Home' },
    awayTeam: { name: 'Away' }, onEnd: result => calls.push(['result', result]) };
  s.level = { opponent: { kid: 'Opponent' }, tutorial: false };
  s.hud = surface('hud', ['event', 'setHeat', 'update', 'clearEvents', 'replay', 'setFlicks', 'setTurn', 'setScore', 'goal', 'hideTutorial']);
  s.sound = surface('sound', ['event', 'setHeat', 'setPaused', 'flick', 'ballTap', 'capClink', 'woodKnock', 'whistle', 'goalCheer', 'groan']);
  s.particles = surface('particles', ['setVisible', 'contactFlash', 'dustPuff', 'confettiBurst', 'clearConfetti', 'trail', 'update']);
  s.juice = surface('juice', ['release', 'hopBall', 'hitCap', 'wobbleGoal', 'reset', 'update']);
  s.cameraDirector = { motionEnabled, ...surface('camera', ['setTension', 'setReplayFocus', 'setReplay', 'celebrateGoal', 'addTrauma', 'setFocus', 'kick']) };
  s.post = surface('post', ['pulseBloom']);
  s.input = surface('input', ['cancel', 'dispose']);
  s.ai = surface('ai', ['cancel', 'takeTurn', 'update']);
  s.visuals = surface('visuals', ['update']);
  s.stage = { ballMesh: new THREE.Object3D(), backdrop: surface('backdrop', ['startle', 'update']),
    ...surface('stage', ['dispose']) };
  Object.assign(s, { timers: [], paused: false, disposed: false, slowMoUsed: false,
    trailClock: 0, tutorialActive: false, tutorialDone: true });
  s.presentation = new MatchPresentationDirector(s);
  wireMatchFeedback(s);
  s.start();
  return { s, calls };
}

export function prepareHighlight(s) {
  s.flick(s.entries[0], new THREE.Vector2(1, 0), { stability: 1 });
  s.ballBody.vel.set(1, 0);
  s.presentation.skills.impact(s.entries[0].body, s.ballBody, 0.5);
  for (let i = 0; i < 8; i++) {
    s.stage.ballMesh.position.x = i / 8;
    s.presentation.capture(1 / 30);
  }
  s.rules.registerGoal(1);
  s.presentation.capture(1 / 30);
}

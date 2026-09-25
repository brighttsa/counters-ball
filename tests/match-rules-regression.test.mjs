import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchRules } from '../src/gameplay/match-rules-turns-goals-and-results.js';
import { otherSide } from '../src/core/pitch-dimensions-and-constants.js';

const create = (overrides = {}, controllers = { home: 'human', away: 'ai' }) =>
  new MatchRules({ goalsToWin: 2, flickLimit: 3, threeStarFlicks: 2, ...overrides }, controllers);

test('only the active side spends one flick, and settling advances once', () => {
  const rules = create();
  const turns = [];
  rules.on('turn', side => turns.push(side));
  assert.equal(rules.registerFlick('home'), false);
  rules.start();
  assert.equal(rules.registerFlick('away'), false);
  assert.equal(rules.registerFlick('home'), true);
  assert.equal(rules.registerFlick('home'), false);
  assert.deepEqual(rules.flicksUsed, { home: 1, away: 0 });
  rules.resolvePlayAtRest();
  rules.resolvePlayAtRest();
  assert.deepEqual(turns, ['home', 'away']);
});

test('goal is counted once and kickoff precedes the conceding turn', () => {
  const rules = create();
  const events = [];
  for (const name of ['goal', 'kickoff', 'turn']) rules.on(name, value => events.push([name, value]));
  rules.start();
  rules.registerFlick('home');
  rules.registerGoal(1);
  rules.registerGoal(1);
  rules.resolvePlayAtRest();
  assert.equal(rules.phase, 'goal');
  assert.deepEqual(rules.scores, { home: 1, away: 0 });
  assert.equal(rules.result, null);
  rules.finishGoalCelebration();
  rules.finishGoalCelebration();
  assert.deepEqual(events.slice(-2), [['kickoff', 'away'], ['turn', 'away']]);
  assert.equal(events.filter(([name]) => name === 'goal').length, 1);
});

test('own goal credits goal direction rather than flick owner', () => {
  const rules = create({ goalsToWin: 1 });
  rules.start();
  rules.registerFlick('home');
  rules.registerGoal(-1);
  rules.finishGoalCelebration();
  assert.equal(rules.result.winner, 'away');
  assert.deepEqual(rules.result.starFlags, [false, false, false]);
});

test('online minimum contest keeps an early goal from ending the match', () => {
  const rules = create({ goalsToWin: 3, flickLimit: 10, minimumFlicksEach: 3 });
  rules.start();
  rules.registerFlick('home');
  rules.registerGoal(1);
  rules.finishGoalCelebration();
  assert.equal(rules.phase, 'aiming');
  assert.deepEqual(rules.scores, { home: 1, away: 0 });
  rules.flicksUsed = { home: 3, away: 3 };
  rules.scores.home = 2;
  rules.turn = 'home';
  rules.registerFlick('home');
  rules.registerGoal(1);
  rules.finishGoalCelebration();
  assert.equal(rules.phase, 'ended');
});

test('exhausted side is skipped, and both sides exhausted level goes to a golden flick first', () => {
  const rules = create({ flickLimit: 1 });
  rules.start();
  rules.registerFlick('home');
  rules.registerGoal(-1);
  rules.finishGoalCelebration();
  assert.equal(rules.turn, 'away');
  rules.registerFlick('away');
  rules.registerGoal(1);
  rules.finishGoalCelebration();
  // 1-1, both out of flicks: not a draw yet — one flick each, next goal wins.
  assert.equal(rules.phase, 'aiming');
  assert.equal(rules.tiebreak, 'golden');
  assert.equal(rules.flicksLeft('home'), 1);
  assert.equal(rules.flicksLeft('away'), 1);
});

test('a goal during the golden flick wins outright, even without reaching goalsToWin', () => {
  const rules = create({ goalsToWin: 5, flickLimit: 1 });
  rules.start();
  rules.registerFlick('home');
  rules.resolvePlayAtRest();
  rules.registerFlick('away');
  rules.resolvePlayAtRest();
  assert.equal(rules.tiebreak, 'golden');
  const scorer = rules.turn;
  rules.registerFlick(scorer);
  rules.registerGoal(scorer === 'home' ? 1 : -1);
  rules.finishGoalCelebration();
  assert.equal(rules.phase, 'ended');
  assert.equal(rules.result.winner, scorer);
  assert.equal(rules.result.scores.home + rules.result.scores.away, 1);
});

test('a level golden flick escalates to two more each, then a real draw if still level', () => {
  const rules = create({ flickLimit: 1 });
  rules.start();
  rules.registerFlick('home');
  rules.resolvePlayAtRest();
  rules.registerFlick('away');
  rules.resolvePlayAtRest();
  assert.equal(rules.tiebreak, 'golden');
  const first = rules.turn;
  rules.registerFlick(first);
  rules.resolvePlayAtRest();
  rules.registerFlick(otherSide(first));
  rules.resolvePlayAtRest();
  assert.equal(rules.tiebreak, 'extra');
  assert.equal(rules.flicksLeft('home'), 2);
  assert.equal(rules.flicksLeft('away'), 2);
  for (let i = 0; i < 2; i++) { rules.registerFlick(rules.turn); rules.resolvePlayAtRest(); }
  for (let i = 0; i < 2; i++) { rules.registerFlick(rules.turn); rules.resolvePlayAtRest(); }
  assert.equal(rules.phase, 'ended');
  assert.equal(rules.result.winner, null);
  assert.equal(rules.result.stars, 0);
  assert.equal(rules.tiebreak, 'extra');
});

test('a solo challenge (awayFlickLimit: 0) never tiebreaks: exhausting home ends it flat', () => {
  const rules = create({ goalsToWin: 1, flickLimit: 1, awayFlickLimit: 0 });
  rules.start();
  rules.registerFlick('home');
  rules.resolvePlayAtRest();
  assert.equal(rules.phase, 'ended');
  assert.equal(rules.tiebreak, null);
  assert.equal(rules.result.winner, null);
});

for (const [used, conceded, flags] of [
  [2, 0, [true, true, true]], [3, 0, [true, true, false]],
  [2, 1, [true, false, true]], [3, 1, [true, false, false]],
]) {
  test(`home win star boundary: ${used} flicks, ${conceded} conceded`, () => {
    const rules = create();
    rules.scores = { home: 2, away: conceded };
    rules.flicksUsed.home = used;
    let ends = 0;
    rules.on('end', () => ends++);
    rules.end();
    rules.end();
    rules.registerGoal(1);
    assert.equal(ends, 1);
    assert.deepEqual(rules.result.starFlags, flags);
    assert.equal(rules.result.stars, flags.filter(Boolean).length);
    rules.scores.home = 99;
    rules.flicksUsed.home = 99;
    assert.equal(rules.result.scores.home, 2);
    assert.equal(rules.result.flicksUsed.home, used);
  });
}

test('hot-seat controllers and reset preserve configuration without old results', () => {
  const rules = create({}, { home: 'human', away: 'human' });
  assert.equal(rules.isAi('away'), false);
  rules.start('away');
  assert.equal(rules.canFlick('away'), true);
  rules.registerFlick('away');
  rules.end();
  rules.reset();
  assert.equal(rules.phase, 'waiting');
  assert.equal(rules.result, null);
  assert.deepEqual(rules.scores, { home: 0, away: 0 });
  assert.deepEqual(rules.flicksUsed, { home: 0, away: 0 });
});

test('reset clears a tiebreak in progress and its bonus flicks', () => {
  const rules = create({ flickLimit: 1 });
  rules.start();
  rules.registerFlick('home');
  rules.resolvePlayAtRest();
  rules.registerFlick('away');
  rules.resolvePlayAtRest();
  assert.equal(rules.tiebreak, 'golden');
  assert.equal(rules.flickLimitFor('home'), 2);
  rules.reset();
  assert.equal(rules.tiebreak, null);
  assert.equal(rules.flickLimitFor('home'), 1);
  assert.deepEqual(rules.tiebreakBonus, { home: 0, away: 0 });
});

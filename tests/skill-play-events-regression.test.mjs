import test from 'node:test';
import assert from 'node:assert/strict';
import { SkillPlayEventTracker } from '../src/gameplay/skill-play-event-tracker.js';
import { FlickGestureSampler } from '../src/gameplay/flick-gesture-sampler.js';

function setup(side = 'home', gesture = { stability: 1 }, startX = 0) {
  const direction = side === 'home' ? 1 : -1;
  const cap = { kind: 'cap', side, pos: { x: startX - direction * 0.2, y: 0 } };
  const ball = { kind: 'ball', pos: { x: startX, y: 0 }, vel: { x: direction, y: 0 } };
  const events = [];
  const tracker = new SkillPlayEventTracker((label, data) => events.push({ label, data }));
  tracker.begin({ side, body: cap }, { x: direction, y: 0 }, ball, gesture);
  return { tracker, cap, ball, events, direction };
}

for (const side of ['home', 'away']) {
  test(`aligned human contact is awarded once and never alters ${side} physics`, () => {
    const { tracker, cap, ball, events, direction } = setup(side);
    const before = structuredClone({ cap, ball });
    tracker.impact(cap, ball, 0.5);
    tracker.impact(ball, cap, 0.5);
    assert.deepEqual({ cap, ball }, before);
    assert.deepEqual(events.map(event => event.label), ['SWEET SPOT']);
    assert.equal(events[0].data.direction, direction);
    assert.equal(events[0].data.heat[side], 1);
    assert.equal(tracker.goal(side).replay, true);
  });
}

test('AI, weak and unstable contacts do not receive Sweet Spot', () => {
  for (const [gesture, strength] of [[null, 1], [{ stability: 0.7 }, 1], [{ stability: 1 }, 0.1]]) {
    const { tracker, cap, ball, events } = setup('home', gesture);
    tracker.impact(cap, ball, strength);
    assert.deepEqual(events, []);
  }
});

test('bank requires owned contact plus forward advantage, not wall contact alone', () => {
  const { tracker, cap, ball, events } = setup('home', null);
  tracker.wall(cap, 0.5);
  tracker.update(0.1, ball);
  assert.deepEqual(events, []);
  tracker.impact(cap, ball, 0.5);
  tracker.update(0.1, ball);
  assert.deepEqual(events, []);
  ball.pos.x = 0.5;
  tracker.update(0.1, ball);
  tracker.update(0.1, ball);
  assert.deepEqual(events.map(event => event.label), ['BOUNCE']);
  assert.equal(tracker.goal('home').label, 'BOUNCE GOAL');
});

test('counter requires previous opponent touch and reversal out of own half', () => {
  for (const lastTouch of [null, 'home', 'away']) {
    const { tracker, cap, ball, events } = setup('home', null, -0.6);
    tracker.lastTouch = lastTouch;
    tracker.begin({ side: 'home', body: cap }, { x: 1, y: 0 }, ball);
    tracker.impact(cap, ball, 0.5);
    ball.pos.x = 0.2;
    tracker.update(0.1, ball);
    assert.deepEqual(events.map(event => event.label), lastTouch === 'away' ? ['COUNTER'] : []);
  }
});

test('connected cap sequence becomes Street Play only on its successful goal', () => {
  const { tracker, cap, ball, events } = setup('home', null);
  const teammate = { kind: 'cap', side: 'home', pos: { x: -0.1, y: 0 } };
  tracker.impact(cap, teammate, 0.5);
  tracker.impact(teammate, ball, 0.5);
  assert.deepEqual(events, []);
  assert.deepEqual(tracker.goal('away'), { label: '', replay: false });
  assert.equal(tracker.goal('home').label, 'STREET PLAY');
  tracker.goal('home');
  assert.deepEqual(events.map(event => event.label), ['STREET PLAY']);
});

test('expired shot cannot receive a late bank; kickoff clears possession history', () => {
  const { tracker, cap, ball, events } = setup('home', null);
  tracker.impact(cap, ball, 0.5);
  tracker.wall(ball, 0.5);
  ball.pos.x = 0.6;
  tracker.update(3, ball);
  assert.deepEqual(events, []);
  tracker.kickoff();
  assert.equal(tracker.shot, null);
  assert.equal(tracker.lastTouch, null);
});

test('gesture speed is bounded and independent of straight-line sample density', () => {
  const results = [2, 9].map(count => {
    const sampler = new FlickGestureSampler();
    sampler.reset(0, 0, 0);
    for (let i = 1; i <= count; i++) sampler.add(-0.32 * i / count, 0, 80 * i / count);
    return sampler.measure({ x: 1, y: 0 });
  });
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[0], { stability: 1, speed: 4, boost: 1.08 });
});

test('stationary, sideways and forward releases receive no extra force', () => {
  for (const [x, y] of [[0, 0], [0, 0.3], [0.3, 0]]) {
    const sampler = new FlickGestureSampler();
    sampler.reset(0, 0, 0);
    sampler.add(x, y, 80);
    assert.equal(sampler.measure({ x: 1, y: 0 }).boost, 1);
  }
});

test('opponent final touch suppresses own-shot goal recognition', () => {
  const { tracker, cap, ball } = setup();
  tracker.impact(cap, ball, 0.5);
  const opponent = { kind: 'cap', side: 'away', pos: { x: 0.2, y: 0 } };
  tracker.impact(opponent, ball, 0.5);
  assert.deepEqual(tracker.goal('home'), { label: '', replay: false });
});

test('heat saturates and an unskilled settled shot cools only its side', () => {
  const { tracker, cap, ball } = setup();
  for (let i = 0; i < 8; i++) {
    tracker.begin({ side: 'home', body: cap }, { x: 1, y: 0 }, ball, { stability: 1 });
    tracker.impact(cap, ball, 0.5);
    tracker.settle();
  }
  assert.deepEqual(tracker.heat, { home: 5, away: 0 });
  tracker.begin({ side: 'home', body: cap }, { x: 1, y: 0 }, ball);
  tracker.settle();
  assert.deepEqual(tracker.heat, { home: 4, away: 0 });
});

test('a cap collision after ball release is not a successful multi-contact scoring chain', () => {
  const { tracker, cap, ball } = setup('home', null);
  tracker.impact(cap, ball, 0.5);
  const teammate = { kind: 'cap', side: 'home', pos: { x: -0.4, y: 0 } };
  tracker.impact(cap, teammate, 0.5);
  assert.equal(tracker.goal('home').label, '');
});

test('striker wall contact after ball departure cannot label a direct shot as bank', () => {
  const { tracker, cap, ball, events } = setup('home', null);
  tracker.impact(cap, ball, 0.5);
  tracker.wall(cap, 0.5);
  ball.pos.x = 0.6;
  tracker.update(0.1, ball);
  assert.deepEqual(events, []);
  assert.equal(tracker.goal('home').label, '');
  tracker.wall(ball, 0.5);
  tracker.update(0.1, ball);
  assert.deepEqual(events.map(event => event.label), ['BOUNCE']);
});

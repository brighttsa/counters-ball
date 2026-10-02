import test from 'node:test';
import assert from 'node:assert/strict';
import { beginVoiceCleanup, finishVoiceCleanup, nextVoiceAlarmAt, providerVoiceRoomName, renewVoiceSession, reserveVoiceSession } from '../match-server/src/private-voice-session-rules.js';

test('provider room names preserve case-sensitive room-code identity', () => {
  assert.notEqual(providerVoiceRoomName('AbCd1234'), providerVoiceRoomName('aBcD1234'));
  assert.equal(providerVoiceRoomName('AbCd1234'), providerVoiceRoomName('AbCd1234'));
});

function reserve(state, roomId, seat, id, now = 1000) {
  return reserveVoiceSession(state, { roomId, seat, roomEpoch: 1, seatGeneration: 1, now, sessionId: id, identity: `id-${id}` });
}

test('pilot quota counts active and uncertain reservations by distinct room', () => {
  const state = { sessions: {} };
  for (let i = 0; i < 4; i++) assert.equal(reserve(state, `r${i}`, 'home', `s${i}`).ok, true);
  const fifth = reserve(state, 'r4', 'home', 's4');
  assert.equal(fifth.ok, true);
  state.sessions.s3.state = 'quarantined';
  assert.equal(reserve(state, 'r5', 'home', 's5').status, 429);
});

test('one room admits at most four distinct occupied seats and no duplicate seat generations', () => {
  const state = { sessions: {} };
  for (let i = 0; i < 4; i++) assert.equal(reserve(state, 'r', `p${i + 1}`, `s${i}`).ok, true);
  assert.equal(reserve(state, 'r', 'p5', 's5').status, 429);
  assert.equal(reserve(state, 'r', 'p1', 'duplicate').status, 409);
});

test('renewal is fenced to exact room, seat, generation and session, and cannot exceed deadline', () => {
  const state = { sessions: {} };
  const { session } = reserve(state, 'r', 'home', 's');
  session.state = 'active';
  const proof = { roomId: 'r', seat: 'home', roomEpoch: 1, seatGeneration: 1, sessionId: 's' };
  assert.equal(renewVoiceSession(session, proof, 2000).session.leaseUntil, 47_000);
  assert.equal(renewVoiceSession(session, { ...proof, seatGeneration: 2 }, 2000).status, 409);
  assert.equal(renewVoiceSession(session, proof, session.deadlineAt).status, 410);
});

test('cleanup is compare-and-set fenced; uncertain cleanup remains quarantined and counted', () => {
  const state = { sessions: {} };
  const { session } = reserve(state, 'r', 'home', 's');
  assert.equal(beginVoiceCleanup(session, { roomId: 'r', seatGeneration: 2, sessionId: 's' }, 500).stale, true);
  assert.equal(beginVoiceCleanup(session, { roomId: 'r', seatGeneration: 1, sessionId: 's' }, 500).ok, true);
  finishVoiceCleanup(session, false, 600);
  assert.equal(session.state, 'quarantined');
  assert.equal(reserve(state, 'r', 'home', 'replacement').status, 409);
  assert.equal(nextVoiceAlarmAt(state), 2_600);
});

test('confirmed cleanup releases capacity and alarms remain independent when no voice is active', () => {
  const state = { sessions: {} };
  const { session } = reserve(state, 'r', 'home', 's');
  beginVoiceCleanup(session, { roomId: 'r', seatGeneration: 1, sessionId: 's' }, 500);
  finishVoiceCleanup(session, true, 600);
  assert.equal(nextVoiceAlarmAt(state), null);
  assert.equal(reserve(state, 'r', 'home', 'replacement').ok, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PrivateRoomVoiceSession } from '../src/core/private-room-voice-session.js';

function deferred() {
  let resolve; let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const calls = [];
  const adapter = {
    connect: async () => calls.push('connect'),
    disconnect: async () => calls.push('disconnect'),
    capture: async () => ({ stop: () => calls.push('stop') }),
    publish: async () => calls.push('publish'),
    unpublish: async () => calls.push('unpublish'),
  };
  const voice = new PrivateRoomVoiceSession(() => adapter);
  return { voice, adapter, calls };
}
test('join is listening-only and never captures microphone', async () => {
  const { voice, calls } = fixture();
  await voice.join({});
  assert.deepEqual(calls, ['connect']);
  assert.equal(voice.state, 'listening');
});
test('mute stops capture before asynchronous unpublication', async () => {
  const { voice, calls } = fixture();
  await voice.join({}); await voice.unmute(); await voice.mute();
  assert.deepEqual(calls, ['connect', 'publish', 'stop', 'unpublish']);
  assert.equal(voice.state, 'listening');
});
for (const action of ['mute', 'leave']) {
  test(`late capture after ${action} is stopped and never published`, async () => {
    const { voice, adapter, calls } = fixture(); const pending = deferred();
    adapter.capture = () => pending.promise;
    await voice.join({}); const unmuting = voice.unmute();
    await voice[action]();
    pending.resolve({ stop: () => calls.push('late-stop') }); await unmuting;
    assert.ok(calls.includes('late-stop')); assert.ok(!calls.includes('publish'));
  });
}
test('permission denial retains listening and safe error state', async () => {
  const { voice, adapter } = fixture();
  adapter.capture = async () => { throw new Error('private provider details'); };
  await voice.join({}); await voice.unmute();
  assert.equal(voice.state, 'listening'); assert.equal(voice.error, 'microphone-unavailable');
});
test('only allowlisted microphone reasons reach the interface', async () => {
  for (const code of ['microphone-denied', 'microphone-timeout', 'private-provider-detail']) {
    const { voice, adapter } = fixture();
    adapter.capture = async () => { throw Object.assign(new Error('private'), { code }); };
    await voice.join({}); await voice.unmute();
    assert.equal(voice.state, 'listening');
    assert.equal(voice.error, code.startsWith('microphone-') ? code : 'microphone-unavailable');
  }
});
test('leave while connecting disposes the stale connection', async () => {
  const { voice, adapter, calls } = fixture(); const pending = deferred();
  adapter.connect = () => pending.promise;
  const joining = voice.join({}); await voice.leave(); pending.resolve(); await joining;
  assert.equal(voice.state, 'idle'); assert.ok(calls.includes('disconnect'));
});
test('failed publication stops captured microphone', async () => {
  const { voice, adapter, calls } = fixture();
  adapter.publish = async () => { throw new Error('failed'); };
  await voice.join({}); await voice.unmute();
  assert.ok(calls.includes('stop')); assert.equal(voice.state, 'listening');
  assert.equal(voice.error, 'microphone-publish-failed');
});
test('late publish after mute is unpublished without reopening mic', async () => {
  const { voice, adapter, calls } = fixture(); const pending = deferred();
  adapter.publish = () => pending.promise;
  await voice.join({}); const unmuting = voice.unmute();
  await new Promise(resolve => setImmediate(resolve));
  await voice.mute(); pending.resolve(); await unmuting;
  assert.ok(calls.includes('stop')); assert.ok(calls.includes('unpublish'));
  assert.equal(voice.state, 'listening');
});
test('rejoin starts muted even after previously unmuting', async () => {
  const { voice, calls } = fixture();
  await voice.join({}); await voice.unmute(); await voice.leave(); await voice.join({});
  assert.equal(voice.state, 'listening'); assert.equal(calls.filter(x => x === 'publish').length, 1);
});

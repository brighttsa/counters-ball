import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNativeTableTalkVoiceAdapter } from '../src/core/native-table-talk-voice-adapter.js';

test('native adapter sends only whitelisted commands and never loads web SDK', async () => {
  const commands = [];
  const changes = [];
  const adapter = createNativeTableTalkVoiceAdapter({ postMessage: async body => {
    commands.push(body); return { state: 'listening', error: null, remoteSpeaking: true };
  } }, value => changes.push(value));
  await adapter.join({url:'wss://example.livekit.cloud',token:'opaque-token'});
  await adapter.unmute(); await adapter.mute(); await adapter.leave();
  assert.deepEqual(commands.map(x=>x.command), ['join','unmute','mute','leave']);
  assert.deepEqual(Object.keys(commands[1]), ['command']);
  assert.equal(changes[0].remoteSpeaking, true);
});
test('bridge errors never expose native or provider details', async () => {
  const adapter = createNativeTableTalkVoiceAdapter({ postMessage: async () => {
    throw new Error('secret provider response');
  } });
  await assert.rejects(adapter.join({}), { message:'Native voice unavailable' });
});
test('bridge refuses absent or malformed replies', async () => {
  assert.throws(()=>createNativeTableTalkVoiceAdapter(null), /unavailable/);
  const adapter = createNativeTableTalkVoiceAdapter({postMessage:async()=>({token:'private'})});
  await assert.rejects(adapter.mute(), /unavailable/);
});
test('Swift entry point fences the bundled main frame and pins the provider endpoint', () => {
  const source = readFileSync(new URL('../ios/KONKNative/KONKNative/Voice/TableTalkVoiceBridge.swift',import.meta.url),'utf8');
  assert.match(source, /message\.frameInfo\.isMainFrame/);
  assert.match(source, /scheme == "konk-local"/);
  assert.match(source, /host == "game"/);
  assert.match(source, /path == "\/index\.html"/);
  assert.match(source, /konk-table-talk-s8plkl4y\.livekit\.cloud/);
  assert.match(source, /token\.utf8\.count <= 8192/);
  assert.match(source, /return allowed \? \.allow : \.cancel/);
  assert.match(source, /removeScriptMessageHandler/);
});

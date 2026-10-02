import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { posters } from '../../social/data/campaign.js';
const base = `http://127.0.0.1:${process.env.SOCIAL_PORT || 4186}`;
const request = (config, format) => fetch(`${base}/api/social-export`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kind: 'mp4', format, configs: [config] }), signal: AbortSignal.timeout(240000),
});
for (const config of posters.filter(p => p.motion)) for (const format of config.motionFormats || ['portrait']) {
  const start = Date.now(), response = await request(config, format);
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'video/mp4');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL(`../../social/exports/motion/${config.id}-${format}.mp4`, import.meta.url)));
  console.log(`${config.id}/${format}: ready MP4 downloaded in ${Date.now() - start}ms`);
}
const config = { ...posters.find(p => p.id === '20-friend-invites'), eyebrow: 'PLAY TOGETHER / NEW ROUND' };
let done = false;
const pending = request(config, 'portrait').finally(() => { done = true; });
const updates = [];
while (!done) {
  const state = await (await fetch(`${base}/api/social-export-progress`)).json();
  if (state.active && state.frames) updates.push(state);
  await delay(500);
}
const response = await pending; assert.equal(response.status, 200);
const path = '/tmp/konk-edited-motion-check.mp4'; await writeFile(path, Buffer.from(await response.arrayBuffer()));
assert.ok(updates.some(state => state.frame > 0 && state.frame < state.frames));
const probe = spawnSync('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', path], { encoding: 'utf8' });
assert.equal(probe.status, 0); assert.equal(Number(JSON.parse(probe.stdout).format.duration), 4);
assert.equal((await (await fetch(`${base}/api/social-export-progress`)).json()).active, false);
console.log(`Edited MP4 finished; ${updates.length} frame-progress updates verified; exporter returned to idle.`);

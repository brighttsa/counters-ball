import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { posters, formats } from '../../social/data/campaign.js';
import { renderConfigKey, sourceFingerprint } from './export-cache.mjs';
const directory = new URL('../../social/exports/', import.meta.url);
const snapshot = JSON.parse(await readFile(new URL('campaign-copy.json', directory)));
const entries = JSON.parse(await readFile(new URL('manifest.json', directory)));
const source = await sourceFingerprint();
for (const entry of entries) {
  const config = posters.find(p => p.id === entry.id), original = snapshot.find(p => p.id === entry.id);
  assert.ok(config && original); assert.deepEqual(entry.errors, []); assert.deepEqual(entry.overflow, []);
  const key = renderConfigKey(config, entry.format, entry.kind);
  assert.equal(key, renderConfigKey(original, entry.format, entry.kind), `${entry.id}: changed artwork needs re-export`);
  const { width, height } = formats[entry.format];
  const path = new URL(entry.kind === 'mp4' ? `motion/${entry.id}-${entry.format}.mp4` : `${entry.format}/${entry.id}.png`, directory);
  if (entry.kind === 'png') {
    const png = await readFile(path); assert.equal(png.readUInt32BE(16), width); assert.equal(png.readUInt32BE(20), height);
  } else {
    const probe = spawnSync('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-show_entries', 'format=duration', '-of', 'json', fileURLToPath(path)], { encoding: 'utf8' });
    assert.equal(probe.status, 0, probe.stderr); const info = JSON.parse(probe.stdout);
    assert.equal(info.streams[0].width, width); assert.equal(info.streams[0].height, height);
    assert.equal(Number(info.format.duration), config.motionDuration || 3);
  }
  entry.renderKey = key; entry.sourceHash = source;
}
await writeFile(new URL('manifest.json', directory), JSON.stringify(entries, null, 2));
console.log(`Indexed ${entries.length} previously verified, unchanged exports.`);

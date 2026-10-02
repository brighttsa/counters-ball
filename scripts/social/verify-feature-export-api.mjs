import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { featurePosters } from '../../social/data/feature-campaign.js';
const config = featurePosters.find(p => p.feature === 'rival');
const base = `http://127.0.0.1:${process.env.SOCIAL_PORT || 4186}`;
const temporary = await mkdtemp(join(tmpdir(), 'konk-feature-export-check-'));
async function request(pack) {
  const response = await fetch(`${base}/api/social-export`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'png', format: 'portrait', configs: [config], pack }),
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200, await response.clone().text().then(t => t.slice(0, 100)));
  assert.equal(response.headers.get('content-type'), pack ? 'application/zip' : 'image/png');
  return Buffer.from(await response.arrayBuffer());
}
try {
  const png = await request(false);
  assert.deepEqual(png, await readFile(new URL(`../../social/exports/portrait/${config.id}.png`, import.meta.url)));
  const zip = await request(true), path = join(temporary, 'filtered.zip');
  assert.equal(zip.subarray(0, 2).toString(), 'PK'); await writeFile(path, zip);
  const listing = spawnSync('/usr/bin/unzip', ['-Z', '-1', path], { encoding: 'utf8' });
  assert.equal(listing.status, 0);
  assert.deepEqual(listing.stdout.trim().split('\n').sort(), ['22-find-a-rival-portrait.png', 'captions.json']);
  console.log('PNG matches stored export byte-for-byte; one-poster collection is a valid ZIP with caption.');
} finally { await rm(temporary, { recursive: true, force: true }); }

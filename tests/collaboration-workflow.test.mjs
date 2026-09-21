import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GIT, normalizePaths, overlaps, changedFiles } from '../scripts/collaboration-state.mjs';

const cli = fileURLToPath(new URL('../scripts/collaboration-workflow.mjs', import.meta.url));
function fixture(t) {
  const dir = mkdtempSync(resolve(tmpdir(), 'counters-collaboration-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const peer = resolve(dir, 'claude');
  const own = resolve(dir, 'codex');
  mkdirSync(peer);
  const git = (cwd, ...args) => execFileSync(GIT, ['-C', cwd, '-c', 'user.name=Test',
    '-c', 'user.email=test@example.invalid', ...args], { encoding: 'utf8', stdio: 'pipe' }).trim();
  git(peer, 'init', '-b', 'main');
  writeFileSync(resolve(peer, 'base.txt'), 'base\n');
  git(peer, 'add', 'base.txt'); git(peer, 'commit', '-m', 'test: baseline');
  git(dir, 'clone', peer, own); git(own, 'checkout', '-b', 'codex/test');
  git(peer, 'remote', 'add', 'codex', own);
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: own, encoding: 'utf8' });
  const claimPath = resolve(own, 'plans/claims/codex.json');
  const claim = () => JSON.parse(readFileSync(claimPath, 'utf8'));
  return { own, peer, git, run, claimPath, claim };
}

test('claim paths are normalized and folder overlaps are boundary-aware', () => {
  assert.deepEqual(normalizePaths(['./src/audio/', 'src/audio/']), ['src/audio/']);
  for (const path of ['../outside', '/absolute', '.', '.git/', 'src/*', 'a\nb']) {
    assert.throws(() => normalizePaths([path]));
  }
  assert.equal(overlaps('src/audio/', 'src/audio/tone.js'), true);
  assert.equal(overlaps('src/audio/', 'src/audio-other.js'), false);
});

test('claim and release affect only the owner; another task requires release', t => {
  const f = fixture(t);
  const peerHead = f.git(f.peer, 'rev-parse', 'HEAD');
  assert.equal(f.run('claim', 'Audio', 'src/audio/').status, 0);
  assert.equal(f.claim().status, 'active');
  assert.equal(f.run('claim', 'Other', 'src/ui/').status, 1);
  assert.equal(f.run('release').status, 0);
  assert.equal(f.claim().status, 'released');
  assert.equal(f.run('claim', 'Other', 'src/ui/').status, 0);
  assert.equal(f.git(f.peer, 'status', '--porcelain'), '');
  assert.equal(f.git(f.peer, 'rev-parse', 'HEAD'), peerHead);
});

test('live peer claims and dirty files block overlapping work without fetching', t => {
  const f = fixture(t);
  const dir = resolve(f.peer, 'plans/claims'); mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'claude.json'), JSON.stringify({ schema: 1, owner: 'claude',
    status: 'active', task: 'Audio', paths: ['./src/audio/'] }));
  assert.equal(f.run('claim', 'Audio', 'src/audio/tone.js').status, 1);
  assert.equal(existsSync(f.claimPath), false);
  writeFileSync(resolve(f.peer, 'base.txt'), 'peer work\n');
  assert.equal(f.run('claim', 'Base', 'base.txt').status, 1);
  assert.equal(f.run('claim', 'UI', 'src/ui/').status, 0);
  mkdirSync(resolve(f.peer, 'src/ui'), { recursive: true });
  writeFileSync(resolve(f.peer, 'src/ui/hud.js'), '// work\n');
  assert.equal(f.run('status').status, 2);
});

test('malformed own claims do not leave a stale lock', t => {
  const f = fixture(t);
  mkdirSync(resolve(f.own, 'plans/claims'), { recursive: true });
  writeFileSync(f.claimPath, '{bad json');
  assert.equal(f.run('claim', 'UI', 'src/ui/').status, 1);
  assert.equal(existsSync(`${f.claimPath}.lock`), false);
});

test('dirty sync refuses without stashing, committing or changing peer', t => {
  const f = fixture(t);
  const head = f.git(f.own, 'rev-parse', 'HEAD');
  writeFileSync(resolve(f.own, 'base.txt'), 'unfinished\n');
  assert.equal(f.run('sync').status, 1);
  assert.equal(f.git(f.own, 'rev-parse', 'HEAD'), head);
  assert.equal(f.git(f.own, 'stash', 'list'), '');
  assert.equal(readFileSync(resolve(f.own, 'base.txt'), 'utf8'), 'unfinished\n');
  assert.equal(f.git(f.peer, 'rev-parse', 'HEAD'), head);
});

test('clean sync integrates main only into the Codex clone', t => {
  const f = fixture(t);
  writeFileSync(resolve(f.peer, 'base.txt'), 'new main\n');
  f.git(f.peer, 'add', 'base.txt'); f.git(f.peer, 'commit', '-m', 'test: advance');
  const head = f.git(f.peer, 'rev-parse', 'HEAD');
  const result = f.run('sync');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(f.own, 'rev-parse', 'HEAD'), head);
  assert.equal(f.git(f.own, 'branch', '--show-current'), 'codex/test');
  assert.equal(f.git(f.peer, 'status', '--porcelain'), '');
});

test('handoff pins HEAD and warns about excluded WIP without merging', t => {
  const f = fixture(t);
  const head = f.git(f.own, 'rev-parse', 'HEAD');
  writeFileSync(resolve(f.own, 'unfinished.txt'), 'WIP');
  const result = f.run('handoff');
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes(`Commit: ${head}`));
  assert.match(result.stdout, /WIP remains/);
  assert.equal(f.git(f.peer, 'rev-parse', 'HEAD'), head);
});

test('changed file parsing preserves spaces and both ends of staged renames', t => {
  const f = fixture(t);
  f.git(f.own, 'mv', 'base.txt', ' renamed.txt');
  assert.deepEqual(changedFiles(f.own).sort(), [' renamed.txt', 'base.txt']);
});

test('staged changes remain dirty when the worktree content matches HEAD', t => {
  const f = fixture(t);
  writeFileSync(resolve(f.peer, 'base.txt'), 'staged peer work\n');
  f.git(f.peer, 'add', 'base.txt');
  writeFileSync(resolve(f.peer, 'base.txt'), 'base\n');
  assert.deepEqual(changedFiles(f.peer), ['base.txt']);
  assert.equal(f.run('claim', 'Base', 'base.txt').status, 1);
  writeFileSync(resolve(f.own, 'base.txt'), 'staged own work\n');
  f.git(f.own, 'add', 'base.txt');
  writeFileSync(resolve(f.own, 'base.txt'), 'base\n');
  assert.equal(f.run('sync').status, 1);
});

test('divergent sync refuses rather than creating a merge commit', t => {
  const f = fixture(t);
  for (const [root, file] of [[f.peer, 'peer.txt'], [f.own, 'own.txt']]) {
    writeFileSync(resolve(root, file), 'independent work\n');
    f.git(root, 'add', file); f.git(root, 'commit', '-m', 'test: diverge');
  }
  const head = f.git(f.own, 'rev-parse', 'HEAD');
  assert.equal(f.run('sync').status, 1);
  assert.equal(f.git(f.own, 'rev-parse', 'HEAD'), head);
  assert.equal(f.git(f.own, 'status', '--porcelain'), '');
});

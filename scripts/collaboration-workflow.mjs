#!/usr/bin/env node
import { existsSync, mkdirSync, openSync, closeSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { GIT, context, git, readClaim, normalizePaths, conflicts, changedFiles, ensureClean, claimPath } from './collaboration-state.mjs';

const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const emit = text => process.stdout.write(`${text}\n`);

function status(ctx) {
  emit(`You: ${ctx.owner} / ${ctx.branch} / ${ctx.root}`);
  emit(`Peer (read-only): ${ctx.peerOwner} / ${git(ctx.peer, ['branch', '--show-current'])} / ${ctx.peer}`);
  for (const [root, owner] of [[ctx.root, ctx.owner], [ctx.peer, ctx.peerOwner]]) {
    const claim = readClaim(root, owner);
    emit(`\n${owner} claim: ${claim ? `${claim.status}: ${claim.task}\n${claim.paths.join('\n')}` : 'not registered; read their handoff board before claiming'}`);
    const dirty = changedFiles(root);
    emit(`${owner} uncommitted files:\n${dirty.join('\n') || '(none)'}`);
  }
  const peerHead = git(ctx.peer, ['rev-parse', 'HEAD']);
  emit(`\nPeer HEAD: ${peerHead}`);
  try {
    const [localOnly, peerOnly] = git(ctx.root, ['rev-list', '--left-right', '--count', `HEAD...${peerHead}`]).split(/\s+/);
    emit(`Local-only commits: ${localOnly}; peer-only commits: ${peerOnly}`);
  } catch { emit('Peer HEAD is not fetched here yet. Run fetch before comparing commits.'); }
  const own = readClaim(ctx.root, ctx.owner);
  if (own?.status === 'active') {
    const collisions = conflicts(ctx, own.paths);
    if (collisions.length) { emit(`\nOVERLAP: stop and coordinate\n${collisions.join('\n')}`); process.exitCode = 2; }
  }
}

function saveClaim(ctx, task, paths, released = false) {
  const path = claimPath(ctx);
  mkdirSync(dirname(path), { recursive: true });
  const lock = `${path}.lock`;
  const fd = openSync(lock, 'wx');
  const temporary = `${path}.${process.pid}.tmp`;
  const write = claim => {
    writeFileSync(temporary, JSON.stringify(claim, null, 2) + '\n');
    renameSync(temporary, path);
  };
  try {
    const previous = readClaim(ctx.root, ctx.owner);
    if (!released && previous?.status === 'active' && previous.task !== task) {
      throw new Error('Release your current task before claiming another.');
    }
    if (!released) {
      const collisions = conflicts(ctx, paths);
      if (collisions.length) throw new Error(collisions.join('\n'));
    }
    const claim = { schema: 1, owner: ctx.owner, branch: ctx.branch, task, status: released ? 'released' : 'active',
      paths, updatedAt: new Date().toISOString(), head: git(ctx.root, ['rev-parse', 'HEAD']) };
    write(claim);
    // Recheck simultaneous claims; a collision fails closed rather than granting ownership.
    if (!released && conflicts(ctx, paths).length) {
      if (previous) write(previous);
      else unlinkSync(path);
      throw new Error('Peer claimed overlapping work simultaneously. Coordinate and retry.');
    }
    emit(`${claim.status}: ${task}\n${path}`);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
    closeSync(fd); unlinkSync(lock);
  }
}

function handoff(ctx) {
  const head = git(ctx.root, ['rev-parse', 'HEAD']);
  const dirty = changedFiles(ctx.root);
  emit(`## ${ctx.owner} handoff\nBranch: ${ctx.branch}\nCommit: ${head}`);
  emit(`Working tree: ${dirty.length ? 'WIP remains; only the commit above is handed off' : 'clean'}`);
  emit(git(ctx.root, ['log', '-5', '--oneline']));
  if (ctx.owner === 'codex') {
    emit(`\nClaude: review and integrate this exact commit, not a moving branch tip:\ncd ${quote(ctx.peer)}\n${GIT} fetch codex\n${GIT} show --stat ${head}\n${GIT} merge --no-edit ${head}`);
  } else emit('\nCodex: node scripts/collaboration-workflow.mjs sync');
  emit('\nInclude test evidence, preview URL, remaining work and ownership release before sending.');
}

try {
  const [command = 'status', ...args] = process.argv.slice(2);
  const ctx = context();
  if (command === 'status') status(ctx);
  else if (command === 'claim') {
    if (!args[0]) throw new Error('Usage: claim "Task title" file.js folder/');
    saveClaim(ctx, args[0], normalizePaths(args.slice(1)));
  } else if (command === 'release') {
    const claim = readClaim(ctx.root, ctx.owner);
    if (!claim) throw new Error('No claim to release.');
    saveClaim(ctx, claim.task, claim.paths, true);
  } else if (command === 'fetch') {
    emit(git(ctx.root, ['fetch', ctx.remote])); status(ctx);
  } else if (command === 'sync') {
    if (ctx.owner !== 'codex') throw new Error('Claude integrates reviewed exact commits; sync is Codex-only.');
    ensureClean(ctx);
    emit(git(ctx.root, ['fetch', ctx.remote, 'main']));
    emit(git(ctx.root, ['merge', '--ff-only', `${ctx.remote}/main`]));
  } else if (command === 'handoff') handoff(ctx);
  else throw new Error('Commands: status | claim "Task" file folder/ | release | fetch | sync | handoff');
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }

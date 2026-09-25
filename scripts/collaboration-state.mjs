import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

// Pinned to Apple's Command Line Tools git on the Mac; CI runners (Linux) have git on PATH instead.
const MAC_GIT = '/Library/Developer/CommandLineTools/usr/bin/git';
export const GIT = existsSync(MAC_GIT) ? MAC_GIT : 'git';
export function git(cwd, args) {
  const output = execFileSync(GIT, ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return args.includes('-z') ? output : output.trim();
}

export function normalizePaths(paths) {
  if (!paths.length) throw new Error('List exact repo files or folder/ prefixes to claim.');
  return [...new Set(paths.map(path => {
    const parts = path.replaceAll('\\', '/').split('/');
    if (isAbsolute(path) || parts.includes('..') || /[*?\[\]\n\r]/.test(path) || !path.trim()) {
      throw new Error(`Unsafe or ambiguous claim path: ${path}`);
    }
    const normalized = parts.filter(p => p && p !== '.').join('/');
    if (!normalized || normalized === '.git' || normalized.startsWith('.git/')) throw new Error('Do not claim the repository root or .git.');
    return normalized + (path.endsWith('/') ? '/' : '');
  }))];
}

export function overlaps(a, b) {
  return a === b || (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b));
}

export function readClaim(root, owner) {
  const path = resolve(root, 'plans/claims', `${owner}.json`);
  if (!existsSync(path)) return null;
  const claim = JSON.parse(readFileSync(path, 'utf8'));
  if (claim.schema !== 1 || claim.owner !== owner || !['active', 'released'].includes(claim.status)) {
    throw new Error(`Invalid claim: ${path}`);
  }
  claim.paths = normalizePaths(claim.paths);
  return claim;
}

export function changedFiles(root) {
  const staged = git(root, ['diff', '--cached', '--no-renames', '--name-only', '-z', 'HEAD']);
  const tracked = git(root, ['diff', '--no-renames', '--name-only', '-z']);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z']);
  return [...new Set(`${staged}\0${tracked}\0${untracked}`.split('\0').filter(Boolean))];
}

export function context(cwd = process.cwd()) {
  const root = git(cwd, ['rev-parse', '--show-toplevel']);
  const branch = git(root, ['branch', '--show-current']);
  const owner = branch.startsWith('codex/') ? 'codex' : branch === 'main' ? 'claude' : null;
  if (!owner) throw new Error('Use main for Claude or codex/<task> for Codex; detached HEAD is not supported.');
  const peerOwner = owner === 'codex' ? 'claude' : 'codex';
  const remote = owner === 'codex' ? 'origin' : 'codex';
  const peerPath = git(root, ['remote', 'get-url', remote]);
  if (!isAbsolute(peerPath)) throw new Error(`${remote} must point to the local peer clone to inspect live claims.`);
  const peer = git(peerPath, ['rev-parse', '--show-toplevel']);
  if (peer === root) throw new Error('Peer remote must be a different clone.');
  return { root, branch, owner, peerOwner, peer, remote };
}

export function conflicts(ctx, paths) {
  const peerClaim = readClaim(ctx.peer, ctx.peerOwner);
  const claims = peerClaim?.status === 'active' ? peerClaim.paths : [];
  const dirty = changedFiles(ctx.peer);
  return paths.flatMap(path => [...new Set([...claims, ...dirty].filter(other => overlaps(path, other)))]
    .map(other => `${path} overlaps ${ctx.peerOwner}: ${other}`));
}

export function ensureClean(ctx) {
  const files = changedFiles(ctx.root);
  if (files.length) throw new Error(`Working tree is not clean. Commit only your work first; nothing was stashed.\n${files.join('\n')}`);
  if (existsSync(resolve(ctx.root, git(ctx.root, ['rev-parse', '--git-path', 'MERGE_HEAD'])))) {
    throw new Error('Finish the existing merge first.');
  }
}

export function claimPath(ctx) {
  const path = resolve(ctx.root, 'plans/claims', `${ctx.owner}.json`);
  if (relative(ctx.root, path).startsWith(`..${sep}`)) throw new Error('Claim must stay in this clone.');
  return path;
}

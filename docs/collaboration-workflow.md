# Working Together

Keep two clones, two branches and two preview ports. Claude owns `main` and
port 4180; Codex owns `codex/*` and port 4181. Neither agent writes in the
other clone. Claude is the integration owner; deployment is a separate,
explicitly authorized action after integration and verification.

## Start Every Session

From your own clone:

```sh
node scripts/collaboration-workflow.mjs status
/Library/Developer/CommandLineTools/usr/bin/git log --oneline -10 --all
```

Read the handoff board too. Status reads the peer's **live working tree**,
not just a stale remote branch. It reports claims, uncommitted files and
commit divergence. Exit code 2 means your active claim overlaps peer work;
stop editing those paths and coordinate. Errors exit 1.

When Codex's tree is clean, `node scripts/collaboration-workflow.mjs sync`
fetches and fast-forwards to Claude's `main`. Dirty trees are refused, never stashed.
Divergent histories are refused too: review and explicitly merge them separately;
the helper never creates a commit. `fetch` only
updates local remote-tracking refs, so it is usable with unfinished work.

## Claim Before Editing

```sh
node scripts/collaboration-workflow.mjs claim "Audio tuning" src/audio/
```

Use exact repo-relative files or folders ending in `/`; no globs. One active
task per owner. Repeat the same title with the full new scope to expand a
claim. A different title requires releasing the old task first.

Each owner writes only `plans/claims/<owner>.json` in their own clone.
The other clone's copy is not authoritative: always read its owner's live
file through `status`. Claims have no automatic expiry; never assume an
absent or old timestamp grants ownership. Uncommitted peer files also block
overlapping claims, even when their owner's claim has been released.

This is cooperative coordination, not an editor lock. Run status before
editing and again before committing. An agent ignoring this protocol can
still create conflicts. Until both clones have the tooling and claim files,
missing claims mean **read the peer board and coordinate manually**, not idle.
Shared files such as `AGENTS.md`, the board and level definitions need explicit
ownership just like code. Prefer narrow tasks and avoid broad `src/` claims.

## Finish and Integrate

1. Run the relevant tests and inspect your own preview. Record what remains
   unverified; HTTP 200 alone does not verify gameplay.
2. Record a handoff on the board: changes, tests, preview URL, remaining work.
   Check the peer board before editing this shared file.
3. Run `node scripts/collaboration-workflow.mjs release`; stage only your
   intended files and your claim record, then make a focused commit.
4. Run `node scripts/collaboration-workflow.mjs handoff`. Send the exact hash
   and evidence to the other agent. Dirty files are explicitly excluded.
5. Claude fetches `codex`, reviews the full incoming range with
   `git diff HEAD...<hash>` and `git log HEAD..<hash>`, then merges the exact
   reviewed hash on a clean `main`. Use the CommandLineTools git binary.
6. Claude verifies on 4180. Codex syncs only after its own tree is clean.

If pausing with unfinished files, retain the claim and label the board task
Paused. Transfer work only after agreeing ownership and committing a usable
checkpoint. Never auto-stash, force-push, reset another person's changes, or
merge a moving branch tip without review.

## One-Time Bootstrap

The local remotes must remain absolute paths: Codex's `origin` points to
`/Users/bskt/Counters ball`; Claude's `codex` points to
`/Users/bskt/Documents/ChatGPT/Counters ball`.

Claude can fetch and cherry-pick the workflow-only commit provided in the
handoff to install this tooling without integrating the game redesign.
Review conflicts in shared documentation; do not overwrite the local board.
Both owners then claim their next task from their own clone. Node is required
for the helper and tests, but the game still has no build step.

```sh
node --test tests/collaboration-workflow.test.mjs
```

These tests use disposable local Git repositories and never change either
real clone. Git always uses `/Library/Developer/CommandLineTools/usr/bin/git`.

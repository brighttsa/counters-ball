@AGENTS.md

# Claude Code notes

Everything in `AGENTS.md` applies. Codex works in its own clone at `/Users/bskt/Documents/ChatGPT/Counters ball`
on `codex/*` branches. Run `node scripts/collaboration-workflow.mjs status` before
editing, then claim exact files. See `docs/collaboration-workflow.md`.

Claude owns integration: fetch `codex`, review the incoming range and handoff,
then merge the exact reviewed commit into clean `main`, not a moving branch tip.
Use `/Library/Developer/CommandLineTools/usr/bin/git` for every Git command.
Verify on 4180; do not edit or clean Codex's clone. Deployment is a separate step.

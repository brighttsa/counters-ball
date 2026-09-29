# KONK! App Store Screenshots

Five iPhone 6.9-inch portrait screenshots at 1320 × 2868. Each uses a live capture
from the shipped game and a restrained KONK editorial layer. Raw captures are kept
in `sources/` for review.

Regenerate while the game is served on port 4182:

```bash
NODE_PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
  node scripts/generate-app-store-screenshots.mjs
```

Reference direction was informed by Mobbin examples that prioritize full-bleed
gameplay, one short promise per frame and visible variety across the set:

- [App Store — NFL Retro Bowl '26](https://mobbin.com/screens/2dd50860-eaaa-4170-bef3-da7b14c8477b)
- [Apple Games — Destiny: Rising](https://mobbin.com/screens/769e7614-8017-4764-bfb7-2f672d238057)
- [NBA — League Pass promotion](https://mobbin.com/screens/82910fe6-b811-483f-a5b3-d4949313b224)

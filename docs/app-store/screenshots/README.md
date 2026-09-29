# KONK! App Store Screenshots

Five screenshots are provided for each supported storefront size. Every image uses
a live capture from the shipped game, the actual KONK logo and a restrained
editorial layer. Intermediate device captures are discarded after composition.

Regenerate while the game is served on port 4182:

```bash
NODE_PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
  node scripts/generate-app-store-screenshots.mjs
```

## App Store Connect upload set

Some existing App Store Connect records expose the iPhone 6.5-inch slot rather
than the 6.9-inch slot. Use the matching five files in `iphone-6.5/` for that
slot. They are 1284 × 2778, one of Apple's accepted portrait dimensions, and
keep the same numbered upload order as the 6.9-inch originals.

Use the five files in `ipad-12.9/` for the iPad 12.9-inch display slot. They are
native 2048 × 2732 captures with a tablet-specific composition. Upload every set
in filename order, from `01` through `05`.

Reference direction was informed by Mobbin examples that prioritize full-bleed
gameplay, one short promise per frame and visible variety across the set:

- [App Store — NFL Retro Bowl '26](https://mobbin.com/screens/2dd50860-eaaa-4170-bef3-da7b14c8477b)
- [Apple Games — Destiny: Rising](https://mobbin.com/screens/769e7614-8017-4764-bfb7-2f672d238057)
- [NBA — League Pass promotion](https://mobbin.com/screens/82910fe6-b811-483f-a5b3-d4949313b224)

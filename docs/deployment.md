# Deployment

## Platform
GitHub Pages for `brighttsa/counters-ball`, built by GitHub Actions
(`.github/workflows/deploy-game-to-github-pages.yml`; Pages source: "GitHub Actions"). Static site, no build step.
Every push to `main` runs the full test suite; only if it passes does the workflow publish
`index.html`, `assets/`, `src/`, `styles/` and `CNAME`. `AGENTS.md`, `docs/`, `tests/` never reach konk.world
(the repo itself is public on GitHub, so keep secrets out of it; `plans/` and `promo-video/` stay uncommitted).
HTTPS enforced; certificate issued and renewed by GitHub.

## URLs
- https://konk.world (primary, custom domain; `CNAME` file in the repo root)
- https://www.konk.world → redirects to https://konk.world (GitHub Pages)

## Deploy command
Only when the owner says "push live". Run the full test suite first (see `tests/README.md`), then:

```bash
git push https://github.com/brighttsa/counters-ball.git HEAD:main
```

The workflow takes about 1–2 min (`gh run watch`). Verify: a changed runtime file returns the new content at
`https://konk.world/<path>`, and `https://konk.world/AGENTS.md` returns 404. A failing test stops the deploy
and the live site keeps the previous version. Re-run without a push: `gh workflow run "Deploy game to GitHub Pages"`.

## Environment variables
None.

## Custom domain (konk.world)
- Registrar and DNS: Namecheap (BasicDNS, `dns1/dns2.registrar-servers.com`). Registered 2026-09-24.
- Apex A records point at GitHub Pages: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
  `www` is a CNAME to `brighttsa.github.io`. The locked email-forwarding SPF TXT record stays.
- The repo's `CNAME` file must keep the single line `konk.world`; deleting it detaches the domain.
- Share previews (`og:image` in `index.html`) load from `https://konk.world/assets/`, never a third-party host.

## Rollback
Revert the bad commit and push: `git revert <sha> && git push https://github.com/brighttsa/counters-ball.git HEAD:main`.

## History
Until 2026-09-25 the site was also deployed to Vercel (project `counters-ball-3d`); that project was removed
so konk.world has a single host.

## Troubleshooting
- **Old version still showing**: Pages CDN caches for up to 10 min; check with `curl -s "https://konk.world/<path>?t=$(date +%s)"`.
- **Deploy did not happen**: open the run (`gh run list --workflow deploy-game-to-github-pages.yml`); a red test job blocks publishing.
- **Domain shows GitHub 404**: the `CNAME` file or the Pages custom-domain setting was changed; restore `konk.world` and push.
- **New domain not resolving**: a new `.world` domain appears only after the registry publishes its zone.
  Resolvers that looked it up earlier keep a "no such domain" answer for up to 1 hour (`.world` negative-cache TTL 3600 s).

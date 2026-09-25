# Deployment

## Platform
GitHub Pages from `brighttsa/counters-ball`, branch `main`, folder `/` (repo root). Static site, no build step.
HTTPS enforced; certificate issued and renewed by GitHub.

Pages publishes every committed file, not only the runtime (`index.html`, `assets/`, `src/`, `styles/`):
`AGENTS.md`, `docs/`, `tests/` are publicly readable at konk.world. Keep secrets and private notes out of
the repo (`plans/` and `promo-video/` stay uncommitted).

## URLs
- https://konk.world (primary, custom domain; `CNAME` file in the repo root)
- https://www.konk.world → redirects to https://konk.world (GitHub Pages)

## Deploy command
Only when the owner says "push live". Run the full test suite first (see `tests/README.md`), then:

```bash
git push https://github.com/brighttsa/counters-ball.git HEAD:main
```

Pages rebuilds in about 30–60 s. Verify: a changed runtime file returns the new content at
`https://konk.world/<path>`; `gh api repos/brighttsa/counters-ball/pages --jq .status` reads `built`.

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
- **Domain shows GitHub 404**: the `CNAME` file was removed or changed; restore it and push.
- **New domain not resolving**: a new `.world` domain appears only after the registry publishes its zone.
  Resolvers that looked it up earlier keep a "no such domain" answer for up to 1 hour (`.world` negative-cache TTL 3600 s).

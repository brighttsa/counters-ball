# Deployment

## Platform
Vercel (Hobby), project `counters-ball-3d` (`prj_Z0z3Jvo960l7DTZP1bYjLk6Z3dZa`), scope `brighttsa-gmailcoms-projects`.
Static site, no build step. `.vercelignore` publishes only `index.html`, `assets/`, `src/`, `styles/`.

## URLs
- https://konk.world (primary, custom domain)
- https://www.konk.world → 308 redirect to https://konk.world
- https://counters-ball-3d.vercel.app (Vercel alias, keeps working)

## Deploy command
Only when the owner says "push live". Run the tests first.

Do **not** run `vercel deploy` from the repo root: the repo has a private GitHub remote, the CLI sends
git metadata, and Vercel Hobby blocks the deployment because the commit author is not the Vercel owner
(the CLI hangs on "Building…"; the API shows `readyState: BLOCKED`). Deploy a git-free copy instead:

```bash
S=$(mktemp -d) && mkdir -p "$S/.vercel" && cp -R index.html assets src styles .vercelignore "$S/" && cp .vercel/project.json "$S/.vercel/" && (cd "$S" && npx vercel deploy --prod --yes)
```

Verify: every runtime file byte-identical on the live URL; `plans/`, `tests/`, `AGENTS.md` return 404.

## Environment variables
None.

## Custom domain (konk.world)
- Registrar and DNS: Namecheap (BasicDNS, `dns1/dns2.registrar-servers.com`). Registered 2026-09-24.
- Records (Advanced DNS): `A @ 76.76.21.21`, `A www 76.76.21.21`. Namecheap's parking CNAME and URL redirect were removed.
  The locked email-forwarding SPF TXT record stays.
- Both domains are attached to the Vercel project; `www` redirects to the apex (308).
- TLS: Let's Encrypt certificates issued by Vercel, auto-renewing.
- Vercel lists newer A values (`216.198.79.1`, `64.29.17.1`) or CNAME `d0a292df82bd349f.vercel-dns-017.com` as
  preferred; this is optional because the current records are valid.

## Rollback
`npx vercel ls counters-ball-3d` to find the previous Ready production deployment, then
`npx vercel promote <deployment-url>` (or "Promote to Production" in the Vercel dashboard).

## Troubleshooting
- **CLI stuck on "Building…"**: the deployment is BLOCKED (see Deploy command). Kill the CLI and redeploy from a git-free copy.
- **New domain not resolving**: a new `.world` domain appears only after the registry publishes its zone.
  Resolvers that looked it up earlier keep a "no such domain" answer for up to 1 hour (`.world` negative-cache TTL 3600 s).

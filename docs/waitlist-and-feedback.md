# Mobile waitlist and player feedback

Page: `/waitlist/`; feedback deep link: `/waitlist/#feedback`.
No account, email provider, new dependency, or game-runtime change is required.
Submissions are not public. No email is sent automatically by this implementation.
Nine focused tests and the full regression suite pass. Real local Worker/API
checks cover storage, duplicate platform merge,
anonymous feedback, protected CSV access, formula safety, rate limits and consent
timestamps. Browser checks cover both successful forms, keyboard tabs, loaded
assets, and 320/390/1440px layouts. Worker dry-run build passes.

## Deployment

Deploy the Worker first with `npm run deploy --prefix match-server` after owner
approval. This adds the `KONK_COMMUNITY` SQLite Durable Object (migration v3).
Publish the page through the existing Pages workflow; it includes `waitlist/`
and the already licensed `vendor/fonts/` directory. Never publish `.dev.vars`.
Do not expose the page before its API is available; failed submissions preserve
all input and never show success. Production uses the existing workers.dev API.

For local preview, serve this checkout on port 4190 and run Wrangler locally on
8788. These ports are separate from existing game and multiplayer previews.
Local submissions are development data only, not entries in the live list.

## Owner access

Set a random secret with at least 32 characters:
`npx wrangler secret put COMMUNITY_EXPORT_SECRET` from `match-server/`.
Never put it in page JavaScript, URLs, Git, or public screenshots.
The release setup retains the generated key in the ignored local file
`match-server/.env.community-export` with owner-only permissions. Keep that file
private; it is never included in the Pages bundle or committed.
With the secret in a private shell variable, export either collection:

```sh
curl --fail --header "Authorization: Bearer $COMMUNITY_EXPORT_SECRET" \
  'https://konk-match-server.konk-match-server.workers.dev/community/export?kind=waitlist' \
  --output konk-waitlist.csv
```

Use `kind=feedback` for feedback. Missing/unset secrets deny all exports. CSV
cells neutralize formula injection. Use these lists only for their separately
consented purpose; feedback email is not launch marketing permission.

## Storage and removal

Waitlist: 180 days. Feedback: 90 days. Daily alarms remove expired records even
without visits. Rejoining merges platforms instead of duplicating an email;
resubmission renews waitlist consent/expiry. Five submissions per network in ten
minutes; temporary network keys use HMAC with a private, persisted random salt.
Raw network addresses are not persisted. Collections are bounded to 20,000
records and 5,000 concurrent rate keys. Requests are bounded to 14 KB.

Privacy requests go to the existing owner contact. Delete the associated record
using Cloudflare's SQLite Durable Object administration, matching the email in
`submissions`; never publicly publish an export. Launch notifications and an
owner inbox UI are not implemented. Add a proper unsubscribe workflow before
sending automated or recurring emails.

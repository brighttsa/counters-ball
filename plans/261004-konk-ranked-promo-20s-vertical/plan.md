# KONK! Ranked — 20 s vertical promo

Status: plan only. Nothing produced yet; blocked on footage (see "What I need from you").

## What exists today (checked 2026-10-04)

- **Ranked rules are real.** Placement = 5 rated matches vs ≥ 3 distinct opponents; Elo-style, K = 24, start 1000
  (`match-server/src/ranked-rating-rules.js`, Codex `codex/table-talk` worktree).
- **Standings page is live** at konk.world/standings/: headline "WHO RUNS THE TABLE?", columns Rank / KONKER / Rating / W-D-L.
  It currently reads **"No placed KONKERS yet."** There is no populated board to film.
- **Own-standing line exists**: `Provisional · <rating> rating · n/5 matches · n/3 opponents`, then `Rank n · <rating> rating`.
- **Ranked lobby exists** at konk.world/play/?ranked=1 ("Play ranked", 60-second turns, saved KONKER profiles only).
- **Post-match rating movement exists** (origin/main `f48d546`, `src/ui/ranked-full-time-rating.js`): the full-time
  results card adds a line, "Ranked rating settling..." then `Ranked rating +N · now NNNN`, only after the server has
  settled the match. The standings card keeps the most recent change and shows match and opponent placement progress.
- **Soundtrack**: NXWRTH's track is already in the game on main (`assets/audio/afro-rave35-155bpm-konk-world.mp3`,
  commit `4bcb963`, "NXWRTH main theme"), 155 bpm, drop at 12.387 s.
- **Pipelines**: `promo/nxwrth-film/` (live-rendered cinematic, frame-exact export, 9:16/16:9) and `promo-video/` (Remotion, cuts recorded takes).

## Timed shot list (9:16 master, 20.1 s = 13 bars at 155 bpm)

Bar = 1.548 s. Music enters on the opening KONK at 1.55 s, from the track's drop.

| # | Time | Picture | Source | On-screen copy |
|---|---|---|---|---|
| 1 | 0.00–1.55 | Black → macro cap, finger shadow, pull, release | Rendered (reuse `promo/nxwrth-film` opening, shortened) | none |
| 2 | 1.55 | Cap hits cap. Flash. Beat lands | Rendered | none |
| 3 | 1.55–3.10 | Player A's phone: drag-aim on a cap, release | **Real ranked match, screen A** | none |
| 4 | 3.10–4.65 | Same flick, Player B's phone: cap collision, ball leaves | **Same match, screen B** | none |
| 5 | 4.65–6.19 | Split top/bottom, both screens: ball runs, goal | Both screens, synced on the goal frame | none |
| 6 | 6.19–7.74 | Final score on the real results card | Real results UI | none |
| 7 | 7.74–9.29 | Hard cut to ink black. Title slams | Graphic | **EVERY FLICK COUNTS.** |
| 8 | 9.29–12.39 | Five quick match hits, one per beat-pair, each from a different real ranked match; a chalk tally fills 1→5; three opponent caps stamp in | Real matches + graphic tally | **PLACEMENT · 5 MATCHES · 3 OPPONENTS** |
| 9 | 12.39–13.93 | Full time of the fifth match: "Ranked rating settling..." resolves to `Ranked rating +N · now NNNN` | Real results card capture | none (UI speaks) |
| 10 | 13.93–15.48 | Your standings card: placement complete, rank and rating | Real standings page capture | none |
| 11 | 15.48–17.03 | The KONKERS Board, as it really is after those matches | Real standings page capture | none |
| 12 | 17.03–18.58 | Black. Title slams | Graphic | **WHO RUNS THE TABLE?** |
| 13 | 18.58–20.13 | KONK! logo, final KONK hit | Graphic | **PLAY RANKED · KONK.WORLD** |

All four lines are either from your brief or already on the live standings page.

## Sound and edit notes

- **Verbs**: flick (1), impact (2), slide (3–5), bounce (5 goal), stop (6, 7, 12). Titles land like caps: slam in, flick out.
- **Cuts on real sounds**: the opening KONK starts the music; the goal in shot 5 lands on a downbeat; the five placement hits
  in shot 8 sit on beats 1 and 3; the fifth lands with the tally's last stroke.
- **Music**: drop at 1.55 s, 12 bars, hard cut at 20.13 s (a bar line) under the final KONK.
- **Game audio** from the recorded matches stays in, ducked ~6 dB under the beat; only goal and hard contacts cut through.
- **Gameplay stays clear**: no title sits over shots 3–6 or 9–11. Graphics get their own black frames.
- **Flashes**: three at most (KONK, shot 7, shot 12), short, never back to back.

## Formats and safe areas

- **9:16 master, 1080×1920.** Keep copy and key UI out of the top 270 px, bottom 420 px and right 130 px (Reels/TikTok chrome).
- Two-player shots stack top/bottom in 9:16. Record the matches on phones in **portrait** so the pitch runs up the frame.
- **16:9 adaptation**: same cut; two-player shots sit side by side; standings capture centred on ink black with the title beside it.

## Implementation plan

1. **Footage day** (needs you, see below): five ranked matches recorded on both phones, plus standings captures.
2. **Log**: mark flick, collision, goal and final-score frames in each recording; pick the one match for shots 3–6.
3. **Rendered bookends**: shorten the `promo/nxwrth-film` opening to 1.55 s and build the three title cards and logo card
   with the existing ink/chalk graphics kit.
4. **Assemble**: extend the `promo/nxwrth-film` exporter to place recorded clips on the same bar-based timeline
   (one clock, frame-exact), or cut in `promo-video/` (Remotion) with the rendered bookends as clips. Recommend the first: one timeline, one export.
5. **Export** 9:16 and 16:9 at 1080p60, check audio marks and sample frames, deliver.

Dev-only, like the NXWRTH film: nothing in this ships to konk.world.

## What I need from you

I can't make these without inventing things, and I won't:

1. **Two-player ranked footage.** Ranked needs saved KONKER profiles and real matchmaking. I can't create accounts or sign in.
   Screen-record **both phones** for the same live match, from aim to final score.
2. **Five ranked matches against at least three real opponents**, recorded, so shot 8 and the tally are true.
3. **The fifth match's full-time card** recorded through the rating line settling, and **standings captures** of your card and the board afterwards.
   Today the board is empty; after your placement it will show whoever has really placed.
4. **Consent** from every opponent whose KONKER name appears, or tell me to blur names.

## Unresolved questions

- Are your ranked matches against real players reachable right now (is matchmaking finding opponents)?
- 20.13 s lands on a bar line. Is a hard 20.00 s limit required by a platform or ad slot?
- Blur opponent names, or show them with consent?

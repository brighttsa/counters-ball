// 2-Player Table between two named players: a first-to-two-wins series for
// this sitting (kept in memory) and an all-time head-to-head record per pair
// of names (kept in the save). Plain objects and one small class — no DOM.
import { SIDE_HOME, SIDE_AWAY } from './pitch-dimensions-and-constants.js';

export const SERIES_WINS_NEEDED = 2; // best of three; a drawn game does not count toward it
export const PLAYER_NAME_MAX = 12;
export const DEFAULT_PLAYER_NAMES = Object.freeze({ home: 'Player 1', away: 'Player 2' });

/** Trim, collapse spaces, drop control characters and cap the length; empty falls back. */
export function cleanPlayerName(raw, fallback) {
  const name = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
    .slice(0, PLAYER_NAME_MAX).trim();
  return name || fallback;
}

/** Both seats named, and never the same name twice: the record would credit one person with both sides. */
export function cleanPlayerNames(raw = {}) {
  const home = cleanPlayerName(raw.home, DEFAULT_PLAYER_NAMES.home);
  let away = cleanPlayerName(raw.away, DEFAULT_PLAYER_NAMES.away);
  if (away.toLowerCase() === home.toLowerCase()) away = `${away.slice(0, PLAYER_NAME_MAX - 2)} 2`;
  return { home, away };
}

// Order-free and case-free, so swapping seats or retyping "kofi" keeps one shared record.
const pairKey = (names) => [names.home, names.away].map((n) => n.toLowerCase()).sort().join('|');
const sameNames = (a, b) => pairKey(a) === pairKey(b) && a.home.toLowerCase() === b.home.toLowerCase();

export function rivalryTally(progress, names) {
  const entry = progress.rivalries?.[pairKey(names)];
  return {
    home: entry?.wins[names.home.toLowerCase()] ?? 0,
    away: entry?.wins[names.away.toLowerCase()] ?? 0,
    draws: entry?.draws ?? 0,
  };
}

/** Adds one finished match to the pair's record; `winner` is a side or null for a draw. */
export function recordRivalryResult(progress, names, winner) {
  progress.rivalries ??= {};
  const entry = (progress.rivalries[pairKey(names)] ??= { wins: {}, draws: 0 });
  if (winner === SIDE_HOME || winner === SIDE_AWAY) {
    const who = names[winner].toLowerCase();
    entry.wins[who] = (entry.wins[who] ?? 0) + 1;
  } else entry.draws += 1;
  return rivalryTally(progress, names);
}

export function rivalryLine(tally, names) {
  if (tally.home + tally.away + tally.draws === 0) return `First meeting: ${names.home} vs ${names.away}`;
  const draws = tally.draws ? `, ${tally.draws} drawn` : '';
  return `All time: ${names.home} ${tally.home} – ${tally.away} ${names.away}${draws}`;
}

export function createSeries(names) {
  return { names: { ...names }, game: 1, wins: { home: 0, away: 0 }, winner: null };
}

/** The series carries on while the same two people sit in the same seats; new names start a new one. */
export function seriesForNames(series, names) {
  return series && !series.winner && sameNames(series.names, names) ? series : createSeries(names);
}

export function recordSeriesGame(series, winner) {
  if (winner === SIDE_HOME || winner === SIDE_AWAY) series.wins[winner] += 1;
  series.winner = series.wins.home >= SERIES_WINS_NEEDED ? SIDE_HOME
    : series.wins.away >= SERIES_WINS_NEEDED ? SIDE_AWAY : null;
  return series;
}

/** Rematch: the next game of this series, or a fresh series once someone has taken it. */
export function nextSeriesGame(series) {
  if (series.winner) return createSeries(series.names);
  series.game += 1;
  return series;
}

/** Kick-off alternates so neither seat always gets the first flick. */
export const seriesKickoffSide = (series) => (series.game % 2 === 1 ? SIDE_HOME : SIDE_AWAY);

function standing(series) {
  const { home, away } = series.wins;
  const { names } = series;
  if (home === away) return `level at ${home}–${away}`;
  return home > away ? `${names.home} leads ${home}–${away}` : `${names.away} leads ${away}–${home}`;
}

/** The kick-off callout: "GAME 2" over "Ama leads 1–0". */
export function seriesKickoffCallout(series) {
  const detail = series.game === 1 ? `First to ${SERIES_WINS_NEEDED} wins` : standing(series);
  return { label: `GAME ${series.game}`, detail: detail.charAt(0).toUpperCase() + detail.slice(1) };
}

export function seriesResultLine(series) {
  const { home, away } = series.wins;
  if (series.winner) {
    const [won, lost] = series.winner === SIDE_HOME ? [home, away] : [away, home];
    return `${series.names[series.winner]} takes the series ${won}–${lost}`;
  }
  return `Series ${standing(series)}`;
}

/**
 * The 2-Player Table's state across matches: who sits where, this sitting's
 * series, and saving names and the head-to-head record with the progress.
 * `names` is one live object for the whole app, so a match session handed it
 * before kick-off sees the names typed on the intro card.
 */
export class HotSeatRivalry {
  constructor(progress, save) {
    this.progress = progress;
    this.save = save;
    this.names = { ...(progress.versusNames ?? DEFAULT_PLAYER_NAMES) };
    this.series = null;
  }

  /** Head-to-head line for whatever is typed right now. */
  rivalryFor = (raw) => {
    const names = cleanPlayerNames(raw);
    return rivalryLine(rivalryTally(this.progress, names), names);
  };

  /** Kick-off: take the typed names; returns which side flicks first and the game's callout. */
  seat(raw) {
    Object.assign(this.names, cleanPlayerNames(raw));
    this.series = seriesForNames(this.series, this.names);
    this.progress.versusNames = { ...this.names };
    this.save(this.progress);
    return { side: seriesKickoffSide(this.series), ...seriesKickoffCallout(this.series) };
  }

  /** Full time: count the game in the series and the all-time record; returns both lines for the results. */
  finish(winner) {
    recordSeriesGame(this.series ??= createSeries(this.names), winner);
    const tally = recordRivalryResult(this.progress, this.names, winner);
    this.save(this.progress);
    return [seriesResultLine(this.series), rivalryLine(tally, this.names)];
  }

  /** Whether full time just decided the series, so the results offer a new one rather than a rematch. */
  get seriesDecided() { return Boolean(this.series?.winner); }

  rematch() {
    if (this.series) this.series = nextSeriesGame(this.series);
  }
}

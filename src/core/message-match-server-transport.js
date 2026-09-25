// Message Match over the match server: short links (konk.world/?m=<id>) instead of whole-letter links.
// The server stores each move in order; this device remembers which side it plays in each match, so
// opening your own short link shows "waiting" rather than letting you play your friend's move.
// With no server configured or reachable, callers fall back to self-contained letter links.

export const MATCH_PARAM = 'm';
const MATCH_ID = /^[a-km-np-zA-HJ-NP-Z2-9]{10}$/;
const SEATS_KEY = 'konk-message-seats-v1';
const MAX_SEATS = 50;
const TIMEOUT_MS = 8000;
// The deployed match server (docs/deployment.md). Set to an empty string to fall back to letter links only.
const PRODUCTION_API = 'https://konk-match-server.konk-match-server.workers.dev';

export function matchApiBase(loc = globalThis.location) {
  if (!loc) return '';
  return loc.hostname === 'localhost' || loc.hostname === '127.0.0.1' ? 'http://localhost:8787' : PRODUCTION_API;
}

export class MatchServerError extends Error {
  constructor(status, body) {
    super(body?.error ?? `match server replied ${status}`);
    Object.assign(this, { status, latest: body?.letter ?? null });
  }
}

async function call(base, path, init = {}, fetchImpl = globalThis.fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${base}${path}`, { ...init, signal: controller.signal,
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new MatchServerError(res.status, body);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export const openServerMatch = (base, packed, fetchImpl) =>
  call(base, '/matches', { method: 'POST', body: JSON.stringify({ letter: packed }) }, fetchImpl);

export const sendServerTurn = (base, id, packed, fetchImpl) =>
  call(base, `/matches/${id}/turns`, { method: 'POST', body: JSON.stringify({ letter: packed }) }, fetchImpl);

export const fetchLatestLetter = (base, id, fetchImpl) => call(base, `/matches/${id}`, {}, fetchImpl);

export const shortMatchLink = (baseUrl, id) => `${baseUrl}?${MATCH_PARAM}=${id}`;

/** Reads ?m=<id> and strips it, so a reload lands on the title. */
export function takeMatchIdFromUrl(loc = location, hist = history) {
  const params = new URLSearchParams(loc.search);
  if (!params.has(MATCH_PARAM)) return null;
  const id = params.get(MATCH_PARAM);
  const url = new URL(loc.href);
  url.searchParams.delete(MATCH_PARAM);
  hist.replaceState(null, '', url.toString());
  return MATCH_ID.test(id ?? '') ? id : null;
}

export class MatchSeats {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  read() {
    try {
      const seats = JSON.parse(this.storage?.getItem(SEATS_KEY) ?? '{}');
      return seats && typeof seats === 'object' && !Array.isArray(seats) ? seats : {};
    } catch { return {}; }
  }

  sideIn(id) {
    const side = this.read()[id];
    return side === 'home' || side === 'away' ? side : null;
  }

  remember(id, side) {
    const seats = { ...this.read(), [id]: side };
    const ids = Object.keys(seats);
    for (const old of ids.slice(0, Math.max(0, ids.length - MAX_SEATS))) delete seats[old]; // oldest first
    try { this.storage?.setItem(SEATS_KEY, JSON.stringify(seats)); } catch { /* private mode: seats last this visit */ }
  }
}

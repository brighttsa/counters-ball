import test from 'node:test';
import assert from 'node:assert/strict';
import { packLetter } from '../src/core/message-match-turn-letter-codec.js';
import {
  checkOpeningLetter, checkNextLetter, newMatchId, MATCH_ID,
} from '../match-server/src/match-turn-ledger-rules.js';
import {
  MatchSeats, MatchServerError, fetchLatestLetter, matchApiBase, openServerMatch, sendServerTurn, shortMatchLink,
  takeMatchIdFromUrl,
} from '../src/core/message-match-server-transport.js';

const rules = (over = {}) => ({ phase: 'aiming', turn: 'home', scores: { home: 0, away: 0 }, flicksUsed: { home: 0, away: 0 },
  lastScorer: null, tiebreak: null, tiebreakBonus: { home: 0, away: 0 }, ...over });
const T0 = [-0.5, 0, 0.5, 0, 0, 0];
const T1 = [-0.2, 0.1, 0.5, 0, 0.3, 0];
const T2 = [-0.2, 0.1, 0.1, 0, -0.2, 0.05];
const opening = packLetter({ levelId: 'kiosk', names: { home: 'Ama', away: 'Kofi' }, seq: 1, by: 'home', before: T0,
  rulesBefore: rules(), flicks: [{ entry: 0, vx: 2, vy: 0, after: T1 }],
  rulesAfter: rules({ turn: 'away', flicksUsed: { home: 1, away: 0 } }) });
const reply = (over = {}) => packLetter({ levelId: 'kiosk', names: { home: 'Ama', away: 'Kofi' }, seq: 2, by: 'away', before: T1,
  rulesBefore: rules({ turn: 'away', flicksUsed: { home: 1, away: 0 } }), flicks: [{ entry: 1, vx: -2, vy: 0, after: T2 }],
  rulesAfter: rules({ turn: 'home', flicksUsed: { home: 1, away: 1 } }), ...over });

test('a match opens only with home\'s first move at kick-off', () => {
  assert.deepEqual(checkOpeningLetter(opening), { ok: true });
  assert.equal(checkOpeningLetter({ v: 1 }).status, 400);
  assert.equal(checkOpeningLetter(reply()).ok, false, 'a reply cannot open a match');
  const midGame = packLetter({ levelId: 'kiosk', names: { home: 'A', away: 'B' }, seq: 1, by: 'home', before: T0,
    rulesBefore: rules({ scores: { home: 1, away: 0 } }), flicks: [{ entry: 0, vx: 1, vy: 0, after: T1 }], rulesAfter: rules({ turn: 'away' }) });
  assert.equal(checkOpeningLetter(midGame).ok, false, 'no opening with a pre-set score');
});

test('the next move must continue exactly from the stored one', () => {
  assert.deepEqual(checkNextLetter(opening, reply()), { ok: true });
  assert.equal(checkNextLetter(opening, reply({ seq: 3 })).status, 409, 'skipped a move');
  assert.equal(checkNextLetter(opening, reply({ by: 'home', rulesBefore: rules({ flicksUsed: { home: 1, away: 0 } }) })).status, 409, 'same side twice');
  assert.equal(checkNextLetter(opening, reply({ before: T0 })).status, 409, 'table does not match the last move');
  assert.equal(checkNextLetter(opening, reply({ rulesBefore: rules({ turn: 'away', scores: { home: 0, away: 3 }, flicksUsed: { home: 1, away: 0 } }) })).status, 409, 'score rewritten');
  assert.equal(checkNextLetter(opening, reply({ levelId: 'veranda' })).status, 400, 'another table');
  assert.equal(checkNextLetter(opening, reply({ names: { home: 'Ama', away: 'Yaw' } })).status, 400, 'another player');
  const endedOpening = packLetter({ levelId: 'kiosk', names: { home: 'Ama', away: 'Kofi' }, seq: 1, by: 'home', before: T0,
    rulesBefore: rules(), flicks: [{ entry: 0, vx: 2, vy: 0, after: T1 }], rulesAfter: rules({ phase: 'ended', turn: 'away' }) });
  const over = { ...opening, ra: endedOpening.ra };
  assert.equal(checkNextLetter(over, reply()).status, 409, 'nothing after full time');
});

test('match ids are short, unambiguous and validated', () => {
  const ids = new Set(Array.from({ length: 200 }, () => newMatchId()));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, MATCH_ID);
  assert.doesNotMatch('abcdefghi0', MATCH_ID, 'no zero');
  assert.doesNotMatch('abcdefghiO', MATCH_ID, 'no capital O');
  assert.doesNotMatch('abcdefghio', MATCH_ID, 'no lower-case o');
  assert.doesNotMatch('abcdefghil', MATCH_ID, 'no lower-case l');
});

test('the client talks to the server and surfaces conflicts with the latest move', async () => {
  const calls = [];
  const fake = (status, body) => async (url, init) => { calls.push([url, init.method ?? 'GET', init.body]); return { ok: status < 300, status, json: async () => body }; };
  assert.deepEqual(await openServerMatch('https://api', opening, fake(201, { id: 'abcdefghij', seq: 1 })), { id: 'abcdefghij', seq: 1 });
  assert.deepEqual(calls.at(-1).slice(0, 2), ['https://api/matches', 'POST']);
  assert.deepEqual(JSON.parse(calls.at(-1)[2]), { letter: opening });
  await sendServerTurn('https://api', 'abcdefghij', reply(), fake(200, { seq: 2 }));
  assert.equal(calls.at(-1)[0], 'https://api/matches/abcdefghij/turns');
  await fetchLatestLetter('https://api', 'abcdefghij', fake(200, { letter: opening, seq: 1 }));
  assert.deepEqual(calls.at(-1).slice(0, 2), ['https://api/matches/abcdefghij', 'GET']);
  await assert.rejects(sendServerTurn('https://api', 'abcdefghij', reply(), fake(409, { error: 'this match has moved on', letter: opening })),
    (e) => e instanceof MatchServerError && e.status === 409 && e.latest === opening && e.message === 'this match has moved on');
});

test('short links carry only the match id and are stripped on open', () => {
  assert.equal(shortMatchLink('https://konk.world/', 'abcdefghij'), 'https://konk.world/?m=abcdefghij');
  let replaced = null;
  const hist = { replaceState: (_s, _t, url) => { replaced = url; } };
  assert.equal(takeMatchIdFromUrl({ search: '?m=abcdefghij', href: 'https://konk.world/?m=abcdefghij' }, hist), 'abcdefghij');
  assert.equal(replaced, 'https://konk.world/');
  assert.equal(takeMatchIdFromUrl({ search: '?m=../../x', href: 'https://konk.world/?m=../../x' }, hist), null);
  assert.equal(takeMatchIdFromUrl({ search: '', href: 'https://konk.world/' }, { replaceState: () => assert.fail() }), null);
  assert.equal(matchApiBase({ hostname: 'localhost' }), 'http://localhost:8787');
});

test('each device remembers its own side per match, and forgets the oldest past 50', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const seats = new MatchSeats(storage);
  seats.remember('abcdefghij', 'home');
  assert.equal(seats.sideIn('abcdefghij'), 'home');
  assert.equal(seats.sideIn('bcdefghijk'), null);
  for (let i = 0; i < 60; i++) seats.remember(`id${i}`, 'away');
  assert.equal(Object.keys(seats.read()).length, 50);
  assert.equal(seats.sideIn('abcdefghij'), null, 'oldest dropped');
  store.set('konk-message-seats-v1', '{broken');
  assert.deepEqual(seats.read(), {});
  assert.equal(new MatchSeats({ getItem() { throw new Error('blocked'); } }).sideIn('x'), null);
});

test('the lock-screen message names the mover, the score and the taunt, and goes to the other side', async () => {
  const { pushMessageFor } = await import('../match-server/src/match-turn-ledger-rules.js');
  const withTaunt = { ...reply(), m: 'Top bins' };
  const { to, payload } = pushMessageFor(withTaunt, 'abcdefghij', 'https://konk.world/');
  assert.equal(to, 'home');
  assert.deepEqual(payload, { title: 'Kofi flicked. Your move!', body: 'Ama 0–0 Kofi · “Top bins”',
    url: 'https://konk.world/?m=abcdefghij', tag: 'konk-abcdefghij' });
  const ended = { ...opening, ra: [1, 'a', [1, 0], [1, 0], 'h', 0, [0, 0]] };
  assert.equal(pushMessageFor(ended, 'abcdefghij', 'https://konk.world/').payload.title, 'Ama took the last flick');
  assert.equal(pushMessageFor(ended, 'abcdefghij', 'https://konk.world/').to, 'away');
});

test('push availability: ask, already on, blocked, unsupported, or install to Home Screen first', async () => {
  const { pushAvailability } = await import('../src/core/message-match-push-subscription.js');
  const win = ({ permission = 'default', push = true, ua = 'Mozilla/5.0 (X11; Linux x86_64)', standalone = false } = {}) => ({
    isSecureContext: true, navigator: { userAgent: ua, ...(push ? { serviceWorker: {} } : {}) },
    matchMedia: () => ({ matches: standalone }), ...(push ? { PushManager: class {}, Notification: { permission } } : {}),
  });
  assert.equal(pushAvailability(win()), 'ready');
  assert.equal(pushAvailability(win({ permission: 'granted' })), 'granted');
  assert.equal(pushAvailability(win({ permission: 'denied' })), 'denied');
  assert.equal(pushAvailability(win({ push: false })), 'unsupported');
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
  assert.equal(pushAvailability(win({ push: false, ua: iphone })), 'install', 'Safari tab on iPhone');
  assert.equal(pushAvailability(win({ ua: iphone, standalone: true })), 'ready', 'installed Home Screen app');
});

test('Apple devices share the bare link so iMessage builds a preview; others keep the text', async () => {
  const { prefersBareLinks } = await import('../src/ui/friend-match-invite-share.js');
  assert.equal(prefersBareLinks({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari' }), true);
  assert.equal(prefersBareLinks({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari' }), true);
  assert.equal(prefersBareLinks({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome' }), false);
  assert.equal(prefersBareLinks({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome' }), false);
});

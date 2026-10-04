import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const base = process.argv[2] ?? 'http://localhost:8787';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) {
  throw Error('This verification may only create local test profiles.');
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function call(path, body, secret) {
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Origin: 'http://localhost:4202',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  assert.ok(response.ok, `${path}: ${response.status} ${result.error ?? ''}`);
  return result;
}
const players = Array.from({ length: 4 }, (_, index) => ({
  id: randomBytes(16).toString('hex'), secret: randomBytes(32).toString('hex'),
  name: index === 0 ? 'BOARD CHECK KONKER' : `BOARD CHECK RIVAL ${index}`,
}));
for (const player of players) {
  await call(`/players/${player.id}`, { id: player.id, name: player.name }, player.secret);
}

async function playDraw(homePlayer, awayPlayer) {
  const tickets = [homePlayer, awayPlayer].map(() => randomBytes(18).toString('hex'));
  const search = (player, ticket, action) => call('/ranked/search',
    { profileId: player.id, ticket, action }, player.secret);
  assert.equal((await search(homePlayer, tickets[0], 'join')).state, 'waiting');
  const away = await search(awayPlayer, tickets[1], 'join');
  const home = await search(homePlayer, tickets[0], 'poll');
  assert.equal(home.id, away.id);
  for (const [player, seat] of [[homePlayer, home], [awayPlayer, away]]) {
    await call(`/rooms/${home.id}/ready`, { token: seat.token, ready: true, profileId: player.id }, player.secret);
  }
  let checkpoint = await call(`/rooms/${home.id}/shot`, null, home.token);
  while (checkpoint.state.rules.phase !== 'ended') {
    const side = checkpoint.state.rules.turn;
    const seat = side === 'home' ? home : away;
    for (const playerSeat of [home, away]) {
      await call(`/rooms/${home.id}/heartbeat`, { token: playerSeat.token });
    }
    checkpoint = await call(`/rooms/${home.id}/shot`, {
      token: seat.token, matchId: checkpoint.matchId,
      requestId: randomBytes(16).toString('hex'), seq: checkpoint.state.seq,
      cap: side === 'home' ? 0 : 5, vx: 0.001, vz: 0,
    });
    assert.ok(checkpoint.state.seq <= 30);
  }
  assert.equal(checkpoint.state.result.winner, null);
}

for (const [index, opponent] of [1, 1, 2, 2, 3].entries()) {
  await playDraw(players[0], players[opponent]);
  let settled = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await call(`/standings/me?profileId=${players[0].id}`, null, players[0].secret);
    if (result.own.matches === index + 1 && !result.own.activeMatch) {
      settled = true;
      break;
    }
    await pause(500);
  }
  assert.ok(settled, `Match ${index + 1} did not settle`);
}
const standings = await call('/standings');
assert.equal(standings.placedPlayers, 1);
assert.equal(standings.rows[0].name, players[0].name);
assert.equal(standings.rows[0].matches, 5);
assert.equal(standings.rows[0].rating, 1000);
console.log('Verified one placed KONKER after five settled matches with three distinct opponents.');
